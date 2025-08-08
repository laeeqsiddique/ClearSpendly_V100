import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";

const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;

export const dynamic = 'force-dynamic';

function createBuildSafeSupabaseClient() {
  if (isBuildTime) {
    return {
      from: () => ({
        select: () => ({ data: [], error: null }),
        eq: () => ({ data: [], error: null }),
        gte: () => ({ data: [], error: null }),
        lte: () => ({ data: [], error: null }),
        is: () => ({ data: [], error: null }),
      })
    };
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

// GET /api/subscriptions/analytics - Get subscription analytics and insights
export async function GET(req: NextRequest) {
  try {
    if (isBuildTime) {
      return NextResponse.json({ data: null, error: null });
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createBuildSafeSupabaseClient();
    
    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "No tenant access found" }, { status: 403 });
    }

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '12'; // months

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - parseInt(period));

    // Get subscription summary
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscription')
      .select('id, name, amount, currency, frequency, status, category, created_at')
      .eq('tenant_id', membership.tenant_id)
      .is('deleted_at', null);

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      return NextResponse.json(
        { error: "Failed to fetch subscription analytics" },
        { status: 500 }
      );
    }

    // Get charges data for the period
    const { data: charges, error: chargesError } = await supabase
      .from('subscription_charge')
      .select('amount, currency, charge_date, status, subscription_id')
      .eq('tenant_id', membership.tenant_id)
      .gte('charge_date', startDate.toISOString().split('T')[0])
      .lte('charge_date', endDate.toISOString().split('T')[0]);

    if (chargesError) {
      console.error('Error fetching charges:', chargesError);
      return NextResponse.json(
        { error: "Failed to fetch charge analytics" },
        { status: 500 }
      );
    }

    // Calculate analytics
    const analytics = calculateSubscriptionAnalytics(subscriptions || [], charges || []);

    return NextResponse.json({
      success: true,
      data: {
        period_months: parseInt(period),
        summary: analytics.summary,
        monthly_spending: analytics.monthlySpending,
        category_breakdown: analytics.categoryBreakdown,
        frequency_breakdown: analytics.frequencyBreakdown,
        status_breakdown: analytics.statusBreakdown,
        upcoming_charges: analytics.upcomingCharges,
        cost_trends: analytics.costTrends
      }
    });

  } catch (error) {
    console.error("Subscription analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription analytics" },
      { status: 500 }
    );
  }
}

function calculateSubscriptionAnalytics(subscriptions: any[], charges: any[]) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

  // Summary calculations
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const totalMonthlyAmount = activeSubscriptions.reduce((sum, sub) => {
    const monthlyAmount = calculateMonthlyAmount(sub.amount, sub.frequency);
    return sum + monthlyAmount;
  }, 0);
  
  const totalYearlyAmount = totalMonthlyAmount * 12;
  const averageSubscriptionCost = activeSubscriptions.length > 0 
    ? totalMonthlyAmount / activeSubscriptions.length 
    : 0;

  // Monthly spending from charges
  const monthlySpending = charges.reduce((acc, charge) => {
    const month = charge.charge_date.substring(0, 7); // YYYY-MM
    if (!acc[month]) acc[month] = 0;
    acc[month] += parseFloat(charge.amount);
    return acc;
  }, {});

  // Category breakdown
  const categoryBreakdown = activeSubscriptions.reduce((acc, sub) => {
    const category = sub.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { count: 0, total_amount: 0, monthly_amount: 0 };
    }
    acc[category].count++;
    acc[category].total_amount += parseFloat(sub.amount);
    acc[category].monthly_amount += calculateMonthlyAmount(sub.amount, sub.frequency);
    return acc;
  }, {});

  // Frequency breakdown
  const frequencyBreakdown = subscriptions.reduce((acc, sub) => {
    if (!acc[sub.frequency]) {
      acc[sub.frequency] = { count: 0, total_amount: 0 };
    }
    acc[sub.frequency].count++;
    acc[sub.frequency].total_amount += parseFloat(sub.amount);
    return acc;
  }, {});

  // Status breakdown
  const statusBreakdown = subscriptions.reduce((acc, sub) => {
    if (!acc[sub.status]) {
      acc[sub.status] = { count: 0, total_amount: 0 };
    }
    acc[sub.status].count++;
    acc[sub.status].total_amount += parseFloat(sub.amount);
    return acc;
  }, {});

  // Calculate upcoming charges (would need charges data from upcoming_charges table)
  const upcomingCharges = {
    next_7_days: 0,
    next_30_days: 0,
    next_90_days: 0
  };

  // Cost trends (simplified - could be more sophisticated)
  const sortedCharges = charges.sort((a, b) => a.charge_date.localeCompare(b.charge_date));
  const costTrends = {
    trend_direction: 'stable',
    monthly_change_percent: 0,
    recent_months_average: 0
  };

  return {
    summary: {
      total_subscriptions: subscriptions.length,
      active_subscriptions: activeSubscriptions.length,
      paused_subscriptions: subscriptions.filter(s => s.status === 'paused').length,
      cancelled_subscriptions: subscriptions.filter(s => s.status === 'cancelled').length,
      total_monthly_amount: Math.round(totalMonthlyAmount * 100) / 100,
      total_yearly_amount: Math.round(totalYearlyAmount * 100) / 100,
      average_subscription_cost: Math.round(averageSubscriptionCost * 100) / 100,
      total_charges_processed: charges.filter(c => c.status === 'processed').length,
      pending_charges: charges.filter(c => c.status === 'pending').length
    },
    monthlySpending,
    categoryBreakdown,
    frequencyBreakdown,
    statusBreakdown,
    upcomingCharges,
    costTrends
  };
}

function calculateMonthlyAmount(amount: number, frequency: string): number {
  const amt = parseFloat(amount.toString());
  
  switch (frequency) {
    case 'monthly':
      return amt;
    case 'yearly':
      return amt / 12;
    case 'quarterly':
      return amt / 3;
    case 'weekly':
      return amt * 4.33; // Average weeks per month
    default:
      return amt; // Default to monthly for custom frequencies
  }
}