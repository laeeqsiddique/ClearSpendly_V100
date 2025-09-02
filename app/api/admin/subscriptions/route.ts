import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TenantSubscription } from '@/lib/types/subscription';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user and check admin privileges
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin role and get their tenant_id for proper isolation
    const { data: adminCheck } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner'])
      .single();

    if (!adminCheck) {
      return NextResponse.json(
        { success: false, error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    // SECURITY FIX: Only get subscriptions for the current user's tenant
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('tenant_subscription')
      .select(`
        *,
        tenant!inner(
          id,
          name
        ),
        subscription_plan!inner(
          id,
          name,
          slug,
          features,
          limits
        )
      `)
      .eq('tenant_id', adminCheck.tenant_id) // CRITICAL: Filter by current user's tenant only
      .order('created_at', { ascending: false });

    if (subscriptionsError) {
      throw subscriptionsError;
    }

    // Get usage data for each tenant
    const tenantSubscriptions: TenantSubscription[] = [];

    for (const sub of subscriptions || []) {
      // Get latest usage data
      const { data: usageData } = await supabase
        .from('tenant_usage')
        .select('*')
        .eq('tenant_id', sub.tenant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get last payment info
      const { data: lastPayment } = await supabase
        .from('payment_transaction')
        .select('*')
        .eq('tenant_id', sub.tenant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Determine health status
      const health = determineSubscriptionHealth(sub, usageData, lastPayment);

      tenantSubscriptions.push({
        tenant_id: sub.tenant_id,
        tenant_name: sub.tenant.name,
        subscription: {
          id: sub.id,
          tenant_id: sub.tenant_id,
          plan_id: sub.plan_id,
          billing_cycle: sub.billing_cycle,
          status: sub.status,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          trial_end: sub.trial_end,
          cancel_at_period_end: sub.cancel_at_period_end,
          amount: sub.amount,
          currency: sub.currency,
          provider: sub.provider,
          usage_counts: sub.usage_counts || {},
          subscription_plan: sub.subscription_plan
        },
        usage: usageData || { tenantId: sub.tenant_id, usage: {} },
        lastPayment: lastPayment ? {
          date: lastPayment.created_at,
          amount: lastPayment.amount,
          status: lastPayment.status
        } : undefined,
        health
      });
    }

    return NextResponse.json({
      success: true,
      data: tenantSubscriptions
    });

  } catch (error) {
    console.error('Error fetching admin subscriptions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function determineSubscriptionHealth(
  subscription: any,
  usage: any,
  lastPayment: any
): 'good' | 'warning' | 'critical' {
  // Critical conditions
  if (subscription.status === 'past_due' || subscription.status === 'cancelled') {
    return 'critical';
  }

  if (lastPayment?.status === 'failed') {
    return 'critical';
  }

  // Warning conditions
  if (subscription.status === 'trialing') {
    const trialEnd = new Date(subscription.trial_end || '');
    const now = new Date();
    const daysUntilTrialEnd = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilTrialEnd <= 3) {
      return 'warning';
    }
  }

  // Check usage limits
  if (usage?.usage) {
    for (const [_, usageInfo] of Object.entries(usage.usage)) {
      const info = usageInfo as any;
      if (!info.isUnlimited && info.limit > 0) {
        const utilizationRate = info.currentUsage / info.limit;
        if (utilizationRate >= 0.9) {
          return 'warning';
        }
      }
    }
  }

  return 'good';
}