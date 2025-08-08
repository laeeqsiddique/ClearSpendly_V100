import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Deployment safety
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;

export async function GET(request?: NextRequest) {
  // Mock response for build time
  if (isBuildTime) {
    return NextResponse.json({
      status: 'healthy',
      service: 'subscription-processor',
      timestamp: new Date().toISOString(),
      buildTime: true,
      checks: {
        database: 'healthy',
        subscriptions: 'healthy',
        processing: 'healthy'
      }
    });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    
    const healthCheck = {
      status: 'healthy',
      service: 'subscription-processor',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unknown',
        subscriptions: 'unknown',
        processing: 'unknown'
      },
      metrics: {
        activeSubscriptions: 0,
        pendingProcessing: 0,
        recentErrors: 0,
        lastProcessingBatch: null as string | null
      }
    };

    // Test database connectivity
    try {
      const { data, error } = await supabase.from('expense_subscription').select('id').limit(1);
      healthCheck.checks.database = error ? 'unhealthy' : 'healthy';
    } catch (error) {
      healthCheck.checks.database = 'unhealthy';
      console.error('[HealthCheck] Database connectivity test failed:', error);
    }

    // Check subscription data integrity
    try {
      // Count active subscriptions
      const { count: activeCount, error: activeError } = await supabase
        .from('expense_subscription')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Count subscriptions needing processing (overdue)
      const today = new Date().toISOString().split('T')[0];
      const { count: pendingCount, error: pendingError } = await supabase
        .from('expense_subscription')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lte('next_charge_date', today);

      if (!activeError && !pendingError) {
        healthCheck.checks.subscriptions = 'healthy';
        healthCheck.metrics.activeSubscriptions = activeCount || 0;
        healthCheck.metrics.pendingProcessing = pendingCount || 0;
      } else {
        healthCheck.checks.subscriptions = 'unhealthy';
        console.error('[HealthCheck] Subscription data check failed:', { activeError, pendingError });
      }
    } catch (error) {
      healthCheck.checks.subscriptions = 'unhealthy';
      console.error('[HealthCheck] Subscription integrity check failed:', error);
    }

    // Check recent processing events for errors
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Count recent errors
      const { count: errorCount, error: errorError } = await supabase
        .from('subscription_processing_event')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'generation_failed')
        .gte('created_at', twentyFourHoursAgo);

      // Get last successful batch
      const { data: lastBatch, error: batchError } = await supabase
        .from('subscription_processing_event')
        .select('batch_id, created_at')
        .eq('event_type', 'generation_completed')
        .not('batch_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!errorError && !batchError) {
        healthCheck.checks.processing = 'healthy';
        healthCheck.metrics.recentErrors = errorCount || 0;
        healthCheck.metrics.lastProcessingBatch = lastBatch?.created_at || null;
      } else {
        healthCheck.checks.processing = 'degraded';
        console.error('[HealthCheck] Processing events check failed:', { errorError, batchError });
      }
    } catch (error) {
      healthCheck.checks.processing = 'unhealthy';
      console.error('[HealthCheck] Processing health check failed:', error);
    }

    // Determine overall health status
    const checks = Object.values(healthCheck.checks);
    if (checks.every(check => check === 'healthy')) {
      healthCheck.status = 'healthy';
    } else if (checks.some(check => check === 'unhealthy')) {
      healthCheck.status = 'unhealthy';
    } else {
      healthCheck.status = 'degraded';
    }

    // Return appropriate HTTP status based on health
    const httpStatus = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheck, { status: httpStatus });

  } catch (error) {
    console.error('[HealthCheck] Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      service: 'subscription-processor',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
      checks: {
        database: 'unknown',
        subscriptions: 'unknown',
        processing: 'unknown'
      }
    }, { status: 503 });
  }
}

export const dynamic = 'force-dynamic';