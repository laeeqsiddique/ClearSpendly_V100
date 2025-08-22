import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { subscriptionLifecycleService } from '@/lib/services/subscription-lifecycle';

export const dynamic = 'force-dynamic';

// Deployment safety
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;

// POST /api/billing/subscription-lifecycle - Handle subscription lifecycle operations
export async function POST(request: NextRequest) {
  if (isBuildTime) {
    return NextResponse.json({
      success: true,
      message: 'Build-time mock response',
      buildTime: true
    });
  }

  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();
    const body = await request.json();
    const { action, subscriptionId, ...options } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Get user's tenant and verify permissions
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant access found' }, { status: 403 });
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // For subscription-specific actions, verify ownership
    if (subscriptionId) {
      const { data: subscription, error: subError } = await supabase
        .from('subscription')
        .select('tenant_id')
        .eq('id', subscriptionId)
        .single();

      if (subError || !subscription || subscription.tenant_id !== membership.tenant_id) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }
    }

    let result;

    switch (action) {
      case 'create':
        result = await subscriptionLifecycleService.createSubscription({
          tenantId: membership.tenant_id,
          planId: options.planId,
          provider: options.provider || 'stripe',
          customerEmail: user.email!,
          customerName: user.user_metadata?.full_name,
          trialDays: options.trialDays,
          couponCode: options.couponCode
        });
        break;

      case 'upgrade':
        if (!subscriptionId) {
          return NextResponse.json({ error: 'Subscription ID required for upgrade' }, { status: 400 });
        }
        result = await subscriptionLifecycleService.upgradeSubscription({
          subscriptionId,
          newPlanId: options.newPlanId,
          prorationBehavior: options.prorationBehavior
        });
        break;

      case 'pause':
        if (!subscriptionId) {
          return NextResponse.json({ error: 'Subscription ID required for pause' }, { status: 400 });
        }
        result = await subscriptionLifecycleService.pauseSubscription(subscriptionId, {
          pauseUntil: options.pauseUntil ? new Date(options.pauseUntil) : undefined,
          reason: options.reason
        });
        break;

      case 'resume':
        if (!subscriptionId) {
          return NextResponse.json({ error: 'Subscription ID required for resume' }, { status: 400 });
        }
        result = await subscriptionLifecycleService.resumeSubscription(subscriptionId);
        break;

      case 'extend_trial':
        if (!subscriptionId) {
          return NextResponse.json({ error: 'Subscription ID required for trial extension' }, { status: 400 });
        }
        if (!options.extensionDays || !options.reason) {
          return NextResponse.json({ 
            error: 'Extension days and reason required for trial extension' 
          }, { status: 400 });
        }
        result = await subscriptionLifecycleService.extendTrial({
          subscriptionId,
          extensionDays: options.extensionDays,
          reason: options.reason
        });
        break;

      case 'cancel':
        if (!subscriptionId) {
          return NextResponse.json({ error: 'Subscription ID required for cancellation' }, { status: 400 });
        }
        result = await subscriptionLifecycleService.cancelSubscription(subscriptionId, {
          immediately: options.immediately,
          reason: options.reason,
          feedback: options.feedback
        });
        break;

      case 'reactivate':
        if (!subscriptionId) {
          return NextResponse.json({ error: 'Subscription ID required for reactivation' }, { status: 400 });
        }
        result = await subscriptionLifecycleService.reactivateSubscription(subscriptionId);
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Subscription ${action} completed successfully`
    });

  } catch (error) {
    console.error(`Error in POST /api/billing/subscription-lifecycle:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/billing/subscription-lifecycle - Get available plans and subscription info
export async function GET(request: NextRequest) {
  if (isBuildTime) {
    return NextResponse.json({
      success: true,
      plans: [],
      buildTime: true
    });
  }

  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const supabase = createClient();

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant access found' }, { status: 403 });
    }

    if (action === 'plans') {
      const plans = subscriptionLifecycleService.getAllPlans();
      return NextResponse.json({
        success: true,
        plans
      });
    }

    // Get current subscription info
    const { data: subscription } = await supabase
      .from('subscription')
      .select(`
        *,
        plan:subscription_tiers(*)
      `)
      .eq('tenant_id', membership.tenant_id)
      .eq('status', 'active')
      .single();

    const availablePlans = subscriptionLifecycleService.getAllPlans();
    
    return NextResponse.json({
      success: true,
      currentSubscription: subscription,
      availablePlans,
      canUpgrade: subscription && availablePlans.some(plan => plan.price > (subscription.amount || 0)),
      canDowngrade: subscription && availablePlans.some(plan => plan.price < (subscription.amount || 0)),
      canPause: subscription?.status === 'active',
      canResume: subscription?.status === 'paused',
      canCancel: subscription?.status === 'active' && !subscription.cancel_at_period_end,
      canReactivate: subscription?.cancel_at_period_end,
      inTrial: subscription?.trial_end && new Date(subscription.trial_end) > new Date()
    });

  } catch (error) {
    console.error('Error in GET /api/billing/subscription-lifecycle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}