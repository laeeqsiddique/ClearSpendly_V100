import { createClient } from '@/lib/supabase/server';
import { polarSubscriptionService } from './polar-subscription-service';

export const dynamic = 'force-dynamic';

export interface FeatureAccess {
  hasAccess: boolean;
  reason: string;
  remainingUsage?: number;
  limitType: 'usage' | 'feature' | 'trial' | 'subscription';
  upgradeRequired: boolean;
  trialContext?: {
    isTrial: boolean;
    daysRemaining: number;
    canConvert: boolean;
  };
}

export interface UsageCheckResult {
  canProceed: boolean;
  usage: {
    current: number;
    limit: number;
    percentage: number;
  };
  warning?: string;
  blockReason?: string;
}

export class FeatureAccessService {
  private getSupabase() {
    return createClient();
  }

  /**
   * Check if tenant has access to a specific feature
   */
  async checkFeatureAccess(tenantId: string, featureKey: string): Promise<FeatureAccess> {
    try {
      // Get subscription and trial status
      const [subscription, trialStatus] = await Promise.all([
        polarSubscriptionService.getTenantSubscription(tenantId),
        polarSubscriptionService.getTrialStatus(tenantId)
      ]);

      // If no subscription and no trial, only free features allowed
      if (!subscription && !trialStatus.isTrial) {
        return this.checkFreeFeatureAccess(featureKey, trialStatus);
      }

      // If trial has expired, only free features allowed
      if (trialStatus.isTrial && trialStatus.hasExpired) {
        return {
          hasAccess: false,
          reason: 'Trial has expired. Please subscribe to continue using this feature.',
          limitType: 'trial',
          upgradeRequired: true,
          trialContext: trialStatus
        };
      }

      // If subscription is inactive (except trialing), block access
      if (subscription && !['active', 'trialing'].includes(subscription.status)) {
        return {
          hasAccess: false,
          reason: `Subscription is ${subscription.status}. Please resolve billing issues to continue.`,
          limitType: 'subscription',
          upgradeRequired: true,
          trialContext: trialStatus
        };
      }

      // Check feature availability in plan
      const hasFeature = subscription?.features[featureKey];
      
      if (!hasFeature) {
        return {
          hasAccess: false,
          reason: `Feature '${featureKey}' is not available in your current plan.`,
          limitType: 'feature',
          upgradeRequired: true,
          trialContext: trialStatus
        };
      }

      // Feature is available
      return {
        hasAccess: true,
        reason: `Feature '${featureKey}' is available in your ${subscription?.plan_name || 'current'} plan.`,
        limitType: 'feature',
        upgradeRequired: false,
        trialContext: trialStatus
      };

    } catch (error) {
      console.error('Error checking feature access:', error);
      return {
        hasAccess: false,
        reason: 'Unable to verify feature access. Please try again.',
        limitType: 'subscription',
        upgradeRequired: false
      };
    }
  }

  /**
   * Check usage-based feature access (receipts, storage, etc.)
   */
  async checkUsageAccess(
    tenantId: string, 
    usageType: string, 
    requestedAmount: number = 1
  ): Promise<UsageCheckResult> {
    try {
      const subscription = await polarSubscriptionService.getTenantSubscription(tenantId);
      const trialStatus = await polarSubscriptionService.getTrialStatus(tenantId);

      // Get usage limits
      const limits = subscription?.limits || this.getFreeUsageLimits();
      const limit = limits[usageType];

      // If unlimited (-1), always allow
      if (limit === -1) {
        return {
          canProceed: true,
          usage: {
            current: subscription?.usage_counts[usageType] || 0,
            limit: -1,
            percentage: 0
          }
        };
      }

      // Check if trial has expired
      if (trialStatus.isTrial && trialStatus.hasExpired) {
        return {
          canProceed: false,
          usage: {
            current: subscription?.usage_counts[usageType] || 0,
            limit: limit || 0,
            percentage: 100
          },
          blockReason: 'Trial has expired. Please subscribe to continue using this feature.'
        };
      }

      // Check current usage
      const currentUsage = subscription?.usage_counts[usageType] || 0;
      const newUsage = currentUsage + requestedAmount;
      const percentage = limit > 0 ? Math.min(100, (currentUsage / limit) * 100) : 0;

      // Check if usage would exceed limit
      if (limit > 0 && newUsage > limit) {
        return {
          canProceed: false,
          usage: {
            current: currentUsage,
            limit,
            percentage
          },
          blockReason: `Usage limit exceeded. You have used ${currentUsage}/${limit} ${usageType}. Upgrade your plan for more capacity.`
        };
      }

      // Check for warnings (80% usage)
      let warning: string | undefined;
      if (percentage >= 80 && trialStatus.isTrial) {
        warning = `You've used ${percentage.toFixed(1)}% of your trial ${usageType}. ${trialStatus.daysRemaining} days remaining.`;
      } else if (percentage >= 80) {
        warning = `You've used ${percentage.toFixed(1)}% of your ${usageType} quota this period.`;
      }

      return {
        canProceed: true,
        usage: {
          current: currentUsage,
          limit,
          percentage
        },
        warning
      };

    } catch (error) {
      console.error('Error checking usage access:', error);
      return {
        canProceed: false,
        usage: {
          current: 0,
          limit: 0,
          percentage: 100
        },
        blockReason: 'Unable to verify usage limits. Please try again.'
      };
    }
  }

