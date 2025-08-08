// Real-time Analytics API for ClearSpendly
// WebSocket-compatible endpoint for live analytics updates

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { analyticsCache } from "@/lib/services/analytics-cache";

export const dynamic = 'force-dynamic';

interface RealTimeMetrics {
  timestamp: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  todaysTransactions: number;
  pendingInvoices: number;
  overdueInvoices: number;
  recentActivity: Array<{
    type: 'expense' | 'payment' | 'subscription' | 'invoice';
    description: string;
    amount: number;
    timestamp: string;
  }>;
  alerts: Array<{
    type: 'warning' | 'info' | 'success' | 'error';
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const includeActivity = searchParams.get('includeActivity') !== 'false';
    const includeAlerts = searchParams.get('includeAlerts') !== 'false';

    // Get user's tenant
    const { data: memberships } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ error: "No tenant access" }, { status: 403 });
    }

    const tenantId = memberships[0].tenant_id;
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];

    // Use short-term caching for real-time metrics (30 seconds)
    const cacheKey = `realtime:${tenantId}:${today}`;
    let metrics = await analyticsCache.get<RealTimeMetrics>(cacheKey);

    if (!metrics) {
      metrics = await computeRealTimeMetrics(supabase, tenantId, {
        today,
        monthStart,
        monthEnd,
        includeActivity,
        includeAlerts,
      });
      
      // Cache for 30 seconds only for real-time data
      await analyticsCache.set(cacheKey, metrics, 30);
    }

    return NextResponse.json({
      success: true,
      data: metrics,
      metadata: {
        generatedAt: new Date().toISOString(),
        cacheAge: 30, // seconds
        updateFrequency: '30s',
      },
    });

  } catch (error) {
    console.error('Real-time analytics error:', error);
    return NextResponse.json(
      { error: "Failed to fetch real-time analytics" },
      { status: 500 }
    );
  }
}

async function computeRealTimeMetrics(
  supabase: any,
  tenantId: string,
  params: {
    today: string;
    monthStart: string;
    monthEnd: string;
    includeActivity: boolean;
    includeAlerts: boolean;
  }
): Promise<RealTimeMetrics> {
  const timestamp = new Date().toISOString();

  // Get current month revenue
  const { data: revenueData } = await supabase
    .from('payment')
    .select(`
      amount,
      payment_date,
      payment_allocation(allocated_amount)
    `)
    .gte('payment_date', params.monthStart)
    .lte('payment_date', params.monthEnd);

  const totalRevenue = revenueData?.reduce((sum: number, payment: any) => {
    return sum + (payment.payment_allocation?.reduce((allocSum: number, alloc: any) => 
      allocSum + (alloc.allocated_amount || 0), 0) || payment.amount || 0);
  }, 0) || 0;

  // Get current month expenses
  const { data: expenseData } = await supabase
    .from('receipt')
    .select('total_amount')
    .gte('receipt_date', params.monthStart)
    .lte('receipt_date', params.monthEnd);

  const totalExpenses = expenseData?.reduce((sum: number, receipt: any) => 
    sum + (receipt.total_amount || 0), 0) || 0;

  // Get subscription metrics
  const { data: subscriptionData } = await supabase
    .from('subscription')
    .select('amount, frequency, status')
    .eq('status', 'active');

  const activeSubscriptions = subscriptionData?.length || 0;
  const monthlyRecurringRevenue = subscriptionData?.reduce((sum: number, sub: any) => {
    let monthlyAmount = 0;
    switch (sub.frequency) {
      case 'monthly':
        monthlyAmount = sub.amount;
        break;
      case 'yearly':
        monthlyAmount = sub.amount / 12;
        break;
      case 'quarterly':
        monthlyAmount = sub.amount / 3;
        break;
      case 'weekly':
        monthlyAmount = sub.amount * 4.33;
        break;
      default:
        monthlyAmount = sub.amount;
    }
    return sum + monthlyAmount;
  }, 0) || 0;

  // Get today's transaction count
  const { data: todaysTransactions } = await supabase
    .from('receipt')
    .select('id', { count: 'exact', head: true })
    .eq('receipt_date', params.today);

  // Get pending and overdue invoices
  const { data: pendingInvoicesData } = await supabase
    .from('invoice')
    .select('id, due_date, balance_due')
    .gt('balance_due', 0)
    .neq('status', 'paid');

  const pendingInvoices = pendingInvoicesData?.length || 0;
  const overdueInvoices = pendingInvoicesData?.filter((inv: any) => 
    new Date(inv.due_date) < new Date()
  ).length || 0;

  // Calculate derived metrics
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Get recent activity if requested
  let recentActivity: any[] = [];
  if (params.includeActivity) {
    recentActivity = await getRecentActivity(supabase, tenantId);
  }

  // Generate alerts if requested
  let alerts: any[] = [];
  if (params.includeAlerts) {
    alerts = await generateRealTimeAlerts(supabase, tenantId, {
      totalRevenue,
      totalExpenses,
      netProfit,
      overdueInvoices,
      monthlyRecurringRevenue,
    });
  }

  return {
    timestamp,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    activeSubscriptions,
    monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
    todaysTransactions: todaysTransactions || 0,
    pendingInvoices,
    overdueInvoices,
    recentActivity,
    alerts,
  };
}

