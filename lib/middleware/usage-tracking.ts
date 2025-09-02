import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { polarSubscriptionService } from '@/lib/services/polar-subscription-service';
import { featureGateService } from '@/lib/feature-gating/feature-gate-service';

export const dynamic = 'force-dynamic';

// Usage types that can be tracked
export type UsageType = 
  | 'receipts_processed'
  | 'invoices_created'
  | 'api_calls'
  | 'ocr_pages'
  | 'ai_chat_messages'
  | 'storage_mb'
  | 'export_operations'
  | 'email_sends';

// Usage tracking result
export interface UsageTrackingResult {
  allowed: boolean;
  reason: 'success' | 'limit_exceeded' | 'feature_disabled' | 'no_subscription' | 'error';
  details?: string;
  usage?: {
    current: number;
    limit: number;
    remaining: number;
  };
}

// Usage tracking options
export interface TrackUsageOptions {
  increment?: number;
  checkOnly?: boolean; // Only check limits, don't increment
  bypassLimits?: boolean; // For admin operations
  metadata?: Record<string, any>;
}

// Usage tracking middleware class
export class UsageTrackingMiddleware {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Create middleware function for API routes
   */
  static createMiddleware(usageType: UsageType, options: TrackUsageOptions = {}) {
    return async (request: NextRequest, tenantId: string): Promise<UsageTrackingResult> => {
      const middleware = new UsageTrackingMiddleware();
      return middleware.trackUsage(tenantId, usageType, options);
    };
  }

