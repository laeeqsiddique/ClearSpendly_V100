import { createClient } from '@/lib/supabase/server';
import { stripeService } from '@/lib/stripe-service';
import { paypalService } from '@/lib/paypal-service';

export interface DunningConfig {
  maxRetryAttempts: number;
  retryIntervals: number[]; // Days between retries
  gracePeriod: number; // Days before cancellation
  emailTemplates: {
    failedPayment: string;
    finalNotice: string;
    accountSuspended: string;
    paymentSucceeded: string;
  };
}

export interface PaymentFailure {
  id: string;
  tenantId: string;
  subscriptionId: string;
  provider: 'stripe' | 'paypal';
  providerFailureId: string;
  amount: number;
  currency: string;
  failureReason: string;
  failureCode?: string;
  attemptCount: number;
  nextRetryDate: Date | null;
  status: 'pending' | 'retrying' | 'resolved' | 'abandoned';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export class DunningManagementService {
  private defaultConfig: DunningConfig = {
    maxRetryAttempts: 3,
    retryIntervals: [1, 3, 7], // 1 day, 3 days, 7 days
    gracePeriod: 14, // 14 days before final cancellation
    emailTemplates: {
      failedPayment: 'payment_failed',
      finalNotice: 'payment_final_notice',
      accountSuspended: 'account_suspended',
      paymentSucceeded: 'payment_recovered'
    }
  };

  async handlePaymentFailure(options: {
    tenantId: string;
    subscriptionId: string;
    provider: 'stripe' | 'paypal';
    providerFailureId: string;
    amount: number;
    currency: string;
    failureReason: string;
    failureCode?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; failure?: PaymentFailure; error?: string }> {
    try {
      const supabase = createClient();

      // Check if this failure already exists
      const { data: existingFailure } = await supabase
        .from('payment_failures')
        .select('*')
        .eq('provider_failure_id', options.providerFailureId)
        .single();

      if (existingFailure) {
        return { success: true, failure: existingFailure };
      }

      // Get tenant's dunning configuration
      const config = await this.getTenantDunningConfig(options.tenantId);

      // Calculate next retry date
      const nextRetryDate = new Date();
      nextRetryDate.setDate(nextRetryDate.getDate() + config.retryIntervals[0]);

      // Create payment failure record
      const { data: failure, error } = await supabase
        .from('payment_failures')
        .insert({
          tenant_id: options.tenantId,
          subscription_id: options.subscriptionId,
          provider: options.provider,
          provider_failure_id: options.providerFailureId,
          amount: options.amount,
          currency: options.currency,
          failure_reason: options.failureReason,
          failure_code: options.failureCode,
          attempt_count: 1,
          next_retry_date: nextRetryDate.toISOString(),
          status: 'pending',
          metadata: options.metadata
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating payment failure record:', error);
        return { success: false, error: 'Failed to record payment failure' };
      }

      // Send failed payment notification
      await this.sendFailedPaymentNotification(failure, config);

      // Schedule retry
      await this.schedulePaymentRetry(failure, config);

      return { success: true, failure };

    } catch (error) {
      console.error('Error handling payment failure:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async processScheduledRetries(): Promise<{ processed: number; errors: string[] }> {
    try {
      const supabase = createClient();
      const errors: string[] = [];
      let processed = 0;

      // Get all pending retries that are due
      const { data: dueRetries, error: queryError } = await supabase
        .from('payment_failures')
        .select('*')
        .eq('status', 'pending')
        .not('next_retry_date', 'is', null)
        .lte('next_retry_date', new Date().toISOString());

      if (queryError) {
        console.error('Error querying due retries:', queryError);
        return { processed: 0, errors: [queryError.message] };
      }

      if (!dueRetries || dueRetries.length === 0) {
        return { processed: 0, errors: [] };
      }

      // Process each retry
      for (const failure of dueRetries) {
        try {
          const config = await this.getTenantDunningConfig(failure.tenant_id);
          await this.retryPayment(failure, config);
          processed++;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to retry payment ${failure.id}: ${message}`);
        }
      }

      return { processed, errors };

    } catch (error) {
      console.error('Error processing scheduled retries:', error);
      return {
        processed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }

  private async retryPayment(failure: PaymentFailure, config: DunningConfig): Promise<void> {
    const supabase = createClient();

    try {
      // Update status to retrying
      await supabase
        .from('payment_failures')
        .update({ status: 'retrying', updated_at: new Date().toISOString() })
        .eq('id', failure.id);

      let retryResult;
      
      // Attempt payment retry based on provider
      switch (failure.provider) {
        case 'stripe':
          // Get the failed invoice and retry
          const { data: subscription } = await supabase
            .from('subscription')
            .select('stripe_subscription_id')
            .eq('id', failure.subscriptionId)
            .single();

          if (!subscription?.stripe_subscription_id) {
            throw new Error('Stripe subscription not found');
          }

          // Get latest invoice for the subscription
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          const invoices = await stripe.invoices.list({
            subscription: subscription.stripe_subscription_id,
            limit: 1,
            status: 'open'
          });

          if (invoices.data.length > 0) {
            retryResult = await stripeService.retryPayment(invoices.data[0].id);
          }
          break;

        case 'paypal':
          // PayPal doesn't have direct retry - need to check subscription status
          const paypalResult = await paypalService.getSubscriptionDetails(failure.subscriptionId);
          retryResult = { success: paypalResult.success };
          break;

        default:
          throw new Error(`Unsupported payment provider: ${failure.provider}`);
      }

      if (retryResult?.success) {
        // Payment succeeded - mark as resolved
        await supabase
          .from('payment_failures')
          .update({
            status: 'resolved',
            next_retry_date: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', failure.id);

        // Send success notification
        await this.sendPaymentRecoveredNotification(failure, config);

      } else {
        // Payment failed again - schedule next retry or abandon
        await this.handleRetryFailure(failure, config);
      }

    } catch (error) {
      console.error(`Error retrying payment ${failure.id}:`, error);
      
      // Mark retry as failed and schedule next attempt
      await this.handleRetryFailure(failure, config);
    }
  }

  private async handleRetryFailure(failure: PaymentFailure, config: DunningConfig): Promise<void> {
    const supabase = createClient();
    const newAttemptCount = failure.attemptCount + 1;

    if (newAttemptCount >= config.maxRetryAttempts) {
      // Max retries reached - start grace period
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + config.gracePeriod);

      await supabase
        .from('payment_failures')
        .update({
          status: 'abandoned',
          attempt_count: newAttemptCount,
          next_retry_date: null,
          metadata: {
            ...failure.metadata,
            grace_period_end: gracePeriodEnd.toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', failure.id);

      // Send final notice
      await this.sendFinalNoticeNotification(failure, config, gracePeriodEnd);

      // Schedule account suspension
      await this.scheduleAccountSuspension(failure, gracePeriodEnd);

    } else {
      // Schedule next retry
      const nextRetryDate = new Date();
      const retryInterval = config.retryIntervals[newAttemptCount - 1] || config.retryIntervals[config.retryIntervals.length - 1];
      nextRetryDate.setDate(nextRetryDate.getDate() + retryInterval);

      await supabase
        .from('payment_failures')
        .update({
          status: 'pending',
          attempt_count: newAttemptCount,
          next_retry_date: nextRetryDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', failure.id);

      // Send retry notification
      await this.sendRetryNotification(failure, config, newAttemptCount);
    }
  }

  private async getTenantDunningConfig(tenantId: string): Promise<DunningConfig> {
    try {
      const supabase = createClient();
      
      const { data: config } = await supabase
        .from('tenant_settings')
        .select('dunning_config')
        .eq('tenant_id', tenantId)
        .single();

      if (config?.dunning_config) {
        return { ...this.defaultConfig, ...config.dunning_config };
      }

      return this.defaultConfig;

    } catch (error) {
      console.error('Error getting tenant dunning config:', error);
      return this.defaultConfig;
    }
  }

  private async schedulePaymentRetry(failure: PaymentFailure, config: DunningConfig): Promise<void> {
    // In production, this would integrate with a job queue like Bull, Agenda, or cloud functions
    console.log(`Scheduled payment retry for failure ${failure.id} at ${failure.nextRetryDate}`);
    
    // For now, we'll rely on the cron job to process retries
    // You could implement immediate retry scheduling here
  }

  private async scheduleAccountSuspension(failure: PaymentFailure, suspensionDate: Date): Promise<void> {
    try {
      const supabase = createClient();
      
      // Create a scheduled job for account suspension
      await supabase
        .from('scheduled_jobs')
        .insert({
          tenant_id: failure.tenantId,
          job_type: 'suspend_account',
          scheduled_at: suspensionDate.toISOString(),
          payload: {
            payment_failure_id: failure.id,
            subscription_id: failure.subscriptionId,
            reason: 'payment_failure_grace_period_expired'
          },
          status: 'pending'
        });

    } catch (error) {
      console.error('Error scheduling account suspension:', error);
    }
  }

  private async sendFailedPaymentNotification(failure: PaymentFailure, config: DunningConfig): Promise<void> {
    try {
      // Implementation would send email via your email service
      console.log(`Sending failed payment notification for failure ${failure.id}`);
      
      // Example notification payload:
      const notificationData = {
        template: config.emailTemplates.failedPayment,
        tenantId: failure.tenantId,
        data: {
          amount: failure.amount,
          currency: failure.currency,
          failureReason: failure.failureReason,
          nextRetryDate: failure.nextRetryDate,
          paymentMethod: failure.provider
        }
      };

      // Send via your email service
      // await emailService.send(notificationData);

    } catch (error) {
      console.error('Error sending failed payment notification:', error);
    }
  }

  private async sendRetryNotification(failure: PaymentFailure, config: DunningConfig, attemptNumber: number): Promise<void> {
    try {
      console.log(`Sending retry notification ${attemptNumber} for failure ${failure.id}`);
      
      // Send escalating urgency notifications
      const template = attemptNumber >= config.maxRetryAttempts - 1 
        ? config.emailTemplates.finalNotice 
        : config.emailTemplates.failedPayment;

      // Implementation would send email
      
    } catch (error) {
      console.error('Error sending retry notification:', error);
    }
  }

  private async sendFinalNoticeNotification(failure: PaymentFailure, config: DunningConfig, gracePeriodEnd: Date): Promise<void> {
    try {
      console.log(`Sending final notice for failure ${failure.id}, grace period ends ${gracePeriodEnd}`);
      
      // Send final notice with account suspension warning
      
    } catch (error) {
      console.error('Error sending final notice:', error);
    }
  }

  private async sendPaymentRecoveredNotification(failure: PaymentFailure, config: DunningConfig): Promise<void> {
    try {
      console.log(`Sending payment recovered notification for failure ${failure.id}`);
      
      // Send success notification
      
    } catch (error) {
      console.error('Error sending payment recovered notification:', error);
    }
  }

  async getFailureStats(tenantId: string): Promise<{
    totalFailures: number;
    activeFailures: number;
    resolvedFailures: number;
    abandonedFailures: number;
    totalAmount: number;
    averageResolutionTime: number;
  }> {
    try {
      const supabase = createClient();

      const { data: failures } = await supabase
        .from('payment_failures')
        .select('*')
        .eq('tenant_id', tenantId);

      if (!failures || failures.length === 0) {
        return {
          totalFailures: 0,
          activeFailures: 0,
          resolvedFailures: 0,
          abandonedFailures: 0,
          totalAmount: 0,
          averageResolutionTime: 0
        };
      }

      const stats = failures.reduce((acc, failure) => {
        acc.totalFailures++;
        acc.totalAmount += failure.amount;
        
        switch (failure.status) {
          case 'pending':
          case 'retrying':
            acc.activeFailures++;
            break;
          case 'resolved':
            acc.resolvedFailures++;
            // Calculate resolution time in hours
            const created = new Date(failure.created_at);
            const updated = new Date(failure.updated_at);
            const resolutionHours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
            acc.resolutionTimes.push(resolutionHours);
            break;
          case 'abandoned':
            acc.abandonedFailures++;
            break;
        }

        return acc;
      }, {
        totalFailures: 0,
        activeFailures: 0,
        resolvedFailures: 0,
        abandonedFailures: 0,
        totalAmount: 0,
        resolutionTimes: [] as number[]
      });

      const averageResolutionTime = stats.resolutionTimes.length > 0
        ? stats.resolutionTimes.reduce((a, b) => a + b, 0) / stats.resolutionTimes.length
        : 0;

      return {
        totalFailures: stats.totalFailures,
        activeFailures: stats.activeFailures,
        resolvedFailures: stats.resolvedFailures,
        abandonedFailures: stats.abandonedFailures,
        totalAmount: stats.totalAmount,
        averageResolutionTime
      };

    } catch (error) {
      console.error('Error getting failure stats:', error);
      throw error;
    }
  }
}

export const dunningService = new DunningManagementService();