import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { polarSubscriptionService } from '@/lib/services/polar-subscription-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');

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

    // Verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user has access to this tenant
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

    // Get trial status
    const trialStatus = await polarSubscriptionService.getTrialStatus(tenant_id);
    const subscription = await polarSubscriptionService.getTenantSubscription(tenant_id);

    return NextResponse.json({
      success: true,
      trial_status: trialStatus,
      subscription: subscription ? {
        id: subscription.id,
        plan_name: subscription.plan_name,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        usage_counts: subscription.usage_counts,
        limits: subscription.limits
      } : null
    });

  } catch (error) {
    console.error('Error getting trial status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get trial status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, action } = body;

    if (!tenant_id || !action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          required: ['tenant_id', 'action']
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user has owner access to this tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .eq('role', 'owner')
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Only tenant owners can manage trials.' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'extend_trial': {
        // Extend trial by specified days (admin action)
        const { days = 7 } = body;
        
        const subscription = await polarSubscriptionService.getTenantSubscription(tenant_id);
        if (!subscription || subscription.status !== 'trialing') {
          return NextResponse.json(
            { success: false, error: 'No active trial found' },
            { status: 400 }
          );
        }

        const newTrialEnd = new Date(subscription.trial_end!);
        newTrialEnd.setDate(newTrialEnd.getDate() + days);

        const { error } = await supabase
          .from('subscription')
          .update({
            trial_end: newTrialEnd.toISOString(),
            current_period_end: newTrialEnd.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (error) {
          throw new Error(`Failed to extend trial: ${error.message}`);
        }

        // Log extension event
        try {
          await supabase
            .from('subscription_event')
            .insert({
              subscription_id: subscription.id,
              tenant_id: tenant_id,
              event_type: 'trial_extended',
              event_source: 'api',
              event_data: {
                extension_days: days,
                new_trial_end: newTrialEnd.toISOString(),
                extended_by: user.id
              },
              triggered_by: user.id
            });
        } catch (eventError) {
          console.warn('Failed to log trial extension event:', eventError);
        }

        return NextResponse.json({
          success: true,
          message: `Trial extended by ${days} days`,
          new_trial_end: newTrialEnd.toISOString()
        });
      }

      case 'cancel_trial': {
        const subscription = await polarSubscriptionService.getTenantSubscription(tenant_id);
        if (!subscription || subscription.status !== 'trialing') {
          return NextResponse.json(
            { success: false, error: 'No active trial found' },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from('subscription')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (error) {
          throw new Error(`Failed to cancel trial: ${error.message}`);
        }

        // Log cancellation event
        try {
          await supabase
            .from('subscription_event')
            .insert({
              subscription_id: subscription.id,
              tenant_id: tenant_id,
              event_type: 'trial_cancelled',
              event_source: 'api',
              previous_status: 'trialing',
              new_status: 'cancelled',
              event_data: {
                cancelled_by: user.id,
                reason: body.reason || 'user_requested'
              },
              triggered_by: user.id
            });
        } catch (eventError) {
          console.warn('Failed to log trial cancellation event:', eventError);
        }

        return NextResponse.json({
          success: true,
          message: 'Trial cancelled successfully'
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
            allowed_actions: ['extend_trial', 'cancel_trial']
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error managing trial:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to manage trial',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}