  /**
   * Track usage for a tenant
   */
  async trackUsage(
    tenantId: string, 
    usageType: UsageType, 
    options: TrackUsageOptions = {}
  ): Promise<UsageTrackingResult> {
    const { increment = 1, checkOnly = false, bypassLimits = false, metadata = {} } = options;

    try {
      // Bypass limits for admin operations
      if (bypassLimits) {
        if (!checkOnly) {
          await this.recordUsage(tenantId, usageType, increment, metadata);
        }
        return {
          allowed: true,
          reason: 'success',
          details: 'Admin override - limits bypassed'
        };
      }

      // Get current subscription and limits
      const subscription = await polarSubscriptionService.getTenantSubscription(tenantId);
      
      if (!subscription) {
        return {
          allowed: false,
          reason: 'no_subscription',
          details: 'No active subscription found'
        };
      }

      // Check if the related feature is enabled
      const featureKey = this.getFeatureKeyForUsageType(usageType);
      if (featureKey) {
        const featureResult = await featureGateService.checkFeature(tenantId, featureKey);
        if (!featureResult.enabled) {
          return {
            allowed: false,
            reason: 'feature_disabled',
            details: `Feature ${featureKey} is not enabled on current plan`
          };
        }
      }

      // Get usage limits
      const limits = subscription.limits;
      const limit = limits[this.getLimitKeyForUsageType(usageType)];
      
      // -1 means unlimited
      if (limit === -1) {
        if (!checkOnly) {
          await this.recordUsage(tenantId, usageType, increment, metadata);
        }
        return {
          allowed: true,
          reason: 'success',
          details: 'Unlimited usage'
        };
      }

      // Check current usage
      const currentUsage = subscription.usage_counts[this.getLimitKeyForUsageType(usageType)] || 0;
      const newUsage = currentUsage + increment;
      const remaining = Math.max(0, limit - currentUsage);

      // Check if usage would exceed limit
      if (newUsage > limit) {
        return {
          allowed: false,
          reason: 'limit_exceeded',
          details: `Usage limit exceeded. Limit: ${limit}, Current: ${currentUsage}, Requested: ${increment}`,
          usage: {
            current: currentUsage,
            limit,
            remaining
          }
        };
      }

      // Record usage if not just checking
      if (!checkOnly) {
        const success = await polarSubscriptionService.incrementUsage(
          tenantId, 
          this.getLimitKeyForUsageType(usageType), 
          increment
        );

        if (!success) {
          return {
            allowed: false,
            reason: 'error',
            details: 'Failed to record usage increment'
          };
        }

        await this.recordUsage(tenantId, usageType, increment, metadata);
      }

      return {
        allowed: true,
        reason: 'success',
        usage: {
          current: currentUsage + (checkOnly ? 0 : increment),
          limit,
          remaining: remaining - (checkOnly ? 0 : increment)
        }
      };

    } catch (error) {
      console.error(`Error tracking usage ${usageType} for tenant ${tenantId}:`, error);
      return {
        allowed: false,
        reason: 'error',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check usage limits without incrementing
   */
  async checkUsageLimit(tenantId: string, usageType: UsageType, increment: number = 1): Promise<UsageTrackingResult> {
    return this.trackUsage(tenantId, usageType, { increment, checkOnly: true });
  }

  /**
   * Get current usage for a tenant
   */
  async getCurrentUsage(tenantId: string): Promise<Record<string, number>> {
    try {
      const subscription = await polarSubscriptionService.getTenantSubscription(tenantId);
      return subscription?.usage_counts || {};
    } catch (error) {
      console.error(`Error getting current usage for tenant ${tenantId}:`, error);
      return {};
    }
  }

  /**
   * Get usage limits for a tenant
   */
  async getUsageLimits(tenantId: string): Promise<Record<string, number>> {
    try {
      return await polarSubscriptionService.getTenantLimits(tenantId);
    } catch (error) {
      console.error(`Error getting usage limits for tenant ${tenantId}:`, error);
      return {};
    }
  }

  /**
   * Reset usage counters (typically called monthly)
   */
  async resetUsageCounters(tenantId: string): Promise<void> {
    try {
      const subscription = await polarSubscriptionService.getTenantSubscription(tenantId);
      
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      const { error } = await this.supabase
        .from('subscription')
        .update({
          usage_counts: {},
          usage_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (error) {
        throw new Error(`Failed to reset usage counters: ${error.message}`);
      }

      console.log(`Reset usage counters for tenant ${tenantId}`);
    } catch (error) {
      console.error(`Error resetting usage counters for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Record detailed usage event
   */
  private async recordUsage(
    tenantId: string, 
    usageType: UsageType, 
    increment: number, 
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      // Record in usage_quota table for detailed tracking
      const { error } = await this.supabase
        .from('usage_quota')
        .insert({
          tenant_id: tenantId,
          quota_type: usageType,
          quota_used: increment,
          period_start: new Date().toISOString(),
          period_end: this.getNextPeriodEnd(),
          metadata: {
            ...metadata,
            recorded_at: new Date().toISOString(),
            usage_type: usageType
          }
        });

      if (error) {
        console.error('Error recording detailed usage:', error);
        // Don't throw error here as the main usage was already tracked
      }
    } catch (error) {
      console.error('Error in recordUsage:', error);
    }
  }

  /**
   * Get feature key for usage type
   */
  private getFeatureKeyForUsageType(usageType: UsageType): string | null {
    const mapping: Record<UsageType, string | null> = {
      receipts_processed: 'ocr_processing',
      invoices_created: null, // Core feature, no gating
      api_calls: 'api_access',
      ocr_pages: 'ocr_processing',
      ai_chat_messages: 'ai_chat',
      storage_mb: 'receipt_storage',
      export_operations: 'analytics',
      email_sends: 'email_templates'
    };

    return mapping[usageType];
  }

  /**
   * Get limit key for usage type
   */
  private getLimitKeyForUsageType(usageType: UsageType): string {
    const mapping: Record<UsageType, string> = {
      receipts_processed: 'receipts_per_month',
      invoices_created: 'invoices_per_month',
      api_calls: 'api_calls_per_day',
      ocr_pages: 'ocr_pages_per_month',
      ai_chat_messages: 'ai_messages_per_day',
      storage_mb: 'storage_mb',
      export_operations: 'exports_per_month',
      email_sends: 'emails_per_month'
    };

    return mapping[usageType];
  }

  /**
   * Calculate next period end (monthly reset)
   */
  private getNextPeriodEnd(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }
}

// Middleware function creators for common usage types
export const receiptProcessingMiddleware = (options: TrackUsageOptions = {}) =>
  UsageTrackingMiddleware.createMiddleware('receipts_processed', options);

export const invoiceCreationMiddleware = (options: TrackUsageOptions = {}) =>
  UsageTrackingMiddleware.createMiddleware('invoices_created', options);

export const apiCallMiddleware = (options: TrackUsageOptions = {}) =>
  UsageTrackingMiddleware.createMiddleware('api_calls', options);

export const aiChatMiddleware = (options: TrackUsageOptions = {}) =>
  UsageTrackingMiddleware.createMiddleware('ai_chat_messages', options);

export const storageMiddleware = (options: TrackUsageOptions = {}) =>
  UsageTrackingMiddleware.createMiddleware('storage_mb', options);

// Express-style middleware wrapper for Next.js API routes
export function withUsageTracking(
  usageType: UsageType, 
  options: TrackUsageOptions = {}
) {
  return function(handler: any) {
    return async function(req: NextRequest, ...args: any[]) {
      try {
        // Extract tenant ID from request (you may need to adjust this based on your auth setup)
        const tenantId = req.headers.get('x-tenant-id') || 
                         req.nextUrl.searchParams.get('tenant_id');

        if (!tenantId) {
          return NextResponse.json(
            { error: 'Missing tenant ID' },
            { status: 400 }
          );
        }

        // Track usage
        const trackingResult = await UsageTrackingMiddleware.createMiddleware(usageType, options)(req, tenantId);

        if (!trackingResult.allowed) {
          const statusCode = trackingResult.reason === 'limit_exceeded' ? 429 : 403;
          return NextResponse.json(
            { 
              error: 'Usage limit exceeded',
              reason: trackingResult.reason,
              details: trackingResult.details,
              usage: trackingResult.usage
            },
            { status: statusCode }
          );
        }

        // Add usage info to request context
        (req as any).usageTracking = trackingResult;

        // Call the original handler
        return handler(req, ...args);
      } catch (error) {
        console.error('Error in usage tracking middleware:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    };
  };
}

// Utility functions for use in components
export async function checkCanUseFeature(
  tenantId: string, 
  usageType: UsageType, 
  increment: number = 1
): Promise<boolean> {
  const middleware = new UsageTrackingMiddleware();
  const result = await middleware.checkUsageLimit(tenantId, usageType, increment);
  return result.allowed;
}

export async function getUsageStats(tenantId: string): Promise<{
  usage: Record<string, number>;
  limits: Record<string, number>;
  percentages: Record<string, number>;
}> {
  const middleware = new UsageTrackingMiddleware();
  const [usage, limits] = await Promise.all([
    middleware.getCurrentUsage(tenantId),
    middleware.getUsageLimits(tenantId)
  ]);

  const percentages: Record<string, number> = {};
  Object.keys(limits).forEach(key => {
    const limit = limits[key];
    const used = usage[key] || 0;
    percentages[key] = limit === -1 ? 0 : Math.min((used / limit) * 100, 100);
  });

  return { usage, limits, percentages };
}

// Export singleton instance
export const usageTrackingMiddleware = new UsageTrackingMiddleware();