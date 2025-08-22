import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BillingPredictions } from '@/lib/types/subscription';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // Get tenant ID from user metadata or membership
    const { data: membership } = await supabase
      .from('tenant_membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get current subscription
    const { data: subscription } = await supabase
      .from('tenant_subscription')
      .select(`
        *,
        subscription_plan!inner(*)
      `)
      .eq('tenant_id', membership.tenant_id)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get usage data for predictions
    const { data: usageData } = await supabase
      .from('tenant_usage')
      .select('*')
      .eq('tenant_id', membership.tenant_id)
      .order('created_at', { ascending: false })
      .limit(3); // Get last 3 months for trend analysis

    // Generate AI-powered predictions
    const predictions = await generateBillingPredictions(subscription, usageData || []);

    return NextResponse.json({
      success: true,
      data: predictions
    });

  } catch (error) {
    console.error('Error generating billing predictions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateBillingPredictions(
  subscription: any,
  usageHistory: any[]
): Promise<BillingPredictions> {
  const now = new Date();
  const nextBillingDate = new Date(subscription.current_period_end);
  
  // Calculate next billing amount based on current plan
  const estimatedAmount = subscription.amount;

  // Analyze usage trends
  let usageTrend: BillingPredictions['usageTrend'] = {
    direction: 'stable',
    monthlyGrowth: 0
  };

  if (usageHistory.length >= 2) {
    const currentUsage = usageHistory[0];
    const previousUsage = usageHistory[1];
    
    // Calculate growth based on total usage
    const currentTotal = Object.values(currentUsage.usage || {}).reduce((sum: number, val: any) => sum + (val.currentUsage || 0), 0);
    const previousTotal = Object.values(previousUsage.usage || {}).reduce((sum: number, val: any) => sum + (val.currentUsage || 0), 0);
    
    if (previousTotal > 0) {
      const growthRate = ((currentTotal - previousTotal) / previousTotal) * 100;
      
      if (growthRate > 10) {
        usageTrend = { direction: 'increasing', monthlyGrowth: Math.round(growthRate) };
      } else if (growthRate < -10) {
        usageTrend = { direction: 'decreasing', monthlyGrowth: Math.round(Math.abs(growthRate)) };
      } else {
        usageTrend = { direction: 'stable', monthlyGrowth: Math.round(Math.abs(growthRate)) };
      }
    }
  }

  // Check for recommended plan changes
  let recommendedPlan: BillingPredictions['recommendedPlan'] = undefined;
  
  // Example logic for plan recommendations
  if (usageTrend.direction === 'increasing' && usageTrend.monthlyGrowth > 25) {
    recommendedPlan = {
      planId: 'professional',
      planName: 'Professional Plan',
      potentialSavings: 15.00,
      reason: 'Your usage is growing rapidly. Upgrading now could save money and unlock more features.'
    };
  } else if (usageTrend.direction === 'decreasing' && usageTrend.monthlyGrowth > 30) {
    recommendedPlan = {
      planId: 'starter',
      planName: 'Starter Plan',
      potentialSavings: 10.00,
      reason: 'Your usage has decreased significantly. A lower plan might better match your needs.'
    };
  }

  // Check for upcoming limit exceeding
  let upcomingLimitExceeded: BillingPredictions['upcomingLimitExceeded'] = undefined;
  
  if (usageHistory.length > 0) {
    const latestUsage = usageHistory[0];
    
    // Check if any feature is approaching its limit
    for (const [feature, usage] of Object.entries(latestUsage.usage || {})) {
      const usageData = usage as any;
      
      if (!usageData.isUnlimited && usageData.limit > 0) {
        const utilizationRate = usageData.currentUsage / usageData.limit;
        
        if (utilizationRate > 0.85 && usageTrend.direction === 'increasing') {
          const projectedDate = new Date();
          projectedDate.setDate(projectedDate.getDate() + 15); // Estimate 15 days
          
          upcomingLimitExceeded = {
            feature: feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            projectedDate: projectedDate.toISOString(),
            recommendedAction: 'Consider upgrading your plan to avoid service interruption'
          };
          break;
        }
      }
    }
  }

  return {
    nextBillingDate: nextBillingDate.toISOString(),
    estimatedAmount,
    usageTrend,
    recommendedPlan,
    upcomingLimitExceeded
  };
}