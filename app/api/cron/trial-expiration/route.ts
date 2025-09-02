import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { polarSubscriptionService } from '@/lib/services/polar-subscription-service';

export const dynamic = 'force-dynamic';

/**
 * Cron job to handle trial expiration monitoring and notifications
 * Should be called daily via Vercel Cron Jobs or similar scheduler
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const results = {
      expiredTrials: 0,
      expiringSoonNotifications: 0,
      errors: [] as string[]
    };

    // 1. Handle expired trials
    const expiredTrials = await handleExpiredTrials(supabase);
    results.expiredTrials = expiredTrials.length;
    
    if (expiredTrials.length > 0) {
      console.log(`Processed ${expiredTrials.length} expired trials`);
    }

    // 2. Send notifications for trials expiring soon
    const expiringSoon = await polarSubscriptionService.getTrialsExpiringSoon(3);
    
    for (const trial of expiringSoon) {
      try {
        await sendTrialExpirationNotification(supabase, trial);
        results.expiringSoonNotifications++;
      } catch (error) {
        const errorMsg = `Failed to notify trial ${trial.subscription_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    // 3. Clean up old subscription events (keep last 90 days)
    await cleanupOldEvents(supabase);

    return NextResponse.json({
      success: true,
      message: 'Trial expiration monitoring completed',
      results
    });

  } catch (error) {
    console.error('Error in trial expiration cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process trial expiration monitoring',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle trials that have already expired
 */
async function handleExpiredTrials(supabase: any): Promise<any[]> {
  try {
    const now = new Date().toISOString();
    
    // Find trials that have expired
    const { data: expiredTrials, error } = await supabase
      .from('subscription')
      .select(`
        id,
        tenant_id,
        trial_end,
        tenant!inner(name)
      `)
      .eq('status', 'trialing')
      .lt('trial_end', now);

    if (error) {
      console.error('Error finding expired trials:', error);
      return [];
    }

    const processed = [];
    
    for (const trial of expiredTrials || []) {
      try {
        await polarSubscriptionService.handleTrialExpiration(trial.tenant_id);
        processed.push(trial);
        
        console.log(`Expired trial for tenant ${trial.tenant_id} (${trial.tenant.name})`);
      } catch (error) {
        console.error(`Failed to expire trial ${trial.id}:`, error);
      }
    }

    return processed;
  } catch (error) {
    console.error('Error handling expired trials:', error);
    return [];
  }
}

/**
 * Send trial expiration notification
 */
async function sendTrialExpirationNotification(
  supabase: any, 
  trial: {
    tenant_id: string;
    subscription_id: string;
    trial_end: string;
    days_remaining: number;
    tenant_name: string;
    owner_email: string;
  }
): Promise<void> {
  try {
    // Check if we've already sent a notification for this trial at this stage
    const { data: existingNotification } = await supabase
      .from('subscription_event')
      .select('id')
      .eq('subscription_id', trial.subscription_id)
      .eq('event_type', 'trial_expiration_reminder')
      .eq('event_data->>days_remaining', trial.days_remaining.toString())
      .single();

    if (existingNotification) {
      console.log(`Notification already sent for trial ${trial.subscription_id} at ${trial.days_remaining} days`);
      return;
    }

    // Determine notification type based on days remaining
    let emailTemplate = 'trial_expiring_soon';
    let subject = `Your ${trial.tenant_name} trial expires in ${trial.days_remaining} days`;
    
    if (trial.days_remaining === 1) {
      emailTemplate = 'trial_expiring_tomorrow';
      subject = `Your ${trial.tenant_name} trial expires tomorrow`;
    } else if (trial.days_remaining <= 0) {
      emailTemplate = 'trial_expired';
      subject = `Your ${trial.tenant_name} trial has expired`;
    }

    // Send email notification (assuming you have an email service)
    try {
      const response = await fetch('/api/email-templates/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET}`
        },
        body: JSON.stringify({
          templateType: emailTemplate,
          recipientEmail: trial.owner_email,
          data: {
            tenant_name: trial.tenant_name,
            days_remaining: trial.days_remaining,
            trial_end: trial.trial_end,
            conversion_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?convert_trial=true`,
            support_url: `${process.env.NEXT_PUBLIC_APP_URL}/support`
          },
          subject
        })
      });

      if (!response.ok) {
        throw new Error(`Email service returned ${response.status}`);
      }

      console.log(`Sent trial expiration notification to ${trial.owner_email}`);
    } catch (emailError) {
      console.warn(`Failed to send email notification:`, emailError);
      // Continue with logging even if email fails
    }

    // Log the notification event
    await supabase
      .from('subscription_event')
      .insert({
        subscription_id: trial.subscription_id,
        tenant_id: trial.tenant_id,
        event_type: 'trial_expiration_reminder',
        event_source: 'system',
        event_data: {
          days_remaining: trial.days_remaining,
          trial_end: trial.trial_end,
          notification_sent_to: trial.owner_email,
          template_used: emailTemplate
        }
      });

  } catch (error) {
    console.error('Error sending trial expiration notification:', error);
    throw error;
  }
}

/**
 * Clean up old subscription events
 */
async function cleanupOldEvents(supabase: any): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days

    const { error } = await supabase
      .from('subscription_event')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      console.warn('Error cleaning up old subscription events:', error);
    } else {
      console.log('Cleaned up subscription events older than 90 days');
    }
  } catch (error) {
    console.warn('Error in cleanup:', error);
  }
}

/**
 * Alternative POST method for manual triggering
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, tenant_id } = body;

  if (action === 'check_specific_tenant' && tenant_id) {
    try {
      const supabase = await createClient();
      const trialStatus = await polarSubscriptionService.getTrialStatus(tenant_id);
      
      if (trialStatus.hasExpired) {
        await polarSubscriptionService.handleTrialExpiration(tenant_id);
        return NextResponse.json({
          success: true,
          message: 'Trial expiration handled',
          status: trialStatus
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Trial not expired',
        status: trialStatus
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  );
}