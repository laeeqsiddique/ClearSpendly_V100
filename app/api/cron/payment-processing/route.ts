import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dunningService } from '@/lib/services/dunning-management';
import { billingOperationsService } from '@/lib/services/billing-operations';
import { subscriptionLifecycleService } from '@/lib/services/subscription-lifecycle';

export const dynamic = 'force-dynamic';

// POST /api/cron/payment-processing - Process payment failures, dunning, and billing tasks
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();
    const results = {
      paymentRetries: { processed: 0, errors: [] as string[] },
      trialNotifications: { sent: 0, errors: [] as string[] },
      scheduledJobs: { processed: 0, errors: [] as string[] },
      billingTasks: { processed: 0, errors: [] as string[] }
    };

    // 1. Process scheduled payment retries
    try {
      console.log('Processing scheduled payment retries...');
      const retryResults = await dunningService.processScheduledRetries();
      results.paymentRetries.processed = retryResults.processed;
      results.paymentRetries.errors = retryResults.errors;
      
      console.log(`Processed ${retryResults.processed} payment retries with ${retryResults.errors.length} errors`);
    } catch (error) {
      console.error('Error processing payment retries:', error);
      results.paymentRetries.errors.push(
        error instanceof Error ? error.message : 'Unknown error in payment retries'
      );
    }

    // 2. Send trial ending notifications
    try {
      console.log('Processing trial ending notifications...');
      
      // Find subscriptions with trials ending in 3 days, 1 day, and today
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endOfToday = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const { data: trialEndingSubscriptions } = await supabase
        .from('subscription')
        .select(`
          *,
          tenant:tenant(*)
        `)
        .eq('status', 'trialing')
        .not('trial_end', 'is', null)
        .lte('trial_end', threeDaysFromNow.toISOString());

      for (const subscription of trialEndingSubscriptions || []) {
        const trialEnd = new Date(subscription.trial_end);
        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Only send notifications for 3 days, 1 day, and same day
        if ([3, 1, 0].includes(daysRemaining)) {
          try {
            // Get tenant's primary user email
            const { data: ownerMembership } = await supabase
              .from('membership')
              .select('user:users(*)')
              .eq('tenant_id', subscription.tenant_id)
              .eq('role', 'owner')
              .single();

            if (ownerMembership?.user?.email) {
              // Get receipt count for personalization
              const { count: receiptCount } = await supabase
                .from('receipt')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', subscription.tenant_id);

              await billingOperationsService.sendPaymentNotification(
                'trial_ending',
                subscription.tenant_id,
                ownerMembership.user.email,
                {
                  customer_name: ownerMembership.user.user_metadata?.full_name || 'Customer',
                  days_remaining: daysRemaining.toString(),
                  trial_end_date: trialEnd.toLocaleDateString(),
                  receipt_count: (receiptCount || 0).toString(),
                  dashboard_url: process.env.NEXT_PUBLIC_APP_URL || 'https://app.clearspendly.com'
                }
              );

              results.trialNotifications.sent++;
            }
          } catch (error) {
            console.error(`Error sending trial notification for subscription ${subscription.id}:`, error);
            results.trialNotifications.errors.push(
              `Subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      }

      console.log(`Sent ${results.trialNotifications.sent} trial ending notifications`);
    } catch (error) {
      console.error('Error processing trial notifications:', error);
      results.trialNotifications.errors.push(
        error instanceof Error ? error.message : 'Unknown error in trial notifications'
      );
    }

    // 3. Process scheduled jobs (account suspensions, etc.)
    try {
      console.log('Processing scheduled jobs...');
      
      const { data: dueJobs } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .limit(50); // Process max 50 jobs per run

      for (const job of dueJobs || []) {
        try {
          // Mark job as running
          await supabase
            .from('scheduled_jobs')
            .update({ 
              status: 'running',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          // Process the job based on type
          switch (job.job_type) {
            case 'suspend_account':
              await this.processSuspendAccountJob(job, supabase);
              break;
            
            case 'generate_invoice':
              await this.processGenerateInvoiceJob(job, supabase);
              break;
            
            case 'send_reminder':
              await this.processSendReminderJob(job, supabase);
              break;
            
            default:
              throw new Error(`Unknown job type: ${job.job_type}`);
          }

          // Mark job as completed
          await supabase
            .from('scheduled_jobs')
            .update({
              status: 'completed',
              executed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          results.scheduledJobs.processed++;

        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error);
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const retryCount = job.retry_count + 1;
          
          if (retryCount < job.max_retries) {
            // Schedule retry
            const nextRetry = new Date(Date.now() + Math.pow(2, retryCount) * 60000); // Exponential backoff
            
            await supabase
              .from('scheduled_jobs')
              .update({
                status: 'pending',
                retry_count: retryCount,
                error_message: errorMessage,
                scheduled_at: nextRetry.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);
          } else {
            // Max retries reached, mark as failed
            await supabase
              .from('scheduled_jobs')
              .update({
                status: 'failed',
                error_message: errorMessage,
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);
          }

          results.scheduledJobs.errors.push(`Job ${job.id}: ${errorMessage}`);
        }
      }

      console.log(`Processed ${results.scheduledJobs.processed} scheduled jobs`);
    } catch (error) {
      console.error('Error processing scheduled jobs:', error);
      results.scheduledJobs.errors.push(
        error instanceof Error ? error.message : 'Unknown error in scheduled jobs'
      );
    }

    // 4. Generate monthly invoices for active subscriptions
    try {
      console.log('Processing billing tasks...');
      
      const now = new Date();
      const isFirstOfMonth = now.getDate() === 1;
      
      if (isFirstOfMonth) {
        // Generate monthly invoices for subscriptions
        const { data: monthlySubscriptions } = await supabase
          .from('subscription')
          .select('*')
          .eq('status', 'active')
          .eq('billing_cycle', 'month')
          .lte('current_period_end', now.toISOString());

        for (const subscription of monthlySubscriptions || []) {
          try {
            const billingPeriodStart = new Date(subscription.current_period_end);
            const billingPeriodEnd = new Date(billingPeriodStart);
            billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

            await billingOperationsService.generateInvoice({
              subscriptionId: subscription.id,
              billingPeriodStart,
              billingPeriodEnd,
              amount: subscription.amount || 0,
              currency: subscription.currency || 'USD',
              description: `Monthly subscription - ${billingPeriodStart.toLocaleDateString()} to ${billingPeriodEnd.toLocaleDateString()}`
            });

            results.billingTasks.processed++;

          } catch (error) {
            console.error(`Error generating invoice for subscription ${subscription.id}:`, error);
            results.billingTasks.errors.push(
              `Subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      }

      console.log(`Processed ${results.billingTasks.processed} billing tasks`);
    } catch (error) {
      console.error('Error processing billing tasks:', error);
      results.billingTasks.errors.push(
        error instanceof Error ? error.message : 'Unknown error in billing tasks'
      );
    }

    // Log cron execution results
    await supabase
      .from('cron_execution_log')
      .insert({
        job_type: 'payment_processing',
        results,
        success: results.paymentRetries.errors.length === 0 &&
                results.trialNotifications.errors.length === 0 &&
                results.scheduledJobs.errors.length === 0 &&
                results.billingTasks.errors.length === 0,
        executed_at: new Date().toISOString()
      });

    const totalErrors = 
      results.paymentRetries.errors.length +
      results.trialNotifications.errors.length +
      results.scheduledJobs.errors.length +
      results.billingTasks.errors.length;

    console.log('Payment processing cron completed:', {
      paymentRetries: results.paymentRetries.processed,
      trialNotifications: results.trialNotifications.sent,
      scheduledJobs: results.scheduledJobs.processed,
      billingTasks: results.billingTasks.processed,
      totalErrors
    });

    return NextResponse.json({
      success: true,
      results,
      totalErrors,
      message: 'Payment processing cron completed successfully'
    });

  } catch (error) {
    console.error('Error in payment processing cron:', error);
    return NextResponse.json({ 
      error: 'Payment processing cron failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions for processing different job types
async function processSuspendAccountJob(job: any, supabase: any): Promise<void> {
  const { tenant_id, subscription_id, reason } = job.payload;

  // Suspend the subscription
  await supabase
    .from('subscription')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspension_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', subscription_id);

  // Send suspension notification
  const { data: ownerMembership } = await supabase
    .from('membership')
    .select('user:users(*)')
    .eq('tenant_id', tenant_id)
    .eq('role', 'owner')
    .single();

  if (ownerMembership?.user?.email) {
    await billingOperationsService.sendPaymentNotification(
      'account_suspended',
      tenant_id,
      ownerMembership.user.email,
      {
        customer_name: ownerMembership.user.user_metadata?.full_name || 'Customer',
        suspension_reason: reason,
        dashboard_url: process.env.NEXT_PUBLIC_APP_URL || 'https://app.clearspendly.com'
      }
    );
  }
}

async function processGenerateInvoiceJob(job: any, supabase: any): Promise<void> {
  const { subscription_id, billing_period_start, billing_period_end, amount } = job.payload;

  await billingOperationsService.generateInvoice({
    subscriptionId: subscription_id,
    billingPeriodStart: new Date(billing_period_start),
    billingPeriodEnd: new Date(billing_period_end),
    amount,
    description: `Subscription invoice for ${billing_period_start} - ${billing_period_end}`
  });
}

async function processSendReminderJob(job: any, supabase: any): Promise<void> {
  const { tenant_id, template_id, recipient_email, variables } = job.payload;

  await billingOperationsService.sendPaymentNotification(
    template_id,
    tenant_id,
    recipient_email,
    variables
  );
}

// For Railway.app cron jobs, also export as GET
export const GET = POST;