async function getRecentActivity(supabase: any, tenantId: string) {
  const activities: any[] = [];
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Recent expenses
  const { data: recentExpenses } = await supabase
    .from('receipt')
    .select(`
      total_amount,
      created_at,
      vendor(name)
    `)
    .gte('created_at', last24Hours)
    .order('created_at', { ascending: false })
    .limit(5);

  recentExpenses?.forEach((expense: any) => {
    activities.push({
      type: 'expense',
      description: `New expense from ${expense.vendor?.name || 'Unknown Vendor'}`,
      amount: expense.total_amount,
      timestamp: expense.created_at,
    });
  });

  // Recent payments
  const { data: recentPayments } = await supabase
    .from('payment')
    .select(`
      amount,
      created_at,
      payment_allocation(
        invoice(client(name))
      )
    `)
    .gte('created_at', last24Hours)
    .order('created_at', { ascending: false })
    .limit(5);

  recentPayments?.forEach((payment: any) => {
    const clientName = payment.payment_allocation?.[0]?.invoice?.client?.name || 'Unknown Client';
    activities.push({
      type: 'payment',
      description: `Payment received from ${clientName}`,
      amount: payment.amount,
      timestamp: payment.created_at,
    });
  });

  // Recent subscriptions
  const { data: recentSubscriptions } = await supabase
    .from('subscription')
    .select('name, amount, created_at')
    .gte('created_at', last24Hours)
    .order('created_at', { ascending: false })
    .limit(3);

  recentSubscriptions?.forEach((subscription: any) => {
    activities.push({
      type: 'subscription',
      description: `New subscription: ${subscription.name}`,
      amount: subscription.amount,
      timestamp: subscription.created_at,
    });
  });

  // Sort all activities by timestamp and return top 10
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
}

async function generateRealTimeAlerts(
  supabase: any,
  tenantId: string,
  metrics: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    overdueInvoices: number;
    monthlyRecurringRevenue: number;
  }
) {
  const alerts: any[] = [];
  const timestamp = new Date().toISOString();

  // Cash flow alert
  if (metrics.netProfit < 0) {
    alerts.push({
      type: 'warning',
      message: `Negative cash flow this month: -$${Math.abs(metrics.netProfit).toLocaleString()}`,
      severity: 'high',
      timestamp,
    });
  }

  // Overdue invoices alert
  if (metrics.overdueInvoices > 0) {
    alerts.push({
      type: 'warning',
      message: `${metrics.overdueInvoices} invoice${metrics.overdueInvoices > 1 ? 's' : ''} overdue`,
      severity: metrics.overdueInvoices > 3 ? 'high' : 'medium',
      timestamp,
    });
  }

  // Low revenue alert (compared to expenses)
  if (metrics.totalRevenue > 0 && metrics.totalExpenses > metrics.totalRevenue * 1.2) {
    alerts.push({
      type: 'warning',
      message: 'Expenses are significantly higher than revenue this month',
      severity: 'medium',
      timestamp,
    });
  }

  // Subscription milestone
  if (metrics.monthlyRecurringRevenue > 10000 && alerts.length === 0) {
    alerts.push({
      type: 'success',
      message: `Monthly recurring revenue: $${metrics.monthlyRecurringRevenue.toLocaleString()}`,
      severity: 'low',
      timestamp,
    });
  }

  // Check for unusual spending patterns
  const { data: recentLargeExpenses } = await supabase
    .from('receipt')
    .select('total_amount, vendor(name)')
    .gte('receipt_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .gt('total_amount', 1000)
    .order('total_amount', { ascending: false })
    .limit(1);

  if (recentLargeExpenses && recentLargeExpenses.length > 0) {
    const expense = recentLargeExpenses[0];
    alerts.push({
      type: 'info',
      message: `Large expense: $${expense.total_amount.toLocaleString()} at ${expense.vendor?.name || 'Unknown'}`,
      severity: 'low',
      timestamp,
    });
  }

  return alerts.slice(0, 5); // Limit to 5 most important alerts
}

// Server-sent events endpoint for real-time streaming
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, tenantId } = body;

    switch (action) {
      case 'subscribe':
        // In a real implementation, this would set up WebSocket or SSE connection
        return NextResponse.json({
          success: true,
          message: 'Subscribed to real-time analytics',
          endpoint: `/api/analytics/real-time/stream?tenantId=${tenantId}`,
        });

      case 'trigger_update':
        // Manually trigger a cache refresh for real-time metrics
        const cacheKey = `realtime:${tenantId}:${new Date().toISOString().split('T')[0]}`;
        await analyticsCache.set(cacheKey, null, 0); // Invalidate cache
        return NextResponse.json({
          success: true,
          message: 'Real-time metrics cache invalidated',
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error) {
    console.error('Real-time analytics POST error:', error);
    return NextResponse.json(
      { error: "Failed to process real-time analytics request" },
      { status: 500 }
    );
  }
}