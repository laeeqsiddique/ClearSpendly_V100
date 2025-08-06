import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { subscriptionService } from '@/lib/subscription-service';
import { FeatureGate, FEATURES, USAGE_TYPES } from '@/lib/feature-gating';

// Middleware to check subscription status and enforce limits
export async function subscriptionMiddleware(
  request: NextRequest,
  response: NextResponse
) {
  try {
    const pathname = request.nextUrl.pathname;
    
    // Skip middleware for certain paths
    const skipPaths = [
      '/api/auth',
      '/api/webhooks',
      '/api/health',
      '/api/subscriptions/plans',
      '/api/subscriptions/current',
      '/dashboard/billing'
    ];

    if (skipPaths.some(path => pathname.startsWith(path))) {
      return response;
    }

    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return response; // Let auth middleware handle this
    }

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (membershipError || !membership) {
      return response; // No tenant, let other middleware handle
    }

    const featureGate = new FeatureGate(membership.tenant_id);

    // Check trial expiration
    await checkTrialExpiration(supabase, membership.tenant_id, pathname);

    // Apply feature gates based on the route
    await applyFeatureGates(featureGate, pathname, request, response);

    // Apply usage limits
    await applyUsageLimits(featureGate, pathname, request, response);

    return response;

  } catch (error) {
    console.error('Subscription middleware error:', error);
    return response; // Don't block on middleware errors
  }
}

// Check if trial has expired and update subscription status
async function checkTrialExpiration(supabase: any, tenantId: string, pathname: string) {
  try {
    const subscription = await subscriptionService.getTenantSubscription(tenantId);
    
    if (!subscription || subscription.status !== 'trialing') {
      return;
    }

    // Check if trial has expired
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
    const now = new Date();

    if (trialEnd && now > trialEnd) {
      // Trial has expired, update subscription status
      await supabase
        .from('subscription')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      // Update tenant trial status
      await supabase
        .from('tenant')
        .update({
          is_trial_expired: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);
    }

  } catch (error) {
    console.error('Error checking trial expiration:', error);
  }
}

// Apply feature gates based on route patterns
async function applyFeatureGates(
  featureGate: FeatureGate,
  pathname: string,
  request: NextRequest,
  response: NextResponse
) {
  try {
    const routeFeatureMap: Record<string, keyof typeof FEATURES> = {
      '/dashboard/analytics': 'advanced_reporting',
      '/dashboard/team': 'multi_user',
      '/dashboard/integrations': 'integrations',
      '/api/analytics': 'advanced_reporting',
      '/api/team': 'multi_user',
      '/api/integrations': 'integrations'
    };

    for (const [route, feature] of Object.entries(routeFeatureMap)) {
      if (pathname.startsWith(route)) {
        const isEnabled = await featureGate.isEnabled(feature);
        
        if (!isEnabled) {
          if (pathname.startsWith('/api/')) {
            // API route - return 403
            return NextResponse.json(
              { 
                success: false, 
                error: `Feature '${FEATURES[feature].name}' is not available in your current plan`,
                upgradeRequired: true 
              },
              { status: 403 }
            );
          } else {
            // Dashboard route - redirect to upgrade page
            const upgradeUrl = new URL('/dashboard/billing', request.url);
            upgradeUrl.searchParams.set('feature', feature);
            return NextResponse.redirect(upgradeUrl);
          }
        }
        break;
      }
    }

  } catch (error) {
    console.error('Error applying feature gates:', error);
  }
}

// Apply usage limits based on route patterns
async function applyUsageLimits(
  featureGate: FeatureGate,
  pathname: string,
  request: NextRequest,
  response: NextResponse
) {
  try {
    const routeUsageMap: Record<string, keyof typeof USAGE_TYPES> = {
      '/api/receipts': 'receipts_per_month',
      '/api/invoices/create': 'invoices_per_month',
      '/api/process-receipt': 'receipts_per_month'
    };

    for (const [route, usageType] of Object.entries(routeUsageMap)) {
      if (pathname.startsWith(route) && request.method === 'POST') {
        const canPerform = await featureGate.canPerformAction(usageType);
        
        if (!canPerform.allowed) {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json(
              {
                success: false,
                error: canPerform.reason,
                upgradeRequired: canPerform.upgradeRequired
              },
              { status: 403 }
            );
          }
        }
        break;
      }
    }

  } catch (error) {
    console.error('Error applying usage limits:', error);
  }
}

// Enhanced API response wrapper that includes subscription context
export function withSubscriptionContext(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      const supabase = createClient();
      
      // Get current user and tenant
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      const { data: membership, error: membershipError } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (membershipError || !membership) {
        return NextResponse.json(
          { success: false, error: 'Tenant not found' },
          { status: 404 }
        );
      }

      // Add subscription context to request
      (request as any).subscriptionContext = {
        userId: user.id,
        tenantId: membership.tenant_id,
        featureGate: new FeatureGate(membership.tenant_id)
      };

      // Call the original handler
      const response = await handler(request, ...args);
      
      // Add subscription headers to response
      const subscription = await subscriptionService.getTenantSubscription(membership.tenant_id);
      if (subscription && response instanceof NextResponse) {
        response.headers.set('X-Subscription-Status', subscription.status);
        response.headers.set('X-Subscription-Plan', subscription.subscription_plan?.slug || 'unknown');
      }

      return response;

    } catch (error) {
      console.error('Subscription context error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Utility function to check and increment usage in API routes
export async function checkAndIncrementUsage(
  featureGate: FeatureGate,
  usageType: keyof typeof USAGE_TYPES,
  amount: number = 1
): Promise<{ allowed: boolean; error?: string }> {
  try {
    // Check if action is allowed
    const canPerform = await featureGate.canPerformAction(usageType, amount);
    if (!canPerform.allowed) {
      return {
        allowed: false,
        error: canPerform.reason || 'Usage limit exceeded'
      };
    }

    // Increment usage
    const incremented = await featureGate.incrementUsage(usageType, amount);
    if (!incremented) {
      return {
        allowed: false,
        error: 'Failed to update usage counter'
      };
    }

    return { allowed: true };

  } catch (error) {
    console.error('Error checking usage:', error);
    return {
      allowed: false,
      error: 'Unable to verify usage limits'
    };
  }
}

// Decorator for API routes that require subscription checks
export function requireSubscription(options?: {
  feature?: keyof typeof FEATURES;
  usage?: { type: keyof typeof USAGE_TYPES; amount?: number };
  minimumPlan?: 'free' | 'pro' | 'business' | 'enterprise';
}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (request: NextRequest, ...args: any[]) {
      const context = (request as any).subscriptionContext;
      if (!context) {
        return NextResponse.json(
          { success: false, error: 'Subscription context not available' },
          { status: 500 }
        );
      }

      const { featureGate } = context;

      // Check feature requirement
      if (options?.feature) {
        const isEnabled = await featureGate.isEnabled(options.feature);
        if (!isEnabled) {
          return NextResponse.json(
            {
              success: false,
              error: `Feature '${FEATURES[options.feature].name}' is not available in your current plan`,
              upgradeRequired: true
            },
            { status: 403 }
          );
        }
      }

      // Check usage requirement
      if (options?.usage) {
        const result = await checkAndIncrementUsage(
          featureGate,
          options.usage.type,
          options.usage.amount
        );
        
        if (!result.allowed) {
          return NextResponse.json(
            {
              success: false,
              error: result.error,
              upgradeRequired: true
            },
            { status: 403 }
          );
        }
      }

      // Call the original method
      return method.apply(this, [request, ...args]);
    };
  };
}