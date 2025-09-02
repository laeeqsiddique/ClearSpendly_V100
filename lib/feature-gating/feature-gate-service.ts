import { createClient } from '@/lib/supabase/server';
import { polarSubscriptionService } from '@/lib/services/polar-subscription-service';

export const dynamic = 'force-dynamic';

// Feature definitions with hierarchical access levels
export interface FeatureDefinition {
  key: string;
  name: string;
  description: string;
  category: 'core' | 'analytics' | 'integration' | 'support' | 'advanced';
  levels: {
    [level: string]: {
      enabled: boolean;
      config?: Record<string, any>;
    };
  };
  defaultEnabled: boolean;
}

// Comprehensive feature catalog for ClearSpendly
export const FEATURE_CATALOG: FeatureDefinition[] = [
  {
    key: 'ocr_processing',
    name: 'OCR Processing',
    description: 'Receipt text extraction and processing',
    category: 'core',
    levels: {
      basic: { enabled: true, config: { accuracy: 'standard', pages_per_receipt: 1 } },
      enhanced: { enabled: true, config: { accuracy: 'high', pages_per_receipt: 3, ai_correction: true } },
      premium: { enabled: true, config: { accuracy: 'highest', pages_per_receipt: 10, ai_correction: true, batch_processing: true } }
    },
    defaultEnabled: true
  },
  {
    key: 'ai_chat',
    name: 'AI Chat Assistant',
    description: 'AI-powered chat for expense insights and help',
    category: 'advanced',
    levels: {
      basic: { enabled: true, config: { messages_per_day: 10, model: 'basic' } },
      advanced: { enabled: true, config: { messages_per_day: 100, model: 'mistral', context_aware: true } },
      premium: { enabled: true, config: { messages_per_day: -1, model: 'gpt-4', context_aware: true, custom_prompts: true } }
    },
    defaultEnabled: false
  },
  {
    key: 'analytics',
    name: 'Analytics & Insights',
    description: 'Financial analytics and reporting',
    category: 'analytics',
    levels: {
      basic: { enabled: true, config: { reports: ['basic_summary'], export_formats: ['csv'] } },
      advanced: { enabled: true, config: { reports: ['detailed', 'trends', 'categories'], export_formats: ['csv', 'excel'] } },
      premium: { enabled: true, config: { reports: ['all'], export_formats: ['csv', 'excel', 'pdf'], custom_reports: true, real_time: true } }
    },
    defaultEnabled: true
  },
  {
    key: 'email_templates',
    name: 'Email Templates',
    description: 'Customizable email templates and branding',
    category: 'integration',
    levels: {
      true: { enabled: true, config: { templates: 'all', custom_branding: true } }
    },
    defaultEnabled: false
  },
  {
    key: 'multi_user',
    name: 'Multi-User Support',
    description: 'Team collaboration and user management',
    category: 'core',
    levels: {
      true: { enabled: true, config: { max_users: -1, role_management: true, permissions: true } }
    },
    defaultEnabled: false
  },
  {
    key: 'api_access',
    name: 'API Access',
    description: 'REST API access for integrations',
    category: 'integration',
    levels: {
      basic: { enabled: true, config: { rate_limit: 100, endpoints: ['basic'] } },
      full: { enabled: true, config: { rate_limit: 1000, endpoints: ['all'], webhooks: true } }
    },
    defaultEnabled: false
  },
  {
    key: 'priority_support',
    name: 'Priority Support',
    description: 'Enhanced customer support with faster response times',
    category: 'support',
    levels: {
      true: { enabled: true, config: { response_time: '24h', channels: ['email', 'chat'], priority: 'high' } }
    },
    defaultEnabled: false
  },
  {
    key: 'custom_branding',
    name: 'Custom Branding',
    description: 'White-label options and custom branding',
    category: 'advanced',
    levels: {
      true: { enabled: true, config: { logo_upload: true, color_customization: true, domain_mapping: true } }
    },
    defaultEnabled: false
  },
  {
    key: 'receipt_storage',
    name: 'Receipt Storage',
    description: 'Long-term receipt image storage',
    category: 'core',
    levels: {
      true: { enabled: true, config: { retention_period: -1, backup: true, search: true } }
    },
    defaultEnabled: false
  },
  {
    key: 'advanced_reporting',
    name: 'Advanced Reporting',
    description: 'Custom reports and advanced analytics',
    category: 'analytics',
    levels: {
      true: { enabled: true, config: { custom_queries: true, scheduled_reports: true, dashboard_widgets: true } }
    },
    defaultEnabled: false
  },
  {
    key: 'integrations',
    name: 'Third-party Integrations',
    description: 'Connect with external accounting and business tools',
    category: 'integration',
    levels: {
      true: { enabled: true, config: { quickbooks: true, xero: true, zapier: true, custom_webhooks: true } }
    },
    defaultEnabled: false
  },
  {
    key: 'dedicated_support',
    name: 'Dedicated Support',
    description: 'Dedicated account manager and support team',
    category: 'support',
    levels: {
      true: { enabled: true, config: { account_manager: true, phone_support: true, response_time: '4h' } }
    },
    defaultEnabled: false
  }
];

