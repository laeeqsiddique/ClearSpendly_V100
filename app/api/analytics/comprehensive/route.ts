// Comprehensive Analytics API for ClearSpendly
// High-performance analytics endpoints with caching and real-time capabilities

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { analyticsCache } from "@/lib/services/analytics-cache";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export const dynamic = 'force-dynamic';

interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  metrics?: string[]; // Which metrics to include
  granularity?: 'daily' | 'weekly' | 'monthly';
  includeForecasting?: boolean;
  includeComparison?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Parse request parameters
    const params: AnalyticsParams = {
      startDate: searchParams.get('startDate') || format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: searchParams.get('endDate') || format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      period: (searchParams.get('period') as any) || 'month',
      metrics: searchParams.get('metrics')?.split(',') || ['all'],
      granularity: (searchParams.get('granularity') as any) || 'daily',
      includeForecasting: searchParams.get('includeForecasting') === 'true',
      includeComparison: searchParams.get('includeComparison') !== 'false', // Default true
    };

    // Get user's tenant for RLS
    const { data: memberships } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ error: "No tenant access" }, { status: 403 });
    }

    const tenantId = memberships[0].tenant_id;

    // Use caching for expensive operations
    const cacheEnabled = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

    // Get comprehensive dashboard metrics
    const dashboardMetrics = cacheEnabled 
      ? await analyticsCache.getDashboardMetrics(
          tenantId,
          params.startDate!,
          params.endDate!,
          () => computeDashboardMetrics(supabase, tenantId, params)
        )
      : await computeDashboardMetrics(supabase, tenantId, params);

    // Get trend analysis if requested
    let trendAnalysis = null;
    if (params.metrics.includes('trends') || params.metrics.includes('all')) {
      trendAnalysis = cacheEnabled
        ? await analyticsCache.getTrendAnalysis(
            tenantId,
            'comprehensive',
            12,
            () => computeTrendAnalysis(supabase, tenantId, params)
          )
        : await computeTrendAnalysis(supabase, tenantId, params);
    }

    // Get expense analytics with anomaly detection if requested
    let expenseAnalytics = null;
    if (params.metrics.includes('expenses') || params.metrics.includes('all')) {
      expenseAnalytics = cacheEnabled
        ? await analyticsCache.getExpenseAnalytics(
            tenantId,
            params.startDate!,
            params.endDate!,
            () => computeExpenseAnalytics(supabase, tenantId, params)
          )
        : await computeExpenseAnalytics(supabase, tenantId, params);
    }

    // Get client segmentation if requested
    let clientSegmentation = null;
    if (params.metrics.includes('clients') || params.metrics.includes('all')) {
      clientSegmentation = cacheEnabled
        ? await analyticsCache.getClientSegmentation(
            tenantId,
            params.startDate!,
            params.endDate!,
            () => computeClientSegmentation(supabase, tenantId, params)
          )
        : await computeClientSegmentation(supabase, tenantId, params);
    }

    // Get subscription analytics if requested
    let subscriptionAnalytics = null;
    if (params.metrics.includes('subscriptions') || params.metrics.includes('all')) {
      subscriptionAnalytics = cacheEnabled
        ? await analyticsCache.getSubscriptionMetrics(
            tenantId,
            () => computeSubscriptionAnalytics(supabase, tenantId)
          )
        : await computeSubscriptionAnalytics(supabase, tenantId);
    }

    // Build response
    const response = {
      success: true,
      data: {
        period: {
          startDate: params.startDate,
          endDate: params.endDate,
          granularity: params.granularity,
        },
        dashboard: dashboardMetrics,
        trends: trendAnalysis,
        expenses: expenseAnalytics,
        clients: clientSegmentation,
        subscriptions: subscriptionAnalytics,
        cacheInfo: {
          enabled: cacheEnabled,
          generatedAt: new Date().toISOString(),
          ttl: cacheEnabled ? 300 : 0, // 5 minutes
        },
      },
      metadata: {
        computationTime: Date.now(),
        dataFreshness: 'real-time',
        version: '1.0',
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Comprehensive analytics error:', error);
    return NextResponse.json(
      { 
        error: "Failed to fetch comprehensive analytics",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Compute dashboard metrics
async function computeDashboardMetrics(
  supabase: any,
  tenantId: string,
  params: AnalyticsParams
) {
  try {
    const { data, error } = await supabase.rpc('get_comprehensive_dashboard_metrics', {
      p_tenant_id: tenantId,
      p_start_date: params.startDate,
      p_end_date: params.endDate,
      p_compare_periods: 1,
    });

    if (error) {
      console.error('Dashboard metrics error:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Dashboard metrics computation error:', error);
    return null;
  }
}

// Compute trend analysis
async function computeTrendAnalysis(
  supabase: any,
  tenantId: string,
  params: AnalyticsParams
) {
  try {
    const metrics = ['revenue', 'expenses', 'profit'];
    const trends: any = {};

    for (const metric of metrics) {
      const { data, error } = await supabase.rpc('get_trend_analysis', {
        p_tenant_id: tenantId,
        p_metric_type: metric,
        p_periods: 12,
      });

      if (!error && data) {
        trends[metric] = data;
      }
    }

    return trends;
  } catch (error) {
    console.error('Trend analysis computation error:', error);
    return null;
  }
}

// Compute expense analytics with anomaly detection
async function computeExpenseAnalytics(
  supabase: any,
  tenantId: string,
  params: AnalyticsParams
) {
  try {
    const { data, error } = await supabase.rpc('get_expense_analytics_with_anomalies', {
      p_tenant_id: tenantId,
      p_start_date: params.startDate,
      p_end_date: params.endDate,
      p_anomaly_threshold: 2.0,
    });

    if (error) {
      console.error('Expense analytics error:', error);
      return null;
    }

    return data || [];
  } catch (error) {
    console.error('Expense analytics computation error:', error);
    return null;
  }
}

// Compute client segmentation
async function computeClientSegmentation(
  supabase: any,
  tenantId: string,
  params: AnalyticsParams
) {
  try {
    const { data, error } = await supabase.rpc('get_client_segmentation_analytics', {
      p_tenant_id: tenantId,
      p_start_date: params.startDate,
      p_end_date: params.endDate,
    });

    if (error) {
      console.error('Client segmentation error:', error);
      return null;
    }

    return data || [];
  } catch (error) {
    console.error('Client segmentation computation error:', error);
    return null;
  }
}

// Compute subscription analytics
async function computeSubscriptionAnalytics(
  supabase: any,
  tenantId: string
) {
  try {
    const { data, error } = await supabase.rpc('get_subscription_analytics', {
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error('Subscription analytics error:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Subscription analytics computation error:', error);
    return null;
  }
}

// POST endpoint for cache management
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    switch (action) {
      case 'warm_cache':
        await analyticsCache.warmCache(tenantId);
        return NextResponse.json({ success: true, message: 'Cache warmed successfully' });

      case 'invalidate_cache':
        await analyticsCache.invalidateTenantCache(tenantId);
        return NextResponse.json({ success: true, message: 'Cache invalidated successfully' });

      case 'cache_stats':
        const stats = await analyticsCache.getCacheStats(tenantId);
        return NextResponse.json({ success: true, data: stats });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error) {
    console.error('Analytics cache management error:', error);
    return NextResponse.json(
      { error: "Failed to manage analytics cache" },
      { status: 500 }
    );
  }
}