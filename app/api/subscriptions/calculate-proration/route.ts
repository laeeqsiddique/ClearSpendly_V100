import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProrationCalculation } from '@/lib/types/subscription';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentSubscriptionId, newPlanId, billingCycle } = body;

    if (!currentSubscriptionId || !newPlanId || !billingCycle) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get current subscription
    const { data: currentSubscription, error: subscriptionError } = await supabase
      .from('tenant_subscription')
      .select(`
        *,
        subscription_plan!inner(*)
      `)
      .eq('id', currentSubscriptionId)
      .single();

    if (subscriptionError || !currentSubscription) {
      return NextResponse.json(
        { success: false, error: 'Current subscription not found' },
        { status: 404 }
      );
    }

    // Get new plan
    const { data: newPlan, error: planError } = await supabase
      .from('subscription_plan')
      .select('*')
      .eq('id', newPlanId)
      .single();

    if (planError || !newPlan) {
      return NextResponse.json(
        { success: false, error: 'New plan not found' },
        { status: 404 }
      );
    }

    // Calculate proration
    const calculation = calculateProration(
      currentSubscription,
      newPlan,
      billingCycle
    );

    return NextResponse.json({
      success: true,
      calculation
    });

  } catch (error) {
    console.error('Error calculating proration:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateProration(
  currentSubscription: any,
  newPlan: any,
  billingCycle: 'monthly' | 'yearly'
): ProrationCalculation {
  const now = new Date();
  const periodEnd = new Date(currentSubscription.current_period_end);
  const periodStart = new Date(currentSubscription.current_period_start);

  // Calculate days remaining in current period
  const totalPeriodDays = Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const unusedDays = Math.ceil(
    (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get pricing for the billing cycle
  const currentAmount = currentSubscription.amount;
  const newAmount = billingCycle === 'monthly' 
    ? newPlan.price_monthly 
    : newPlan.price_yearly;

  // Calculate proration
  const dailyRate = currentAmount / totalPeriodDays;
  const credit = dailyRate * Math.max(0, unusedDays);

  // Calculate immediate charge
  const newDailyRate = newAmount / totalPeriodDays;
  const immediateCharge = Math.max(0, (newDailyRate * unusedDays) - credit);

  return {
    oldPlan: {
      id: currentSubscription.plan_id,
      name: currentSubscription.subscription_plan.name,
      amount: currentAmount
    },
    newPlan: {
      id: newPlan.id,
      name: newPlan.name,
      amount: newAmount
    },
    unusedTime: Math.max(0, unusedDays),
    totalBillingPeriod: totalPeriodDays,
    credit: Math.round(credit * 100) / 100,
    immediateCharge: Math.round(immediateCharge * 100) / 100,
    nextBillingAmount: newAmount,
    effectiveDate: now.toISOString()
  };
}