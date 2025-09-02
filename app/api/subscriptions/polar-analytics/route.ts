import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { polarSubscriptionService } from '@/lib/services/polar-subscription-service';

export const dynamic = 'force-dynamic';

/**
 * Get Polar subscription analytics and insights for a tenant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');
    const period = searchParams.get('period') || '30'; // days
    const include_events = searchParams.get('include_events') === 'true';

    if (!tenant_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing tenant_id parameter'
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify authentication and access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get comprehensive subscription analytics
    const analytics = await polarSubscriptionService.getSubscriptionAnalytics(tenant_id);

    // Get subscription events if requested
    let events = [];
    if (include_events) {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - parseInt(period));

      const { data: eventData, error: eventError } = await supabase
        .from('subscription_event')
        .select('*')
        .eq('tenant_id', tenant_id)
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventError) {
        console.warn('Error fetching subscription events:', eventError);
      } else {
        events = eventData || [];
      }
    }

    // Calculate usage trends
    const usageTrends = await calculateUsageTrends(supabase, tenant_id, parseInt(period));

    // Get billing predictions
    const predictions = await getBillingPredictions(analytics, usageTrends);

    return NextResponse.json({
      success: true,
      tenant_id,
      analytics: {
        ...analytics,
        usage_trends: usageTrends,
        predictions,
        events: include_events ? events : undefined
      }
    });

  } catch (error) {
    console.error('Error getting Polar subscription analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get subscription analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate usage trends over time
 */
async function calculateUsageTrends(
  supabase: any, 
  tenant_id: string, 
  days: number
): Promise<Record<string, any>> {
  try {
    const subscription = await polarSubscriptionService.getTenantSubscription(tenant_id);
    
    if (!subscription) {
      return {};
    }

    // Get current usage
    const currentUsage = subscription.usage_counts || {};
    const limits = subscription.limits || {};

    // Calculate daily averages (simplified - in a real app, you'd track historical usage)
    const dailyAverages: Record<string, number> = {};
    const projections: Record<string, any> = {};

    Object.entries(currentUsage).forEach(([usageType, current]) => {
      const limit = limits[usageType];
      const currentValue = typeof current === 'number' ? current : 0;
      
      // Simple daily average (current usage / days in period)
      const daysInPeriod = Math.min(days, 30); // Max 30 days for current period
      dailyAverages[usageType] = currentValue / daysInPeriod;

      // Project end of period usage
      const projectedTotal = dailyAverages[usageType] * 30; // Project for full month
      const willExceedLimit = limit > 0 && projectedTotal > limit;
      
      projections[usageType] = {
        current: currentValue,
        limit: limit,
        daily_average: dailyAverages[usageType],
        projected_monthly: projectedTotal,
        will_exceed_limit: willExceedLimit,
        days_until_limit: limit > 0 && dailyAverages[usageType] > 0 ? 
          Math.floor((limit - currentValue) / dailyAverages[usageType]) : null
      };
    });

    return {
      daily_averages: dailyAverages,
      projections,
      period_days: days
    };

  } catch (error) {
    console.error('Error calculating usage trends:', error);
    return {};
  }
}

/**
 * Get billing predictions and recommendations
 */
async function getBillingPredictions(
  analytics: any, 
  usageTrends: any
): Promise<{
  next_bill_estimate: number;
  overage_risk: boolean;
  recommendations: string[];
  cost_optimization: string[];
}> {
  try {
    const recommendations: string[] = [];
    const costOptimization: string[] = [];
    let nextBillEstimate = 0;
    let overageRisk = false;

    // Basic billing estimate (would be more complex with actual usage-based billing)
    if (analytics.subscription?.amount) {
      nextBillEstimate = analytics.subscription.amount;
    }

    // Check for potential overages
    if (usageTrends.projections) {
      Object.entries(usageTrends.projections).forEach(([usageType, projection]: [string, any]) => {
        if (projection.will_exceed_limit) {
          overageRisk = true;
          recommendations.push(
            `You're projected to exceed your ${usageType} limit by ${
              (projection.projected_monthly - projection.limit).toFixed(0)
            } units this period.`
          );
        }

        if (projection.days_until_limit && projection.days_until_limit < 7) {
          recommendations.push(
            `You'll reach your ${usageType} limit in approximately ${projection.days_until_limit} days at current usage rate.`
          );
        }
      });
    }

    // Cost optimization suggestions
    if (analytics.trialInfo?.isTrial && analytics.trialInfo.daysRemaining <= 7) {
      costOptimization.push('Convert your trial to a paid subscription to avoid service interruption.');
    }

    if (analytics.trialInfo?.isTrial && analytics.usageData?.percentUsed) {
      const highUsageTypes = Object.entries(analytics.usageData.percentUsed)
        .filter(([_, percent]) => typeof percent === 'number' && percent < 50)
        .map(([type]) => type);

      if (highUsageTypes.length > 0) {
        costOptimization.push('Your usage is lower than expected. Consider starting with a smaller plan and upgrading as needed.');
      }
    }

    if (overageRisk) {
      costOptimization.push('Consider upgrading your plan to avoid usage limits and potential service restrictions.');
    }

    return {
      next_bill_estimate: nextBillEstimate,
      overage_risk: overageRisk,
      recommendations,
      cost_optimization: costOptimization
    };

  } catch (error) {
    console.error('Error calculating billing predictions:', error);
    return {
      next_bill_estimate: 0,
      overage_risk: false,
      recommendations: [],
      cost_optimization: []
    };
  }
}