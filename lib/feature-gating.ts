import { subscriptionService } from '@/lib/subscription-service';
import { createClient } from '@/lib/supabase/server';

// Feature definitions with descriptions and limits
export const FEATURES = {
  // OCR Processing Features
  'ocr_processing': {
    name: 'OCR Processing',
    description: 'Extract text and data from receipts automatically',
    levels: ['basic', 'enhanced', 'premium']
  },
  
  // Email & Communication
  'email_templates': {
    name: 'Email Templates',
    description: 'Customize invoice and receipt email templates',
    type: 'boolean'
  },
  
  // Analytics & Reporting
  'analytics': {
    name: 'Analytics',
    description: 'Business insights and expense analytics',
    levels: ['basic', 'advanced', 'premium']
  },
  'advanced_reporting': {
    name: 'Advanced Reporting',
    description: 'Detailed reports with custom date ranges and filters',
    type: 'boolean'
  },
  
  // Multi-user & Collaboration
  'multi_user': {
    name: 'Multi-User Access',
    description: 'Add team members and manage permissions',
    type: 'boolean'
  },
  
  // API & Integrations
  'api_access': {
    name: 'API Access',
    description: 'Access to REST API for integrations',
    levels: ['none', 'basic', 'full']
  },
  'integrations': {
    name: 'Third-Party Integrations',
    description: 'Connect with accounting software and other tools',
    type: 'boolean'
  },
  
  // Support & Services
  'priority_support': {
    name: 'Priority Support',
    description: 'Get faster response times for support requests',
    type: 'boolean'
  },
  'dedicated_support': {
    name: 'Dedicated Support',
    description: 'Personal account manager and dedicated support channel',
    type: 'boolean'
  },
  'sla_guarantee': {
    name: 'SLA Guarantee',
    description: '99.9% uptime guarantee with service credits',
    type: 'boolean'
  },
  
  // Branding & Customization
  'custom_branding': {
    name: 'Custom Branding',
    description: 'Add your logo and colors to invoices and emails',
    type: 'boolean'
  },
  'custom_features': {
    name: 'Custom Features',
    description: 'Request custom features for your business needs',
    type: 'boolean'
  }
} as const;

export type FeatureKey = keyof typeof FEATURES;

// Usage limit types
export const USAGE_TYPES = {
  'receipts_per_month': {
    name: 'Monthly Receipts',
    description: 'Number of receipts you can process per month',
    unit: 'receipts'
  },
  'invoices_per_month': {
    name: 'Monthly Invoices', 
    description: 'Number of invoices you can create per month',
    unit: 'invoices'
  },
  'storage_mb': {
    name: 'Storage Space',
    description: 'Total file storage space available',
    unit: 'MB'
  },
  'users_max': {
    name: 'Team Members',
    description: 'Maximum number of team members allowed',
    unit: 'users'
  }
} as const;

export type UsageType = keyof typeof USAGE_TYPES;

// Feature gating class
export class FeatureGate {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  // Check if a feature is enabled for the tenant
  async isEnabled(feature: FeatureKey): Promise<boolean> {
    try {
      return await subscriptionService.isFeatureEnabled(this.tenantId, feature);
    } catch (error) {
      console.error(`Error checking feature ${feature}:`, error);
      return false;
    }
  }

  // Get feature level (for features with levels like 'basic', 'advanced', 'premium')
  async getFeatureLevel(feature: FeatureKey): Promise<string | null> {
    try {
      const subscription = await subscriptionService.getTenantSubscription(this.tenantId);
      if (!subscription) return null;

      const supabase = createClient();
      const { data: plan, error } = await supabase
        .from('subscription_plan')
        .select('features')
        .eq('id', subscription.plan_id)
        .single();

      if (error || !plan) return null;

      return plan.features?.[feature] || null;
    } catch (error) {
      console.error(`Error getting feature level for ${feature}:`, error);
      return null;
    }
  }