  /**
   * Record usage and check if it's allowed
   */
  async recordUsage(
    tenantId: string, 
    usageType: string, 
    amount: number = 1
  ): Promise<{ success: boolean; error?: string; usage?: any }> {
    try {
      // First check if usage is allowed
      const accessCheck = await this.checkUsageAccess(tenantId, usageType, amount);
      
      if (!accessCheck.canProceed) {
        return {
          success: false,
          error: accessCheck.blockReason || 'Usage not allowed',
          usage: accessCheck.usage
        };
      }

      // Record the usage
      const success = await polarSubscriptionService.incrementUsage(tenantId, usageType, amount);
      
      if (!success) {
        return {
          success: false,
          error: 'Failed to record usage. Please try again.',
          usage: accessCheck.usage
        };
      }

      return {
        success: true,
        usage: {
          ...accessCheck.usage,
          current: accessCheck.usage.current + amount
        }
      };

    } catch (error) {
      console.error('Error recording usage:', error);
      return {
        success: false,
        error: 'Failed to record usage. Please try again.'
      };
    }
  }

  /**
   * Get comprehensive tenant access summary
   */
  async getTenantAccessSummary(tenantId: string): Promise<{
    subscription: any;
    trialStatus: any;
    features: Record<string, FeatureAccess>;
    usage: Record<string, UsageCheckResult>;
    recommendations: string[];
  }> {
    try {
      const [subscription, trialStatus] = await Promise.all([
        polarSubscriptionService.getTenantSubscription(tenantId),
        polarSubscriptionService.getTrialStatus(tenantId)
      ]);

      // Check key features
      const featureKeys = [
        'ocr_processing',
        'email_templates', 
        'analytics',
        'api_access',
        'priority_support',
        'custom_branding',
        'team_collaboration'
      ];

      const features: Record<string, FeatureAccess> = {};
      for (const featureKey of featureKeys) {
        features[featureKey] = await this.checkFeatureAccess(tenantId, featureKey);
      }

      // Check usage limits
      const usageTypes = [
        'receipts_per_month',
        'invoices_per_month',
        'storage_mb',
        'users_max'
      ];

      const usage: Record<string, UsageCheckResult> = {};
      for (const usageType of usageTypes) {
        usage[usageType] = await this.checkUsageAccess(tenantId, usageType, 0); // Check without incrementing
      }

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (trialStatus.isTrial && trialStatus.daysRemaining <= 3) {
        recommendations.push('Your trial is expiring soon. Convert to a paid plan to maintain access to premium features.');
      }
      
      Object.entries(usage).forEach(([usageType, check]) => {
        if (check.usage.percentage >= 80) {
          recommendations.push(`You're approaching your ${usageType} limit (${check.usage.percentage.toFixed(1)}% used). Consider upgrading your plan.`);
        }
      });

      if (subscription?.status === 'trialing' && Object.values(features).some(f => f.hasAccess)) {
        recommendations.push('You have access to premium features during your trial. Upgrade to keep these features after your trial ends.');
      }

      return {
        subscription,
        trialStatus,
        features,
        usage,
        recommendations
      };

    } catch (error) {
      console.error('Error getting tenant access summary:', error);
      throw error;
    }
  }

  /**
   * Check free feature access
   */
  private checkFreeFeatureAccess(featureKey: string, trialContext: any): FeatureAccess {
    const freeFeatures = [
      'basic_ocr',
      'basic_analytics',
      'email_support'
    ];

    if (freeFeatures.includes(featureKey)) {
      return {
        hasAccess: true,
        reason: 'Feature is available in the free plan.',
        limitType: 'feature',
        upgradeRequired: false,
        trialContext
      };
    }

    return {
      hasAccess: false,
      reason: 'Feature requires a paid subscription or trial.',
      limitType: 'subscription',
      upgradeRequired: true,
      trialContext
    };
  }

  /**
   * Get free usage limits
   */
  private getFreeUsageLimits(): Record<string, number> {
    return {
      receipts_per_month: 10,
      invoices_per_month: 2,
      storage_mb: 100,
      users_max: 1
    };
  }

  /**
   * Check if tenant can start a trial
   */
  async canStartTrial(tenantId: string): Promise<{
    canStart: boolean;
    reason: string;
    hasExistingSubscription: boolean;
  }> {
    try {
      const [subscription, trialStatus] = await Promise.all([
        polarSubscriptionService.getTenantSubscription(tenantId),
        polarSubscriptionService.getTrialStatus(tenantId)
      ]);

      // Check if already has active subscription
      if (subscription && subscription.status === 'active') {
        return {
          canStart: false,
          reason: 'You already have an active subscription.',
          hasExistingSubscription: true
        };
      }

      // Check if trial is already active
      if (trialStatus.isTrial && !trialStatus.hasExpired) {
        return {
          canStart: false,
          reason: 'A trial is already active for this organization.',
          hasExistingSubscription: false
        };
      }

      // Check if trial was already used (look for expired/converted trials)
      const supabase = this.getSupabase();
      const { data: pastTrials, error } = await supabase
        .from('subscription')
        .select('id, status')
        .eq('tenant_id', tenantId)
        .in('status', ['trial_expired', 'converted'])
        .limit(1);

      if (error) {
        console.warn('Error checking past trials:', error);
      }

      if (pastTrials && pastTrials.length > 0) {
        return {
          canStart: false,
          reason: 'You have already used your free trial for this organization.',
          hasExistingSubscription: false
        };
      }

      return {
        canStart: true,
        reason: 'You are eligible to start a free trial.',
        hasExistingSubscription: false
      };

    } catch (error) {
      console.error('Error checking trial eligibility:', error);
      return {
        canStart: false,
        reason: 'Unable to verify trial eligibility. Please contact support.',
        hasExistingSubscription: false
      };
    }
  }
}

// Export singleton instance
export const featureAccessService = new FeatureAccessService();