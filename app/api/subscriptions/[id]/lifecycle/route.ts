import { NextRequest, NextResponse } from 'next/server';
import { subscriptionLifecycleManager } from '@/lib/services/subscription-lifecycle-manager';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

// Deployment safety
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Handle subscription lifecycle changes (pause, resume, cancel)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  // Mock response for build time
  if (isBuildTime) {
    return NextResponse.json({
      success: true,
      message: 'Build-time mock response - subscription lifecycle operations disabled during build',
      buildTime: true
    });
  }

  try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const subscriptionId = params.id;
      const body = await request.json();
      const { action, effectiveDate, reason, immediateCancel } = body;

      // Validate required fields
      if (!action || !['pause', 'resume', 'cancel'].includes(action)) {
        return NextResponse.json({ 
          error: 'Invalid action. Must be one of: pause, resume, cancel' 
        }, { status: 400 });
      }

      // Get user's tenant context
      const { data: userTenants } = await supabase
        .from('membership')
        .select('tenant_id, role')
        .eq('user_id', user.id);

      if (!userTenants || userTenants.length === 0) {
        return NextResponse.json({ error: 'No tenant access' }, { status: 403 });
      }

      // Verify user has access to this subscription
      const { data: subscription } = await supabase
        .from('expense_subscription')
        .select('tenant_id, service_name, status')
        .eq('id', subscriptionId)
        .single();

      if (!subscription) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }

      const userTenant = userTenants.find(t => t.tenant_id === subscription.tenant_id);
      if (!userTenant || !['owner', 'admin', 'member'].includes(userTenant.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // Execute lifecycle action
      let result;
      switch (action) {
        case 'pause':
          result = await subscriptionLifecycleManager.pauseSubscription({
            subscriptionId,
            tenantId: subscription.tenant_id,
            userId: user.id,
            pauseDate: effectiveDate,
            reason
          });
          break;

        case 'resume':
          result = await subscriptionLifecycleManager.resumeSubscription({
            subscriptionId,
            tenantId: subscription.tenant_id,
            userId: user.id,
            resumeDate: effectiveDate,
            reason
          });
          break;

        case 'cancel':
          result = await subscriptionLifecycleManager.cancelSubscription({
            subscriptionId,
            tenantId: subscription.tenant_id,
            userId: user.id,
            cancellationDate: effectiveDate,
            reason,
            immediateCancel
          });
          break;

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      if (!result.success) {
        return NextResponse.json({ 
          error: result.error || 'Lifecycle operation failed' 
        }, { status: 400 });
      }

      // Return success response with operation details
      return NextResponse.json({
        success: true,
        action,
        subscriptionId,
        serviceName: subscription.service_name,
        result: {
          ...result,
          success: undefined // Remove success flag from nested result
        }
      });

    } catch (error) {
      console.error('[SubscriptionLifecycle] Error processing lifecycle action:', error);
      return NextResponse.json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }

  /**
   * Get subscription lifecycle event history
   */
  export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const subscriptionId = params.id;

      // Get user's tenant context
      const { data: userTenants } = await supabase
        .from('membership')
        .select('tenant_id, role')
        .eq('user_id', user.id);

      if (!userTenants || userTenants.length === 0) {
        return NextResponse.json({ error: 'No tenant access' }, { status: 403 });
      }

      // Verify user has access to this subscription
      const { data: subscription } = await supabase
        .from('expense_subscription')
        .select('tenant_id, service_name')
        .eq('id', subscriptionId)
        .single();

      if (!subscription) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }

      const userTenant = userTenants.find(t => t.tenant_id === subscription.tenant_id);
      if (!userTenant) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // Get lifecycle events
      const events = await subscriptionLifecycleManager.getSubscriptionLifecycleEvents(
        subscriptionId,
        subscription.tenant_id
      );

      return NextResponse.json({
        success: true,
        subscriptionId,
        serviceName: subscription.service_name,
        events
      });

    } catch (error) {
      console.error('[SubscriptionLifecycle] Error fetching lifecycle events:', error);
      return NextResponse.json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';