  // Check usage limit and current usage
  async checkUsage(usageType: UsageType): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number | null;
    isUnlimited: boolean;
  }> {
    try {
      const result = await subscriptionService.checkUsageLimit(this.tenantId, usageType);
      
      return {
        allowed: result.allowed,
        current: result.currentUsage,
        limit: result.limit,
        remaining: result.remainingUsage || null,
        isUnlimited: result.isUnlimited
      };
    } catch (error) {
      console.error(`Error checking usage for ${usageType}:`, error);
      return {
        allowed: false,
        current: 0,
        limit: 0,
        remaining: 0,
        isUnlimited: false
      };
    }
  }

  // Increment usage counter
  async incrementUsage(usageType: UsageType, amount: number = 1): Promise<boolean> {
    try {
      return await subscriptionService.incrementUsage(this.tenantId, usageType, amount);
    } catch (error) {
      console.error(`Error incrementing usage for ${usageType}:`, error);
      return false;
    }
  }

  // Check if usage would exceed limit before performing action
  async canPerformAction(usageType: UsageType, amount: number = 1): Promise<{
    allowed: boolean;
    reason?: string;
    upgradeRequired?: boolean;
  }> {
    try {
      const usage = await this.checkUsage(usageType);
      
      if (usage.isUnlimited) {
        return { allowed: true };
      }

      if (usage.current + amount > usage.limit) {
        return {
          allowed: false,
          reason: `This action would exceed your ${USAGE_TYPES[usageType].name.toLowerCase()} limit of ${usage.limit} ${USAGE_TYPES[usageType].unit}.`,
          upgradeRequired: true
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error(`Error checking if action is allowed for ${usageType}:`, error);
      return {
        allowed: false,
        reason: 'Unable to verify usage limits. Please try again.'
      };
    }
  }

  // Get all features and their status for the tenant
  async getAllFeatures(): Promise<Record<FeatureKey, boolean | string>> {
    try {
      const subscription = await subscriptionService.getTenantSubscription(this.tenantId);
      if (!subscription) {
        // Return free plan features
        return this.getFreeFeatures();
      }

      const supabase = createClient();
      const { data: plan, error } = await supabase
        .from('subscription_plan')
        .select('features')
        .eq('id', subscription.plan_id)
        .single();

      if (error || !plan) {
        return this.getFreeFeatures();
      }

      const features: Record<FeatureKey, boolean | string> = {} as any;
      
      for (const featureKey of Object.keys(FEATURES) as FeatureKey[]) {
        const featureValue = plan.features?.[featureKey];
        
        // Check for feature overrides
        const override = await this.getFeatureOverride(featureKey);
        if (override !== null) {
          features[featureKey] = override;
        } else {
          features[featureKey] = featureValue || false;
        }
      }

      return features;
    } catch (error) {
      console.error('Error getting all features:', error);
      return this.getFreeFeatures();
    }
  }

  // Get all usage limits and current usage
  async getAllUsage(): Promise<Record<UsageType, {
    current: number;
    limit: number;
    remaining: number | null;
    isUnlimited: boolean;
    percentage: number;
  }>> {
    const usage: Record<UsageType, any> = {} as any;
    
    for (const usageType of Object.keys(USAGE_TYPES) as UsageType[]) {
      const result = await this.checkUsage(usageType);
      usage[usageType] = {
        current: result.current,
        limit: result.limit,
        remaining: result.remaining,
        isUnlimited: result.isUnlimited,
        percentage: result.isUnlimited ? 0 : Math.round((result.current / result.limit) * 100)
      };
    }

    return usage;
  }

  // Get feature override if exists
  private async getFeatureOverride(feature: FeatureKey): Promise<boolean | string | null> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('feature_flag')
        .select('is_enabled, config')
        .eq('tenant_id', this.tenantId)
        .eq('feature_key', feature)
        .gte('enabled_until', new Date().toISOString())
        .single();

      if (error || !data) return null;

      return data.is_enabled;
    } catch (error) {
      return null;
    }
  }

  // Default free features
  private getFreeFeatures(): Record<FeatureKey, boolean | string> {
    return {
      'ocr_processing': 'basic',
      'email_templates': false,
      'analytics': 'basic',
      'advanced_reporting': false,
      'multi_user': false,
      'api_access': 'none',
      'integrations': false,
      'priority_support': false,
      'dedicated_support': false,
      'sla_guarantee': false,
      'custom_branding': false,
      'custom_features': false
    };
  }
}

// Utility function to create feature gate for current user's tenant
export async function createFeatureGate(): Promise<FeatureGate | null> {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (membershipError || !membership) return null;

    return new FeatureGate(membership.tenant_id);
  } catch (error) {
    console.error('Error creating feature gate:', error);
    return null;
  }
}

// Middleware function for API routes to check features
export async function requireFeature(feature: FeatureKey, req?: any) {
  const featureGate = await createFeatureGate();
  
  if (!featureGate) {
    throw new Error('Authentication required');
  }

  const isEnabled = await featureGate.isEnabled(feature);
  
  if (!isEnabled) {
    throw new Error(`Feature '${FEATURES[feature].name}' is not available in your current plan`);
  }

  return featureGate;
}

// Middleware function for API routes to check usage limits
export async function requireUsage(usageType: UsageType, amount: number = 1) {
  const featureGate = await createFeatureGate();
  
  if (!featureGate) {
    throw new Error('Authentication required');
  }

  const canPerform = await featureGate.canPerformAction(usageType, amount);
  
  if (!canPerform.allowed) {
    const error: any = new Error(canPerform.reason || 'Usage limit exceeded');
    error.upgradeRequired = canPerform.upgradeRequired;
    throw error;
  }

  return featureGate;
}

// Decorator for API routes
export function withFeatureGate(feature: FeatureKey) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      await requireFeature(feature);
      return method.apply(this, args);
    };
  };
}

// Hook for React components
export async function useFeatureGate() {
  return await createFeatureGate();
}