export interface FeatureGateResult {
  enabled: boolean;
  level?: string;
  config?: Record<string, any>;
  reason: 'plan_feature' | 'override' | 'trial' | 'disabled' | 'error';
  details?: string;
}

export interface FeatureOverride {
  feature_key: string;
  enabled: boolean;
  level?: string;
  config?: Record<string, any>;
  reason?: string;
  expires_at?: Date;
}

export class FeatureGateService {
  private featureCache: Map<string, { result: FeatureGateResult; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  private getSupabase() {
    return createClient();
  }

  /**
   * Check if a feature is enabled for a tenant
   */
  async checkFeature(tenantId: string, featureKey: string): Promise<FeatureGateResult> {
    const cacheKey = `${tenantId}:${featureKey}`;
    const cached = this.featureCache.get(cacheKey);
    
    // Return cached result if valid
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    try {
      // Check for explicit feature flag override first
      const override = await this.getFeatureOverride(tenantId, featureKey);
      if (override) {
        const result: FeatureGateResult = {
          enabled: override.enabled,
          level: override.level,
          config: override.config,
          reason: 'override',
          details: override.reason
        };
        this.featureCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      // Get subscription details
      const subscription = await polarSubscriptionService.getTenantSubscription(tenantId);
      if (!subscription) {
        const result: FeatureGateResult = {
          enabled: this.getDefaultFeatureState(featureKey),
          reason: 'disabled',
          details: 'No active subscription'
        };
        this.featureCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      // Check if feature is enabled in subscription plan
      const planFeatureLevel = subscription.features[featureKey];
      const featureDefinition = FEATURE_CATALOG.find(f => f.key === featureKey);
      
      if (!featureDefinition) {
        const result: FeatureGateResult = {
          enabled: false,
          reason: 'error',
          details: `Feature ${featureKey} not found in catalog`
        };
        this.featureCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      // Determine if feature is enabled based on plan
      let enabled = false;
      let level: string | undefined;
      let config: Record<string, any> | undefined;

      if (planFeatureLevel === true || planFeatureLevel === 'true') {
        enabled = true;
        level = 'true';
        config = featureDefinition.levels.true?.config;
      } else if (typeof planFeatureLevel === 'string' && featureDefinition.levels[planFeatureLevel]) {
        enabled = featureDefinition.levels[planFeatureLevel].enabled;
        level = planFeatureLevel;
        config = featureDefinition.levels[planFeatureLevel].config;
      }

      const result: FeatureGateResult = {
        enabled,
        level,
        config,
        reason: subscription.status === 'trialing' ? 'trial' : 'plan_feature',
        details: `Plan: ${subscription.plan_name}, Level: ${level || 'disabled'}`
      };

      this.featureCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;

    } catch (error) {
      console.error(`Error checking feature ${featureKey} for tenant ${tenantId}:`, error);
      const result: FeatureGateResult = {
        enabled: this.getDefaultFeatureState(featureKey),
        reason: 'error',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      this.featureCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }
  }

  /**
   * Check multiple features at once
   */
  async checkFeatures(tenantId: string, featureKeys: string[]): Promise<Record<string, FeatureGateResult>> {
    const results: Record<string, FeatureGateResult> = {};
    
    await Promise.all(
      featureKeys.map(async (key) => {
        results[key] = await this.checkFeature(tenantId, key);
      })
    );

    return results;
  }

  /**
   * Get feature override for tenant
   */
  private async getFeatureOverride(tenantId: string, featureKey: string): Promise<FeatureOverride | null> {
    try {
      const { data, error } = await this.getSupabase()
        .from('feature_flag')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('feature_key', featureKey)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      // Check if override is still valid
      if (data.expires_at && new Date(data.expires_at) <= new Date()) {
        return null;
      }

      return {
        feature_key: data.feature_key,
        enabled: data.is_enabled,
        config: data.config || {},
        reason: data.override_reason,
        expires_at: data.expires_at ? new Date(data.expires_at) : undefined
      };
    } catch (error) {
      console.error('Error getting feature override:', error);
      return null;
    }
  }

  /**
   * Set feature override for tenant
   */
  async setFeatureOverride(
    tenantId: string, 
    featureKey: string, 
    enabled: boolean,
    options: {
      level?: string;
      config?: Record<string, any>;
      reason?: string;
      expiresAt?: Date;
      priority?: number;
      setBy?: string;
    } = {}
  ): Promise<void> {
    try {
      const { error } = await this.getSupabase()
        .from('feature_flag')
        .upsert({
          tenant_id: tenantId,
          feature_key: featureKey,
          is_enabled: enabled,
          config: options.config || {},
          override_reason: options.reason,
          expires_at: options.expiresAt?.toISOString(),
          priority: options.priority || 0,
          enabled_by: options.setBy,
          applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id,feature_key'
        });

      if (error) {
        throw new Error(`Failed to set feature override: ${error.message}`);
      }

      // Clear cache for this tenant/feature
      const cacheKey = `${tenantId}:${featureKey}`;
      this.featureCache.delete(cacheKey);

      console.log(`Feature override set: ${featureKey}=${enabled} for tenant ${tenantId}`);
    } catch (error) {
      console.error('Error setting feature override:', error);
      throw error;
    }
  }

  /**
   * Remove feature override for tenant
   */
  async removeFeatureOverride(tenantId: string, featureKey: string): Promise<void> {
    try {
      const { error } = await this.getSupabase()
        .from('feature_flag')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('feature_key', featureKey);

      if (error) {
        throw new Error(`Failed to remove feature override: ${error.message}`);
      }

      // Clear cache for this tenant/feature
      const cacheKey = `${tenantId}:${featureKey}`;
      this.featureCache.delete(cacheKey);

      console.log(`Feature override removed: ${featureKey} for tenant ${tenantId}`);
    } catch (error) {
      console.error('Error removing feature override:', error);
      throw error;
    }
  }

  /**
   * Get all feature states for a tenant
   */
  async getTenantFeatures(tenantId: string): Promise<Record<string, FeatureGateResult>> {
    const featureKeys = FEATURE_CATALOG.map(f => f.key);
    return await this.checkFeatures(tenantId, featureKeys);
  }

  /**
   * Get feature catalog with current tenant states
   */
  async getFeatureCatalogWithStates(tenantId: string): Promise<Array<FeatureDefinition & { current: FeatureGateResult }>> {
    const features = await this.getTenantFeatures(tenantId);
    
    return FEATURE_CATALOG.map(definition => ({
      ...definition,
      current: features[definition.key]
    }));
  }

  /**
   * Validate feature access and throw error if not enabled
   */
  async requireFeature(tenantId: string, featureKey: string, errorMessage?: string): Promise<FeatureGateResult> {
    const result = await this.checkFeature(tenantId, featureKey);
    
    if (!result.enabled) {
      throw new Error(errorMessage || `Feature '${featureKey}' is not available on your current plan`);
    }

    return result;
  }

  /**
   * Get feature usage configuration
   */
  async getFeatureConfig(tenantId: string, featureKey: string): Promise<Record<string, any> | null> {
    const result = await this.checkFeature(tenantId, featureKey);
    return result.enabled ? (result.config || {}) : null;
  }

  /**
   * Check if tenant has access to a feature level
   */
  async hasFeatureLevel(tenantId: string, featureKey: string, requiredLevel: string): Promise<boolean> {
    const result = await this.checkFeature(tenantId, featureKey);
    
    if (!result.enabled || !result.level) {
      return false;
    }

    // For boolean features, check if enabled
    if (requiredLevel === 'true' || requiredLevel === 'enabled') {
      return result.enabled;
    }

    // For tiered features, check hierarchy
    const featureDefinition = FEATURE_CATALOG.find(f => f.key === featureKey);
    if (!featureDefinition) {
      return false;
    }

    const levels = Object.keys(featureDefinition.levels);
    const currentLevelIndex = levels.indexOf(result.level);
    const requiredLevelIndex = levels.indexOf(requiredLevel);

    // Higher index = higher tier
    return currentLevelIndex >= requiredLevelIndex;
  }

  /**
   * Clear feature cache for tenant
   */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      // Clear cache for specific tenant
      for (const [key] of this.featureCache) {
        if (key.startsWith(`${tenantId}:`)) {
          this.featureCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.featureCache.clear();
    }
  }

  /**
   * Get default feature state (fallback)
   */
  private getDefaultFeatureState(featureKey: string): boolean {
    const featureDefinition = FEATURE_CATALOG.find(f => f.key === featureKey);
    return featureDefinition?.defaultEnabled || false;
  }

  /**
   * Initialize default feature states for new tenant
   */
  async initializeTenantFeatures(tenantId: string): Promise<void> {
    try {
      // Get subscription to determine initial feature states
      const subscription = await polarSubscriptionService.getTenantSubscription(tenantId);
      
      if (!subscription) {
        console.log(`No subscription found for tenant ${tenantId}, skipping feature initialization`);
        return;
      }

      // Set any permanent feature overrides if needed
      // This could be used for beta features, special promotions, etc.
      
      console.log(`Initialized features for tenant ${tenantId}`);
    } catch (error) {
      console.error(`Error initializing features for tenant ${tenantId}:`, error);
    }
  }
}

// Export singleton instance
// Export a factory function to avoid cookies context issues
export const featureGateService = {
  checkFeature: (tenantId: string, featureKey: string) => new FeatureGateService().checkFeature(tenantId, featureKey),
  checkFeatureGate: (tenantId: string, featureKey: string) => new FeatureGateService().checkFeatureGate(tenantId, featureKey),
  getAllFeatureGates: (tenantId: string) => new FeatureGateService().getAllFeatureGates(tenantId),
  getFeatureCatalog: () => new FeatureGateService().getFeatureCatalog(),
  checkUsageLimit: (tenantId: string, usageKey: string, increment?: number) => new FeatureGateService().checkUsageLimit(tenantId, usageKey, increment),
  recordUsage: (tenantId: string, usageKey: string, amount?: number) => new FeatureGateService().recordUsage(tenantId, usageKey, amount),
  getUsageStatus: (tenantId: string) => new FeatureGateService().getUsageStatus(tenantId),
  requireFeature: (tenantId: string, featureKey: string, errorMessage?: string) => new FeatureGateService().requireFeature(tenantId, featureKey, errorMessage),
};

// Utility function for use in API routes and components
export async function requireFeature(tenantId: string, featureKey: string, errorMessage?: string): Promise<FeatureGateResult> {
  return featureGateService.requireFeature(tenantId, featureKey, errorMessage);
}

// Utility function to check feature in components
export async function checkFeature(tenantId: string, featureKey: string): Promise<FeatureGateResult> {
  return featureGateService.checkFeature(tenantId, featureKey);
}