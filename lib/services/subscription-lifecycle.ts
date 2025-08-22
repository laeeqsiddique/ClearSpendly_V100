import { createClient } from '@/lib/supabase/server';
import { stripeService } from '@/lib/stripe-service';
import { paypalService } from '@/lib/paypal-service';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  trialDays?: number;
  features: string[];
  stripePriceId?: string;
  paypalPlanId?: string;
}

export interface SubscriptionUpgrade {
  fromPlan: string;
  toPlan: string;
  prorationAmount: number;
  effectiveDate: Date;
  reason?: string;
}

export interface TrialExtension {
  subscriptionId: string;
  currentTrialEnd: Date;
  newTrialEnd: Date;
  extensionDays: number;
  reason: string;
}

export class SubscriptionLifecycleService {
  private readonly SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      price: 0,
      currency: 'USD',
      interval: 'month',
      trialDays: 0,
      features: ['OCR processing', 'Basic reporting', 'Up to 50 receipts']
    },
    {
      id: 'basic',
      name: 'Basic',
      description: 'Great for small businesses',
      price: 9.99,
      currency: 'USD',
      interval: 'month',
      trialDays: 14,
      features: ['All free features', 'Advanced OCR', 'Up to 500 receipts', 'CSV export'],
      stripePriceId: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID,
      paypalPlanId: process.env.PAYPAL_BASIC_PLAN_ID
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Perfect for growing businesses',
      price: 24.99,
      currency: 'USD',
      interval: 'month',
      trialDays: 14,
      features: ['All basic features', 'AI categorization', 'Up to 5000 receipts', 'Multi-user'],
      stripePriceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
      paypalPlanId: process.env.PAYPAL_PREMIUM_PLAN_ID
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations',
      price: 99.99,
      currency: 'USD',
      interval: 'month',
      trialDays: 30,
      features: ['All premium features', 'Unlimited receipts', 'Custom integrations'],
      stripePriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
      paypalPlanId: process.env.PAYPAL_ENTERPRISE_PLAN_ID
    }
  ];

  async createSubscription(options: {
    tenantId: string;
    planId: string;
    provider: 'stripe' | 'paypal';
    customerId?: string;
    customerEmail: string;
    customerName?: string;
    trialDays?: number;
    couponCode?: string;
  }): Promise<{
    success: boolean;
    subscription?: any;
    clientSecret?: string;
    approvalUrl?: string;
    error?: string;
  }> {
    try {
      const supabase = createClient();
      const plan = this.getPlan(options.planId);
      
      if (!plan) {
        return { success: false, error: 'Invalid plan ID' };
      }

      // Create customer if needed
      let customerId = options.customerId;
      if (!customerId && options.provider === 'stripe') {
        const customerResult = await stripeService.createCustomer({
          email: options.customerEmail,
          name: options.customerName,
          tenantId: options.tenantId
        });

        if (!customerResult.success || !customerResult.customer) {
          return { success: false, error: 'Failed to create customer' };
        }

        customerId = customerResult.customer.id;
      }

      let result;
      let subscriptionData;

      switch (options.provider) {
        case 'stripe':
          if (!plan.stripePriceId) {
            return { success: false, error: 'Stripe price not configured for this plan' };
          }

          const stripeResult = await stripeService.createSubscription({
            customerId: customerId!,
            priceId: plan.stripePriceId,
            tenantId: options.tenantId,
            trialDays: options.trialDays || plan.trialDays,
            metadata: {
              plan_id: options.planId,
              tenant_id: options.tenantId
            }
          });

          if (!stripeResult.success || !stripeResult.subscription) {
            return { success: false, error: stripeResult.error };
          }

          // Apply coupon if provided
          if (options.couponCode) {
            await stripeService.applyCoupon(stripeResult.subscription.id, options.couponCode);
          }

          subscriptionData = {
            tenant_id: options.tenantId,
            plan_id: options.planId,
            provider: 'stripe',
            provider_subscription_id: stripeResult.subscription.id,
            provider_customer_id: customerId,
            status: stripeResult.subscription.status,
            current_period_start: new Date(stripeResult.subscription.current_period_start * 1000),
            current_period_end: new Date(stripeResult.subscription.current_period_end * 1000),
            trial_end: stripeResult.subscription.trial_end ? new Date(stripeResult.subscription.trial_end * 1000) : null,
            cancel_at_period_end: stripeResult.subscription.cancel_at_period_end,
            billing_cycle: plan.interval,
            amount: plan.price,
            currency: plan.currency
          };

          result = {
            success: true,
            subscription: stripeResult.subscription,
            clientSecret: (stripeResult.subscription.latest_invoice as any)?.payment_intent?.client_secret
          };
          break;

        case 'paypal':
          if (!plan.paypalPlanId) {
            return { success: false, error: 'PayPal plan not configured for this plan' };
          }

          const paypalResult = await paypalService.createSubscription({
            planId: plan.paypalPlanId,
            tenantId: options.tenantId,
            customerEmail: options.customerEmail,
            customerName: options.customerName
          });

          if (!paypalResult.success || !paypalResult.subscription) {
            return { success: false, error: paypalResult.error };
          }

          subscriptionData = {
            tenant_id: options.tenantId,
            plan_id: options.planId,
            provider: 'paypal',
            provider_subscription_id: paypalResult.subscription.id,
            status: 'incomplete', // Will be updated via webhook
            billing_cycle: plan.interval,
            amount: plan.price,
            currency: plan.currency
          };

          result = {
            success: true,
            subscription: paypalResult.subscription,
            approvalUrl: paypalResult.subscription.approvalUrl
          };
          break;

        default:
          return { success: false, error: 'Unsupported payment provider' };
      }

      // Save subscription to database
      const { data: savedSubscription, error: dbError } = await supabase
        .from('subscription')
        .insert(subscriptionData)
        .select()
        .single();

      if (dbError) {
        console.error('Error saving subscription:', dbError);
        return { success: false, error: 'Failed to save subscription' };
      }

      // Log subscription creation
      await this.logSubscriptionEvent(savedSubscription.id, 'created', {
        plan_id: options.planId,
        provider: options.provider,
        trial_days: options.trialDays || plan.trialDays
      });

      return result;

    } catch (error) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async upgradeSubscription(options: {
    subscriptionId: string;
    newPlanId: string;
    prorationBehavior?: 'create_prorations' | 'none';
    effectiveDate?: Date;
  }): Promise<{
    success: boolean;
    upgrade?: SubscriptionUpgrade;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      // Get current subscription
      const { data: currentSub, error: subError } = await supabase
        .from('subscription')
        .select('*')
        .eq('id', options.subscriptionId)
        .single();

      if (subError || !currentSub) {
        return { success: false, error: 'Subscription not found' };
      }

      const currentPlan = this.getPlan(currentSub.plan_id);
      const newPlan = this.getPlan(options.newPlanId);

      if (!currentPlan || !newPlan) {
        return { success: false, error: 'Invalid plan configuration' };
      }

      // Calculate proration
      const prorationAmount = this.calculateProration(
        currentPlan,
        newPlan,
        new Date(currentSub.current_period_start),
        new Date(currentSub.current_period_end)
      );

      let updateResult;

      switch (currentSub.provider) {
        case 'stripe':
          if (!newPlan.stripePriceId) {
            return { success: false, error: 'Stripe price not configured for new plan' };
          }

          updateResult = await stripeService.updateSubscription(
            currentSub.provider_subscription_id,
            {
              priceId: newPlan.stripePriceId,
              prorationBehavior: options.prorationBehavior || 'create_prorations',
              metadata: { upgraded_to: options.newPlanId }
            }
          );
          break;

        case 'paypal':
          // PayPal doesn't support plan changes - need to cancel and recreate
          return { success: false, error: 'Plan changes not supported for PayPal subscriptions' };

        default:
          return { success: false, error: 'Unsupported payment provider' };
      }

      if (!updateResult?.success) {
        return { success: false, error: updateResult?.error || 'Failed to update subscription' };
      }

      // Update subscription in database
      const { error: dbUpdateError } = await supabase
        .from('subscription')
        .update({
          plan_id: options.newPlanId,
          amount: newPlan.price,
          updated_at: new Date().toISOString()
        })
        .eq('id', options.subscriptionId);

      if (dbUpdateError) {
        console.error('Error updating subscription in database:', dbUpdateError);
        return { success: false, error: 'Failed to update subscription record' };
      }

      const upgrade: SubscriptionUpgrade = {
        fromPlan: currentPlan.id,
        toPlan: newPlan.id,
        prorationAmount,
        effectiveDate: options.effectiveDate || new Date(),
        reason: 'user_upgrade'
      };

      // Log upgrade event
      await this.logSubscriptionEvent(options.subscriptionId, 'upgraded', {
        from_plan: currentPlan.id,
        to_plan: newPlan.id,
        proration_amount: prorationAmount
      });

      return { success: true, upgrade };

    } catch (error) {
      console.error('Error upgrading subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async pauseSubscription(subscriptionId: string, options?: {
    pauseUntil?: Date;
    reason?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const { data: subscription, error: subError } = await supabase
        .from('subscription')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (subError || !subscription) {
        return { success: false, error: 'Subscription not found' };
      }

      let pauseResult;

      switch (subscription.provider) {
        case 'stripe':
          pauseResult = await stripeService.pauseSubscription(subscription.provider_subscription_id);
          break;

        case 'paypal':
          pauseResult = await paypalService.suspendSubscription(
            subscription.provider_subscription_id,
            options?.reason || 'User requested pause'
          );
          break;

        default:
          return { success: false, error: 'Unsupported payment provider' };
      }

      if (!pauseResult.success) {
        return { success: false, error: pauseResult.error };
      }

      // Update subscription status
      const { error: dbError } = await supabase
        .from('subscription')
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
          pause_until: options?.pauseUntil?.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (dbError) {
        console.error('Error updating paused subscription:', dbError);
        return { success: false, error: 'Failed to update subscription status' };
      }

      // Log pause event
      await this.logSubscriptionEvent(subscriptionId, 'paused', {
        reason: options?.reason,
        pause_until: options?.pauseUntil?.toISOString()
      });

      return { success: true };

    } catch (error) {
      console.error('Error pausing subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const { data: subscription, error: subError } = await supabase
        .from('subscription')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (subError || !subscription) {
        return { success: false, error: 'Subscription not found' };
      }

      let resumeResult;

      switch (subscription.provider) {
        case 'stripe':
          resumeResult = await stripeService.resumeSubscription(subscription.provider_subscription_id);
          break;

        case 'paypal':
          resumeResult = await paypalService.activateSubscription(
            subscription.provider_subscription_id,
            'User requested resume'
          );
          break;

        default:
          return { success: false, error: 'Unsupported payment provider' };
      }

      if (!resumeResult.success) {
        return { success: false, error: resumeResult.error };
      }

      // Update subscription status
      const { error: dbError } = await supabase
        .from('subscription')
        .update({
          status: 'active',
          paused_at: null,
          pause_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (dbError) {
        console.error('Error updating resumed subscription:', dbError);
        return { success: false, error: 'Failed to update subscription status' };
      }

      // Log resume event
      await this.logSubscriptionEvent(subscriptionId, 'resumed', {});

      return { success: true };

    } catch (error) {
      console.error('Error resuming subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async extendTrial(options: {
    subscriptionId: string;
    extensionDays: number;
    reason: string;
  }): Promise<{
    success: boolean;
    extension?: TrialExtension;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      const { data: subscription, error: subError } = await supabase
        .from('subscription')
        .select('*')
        .eq('id', options.subscriptionId)
        .single();

      if (subError || !subscription) {
        return { success: false, error: 'Subscription not found' };
      }

      if (!subscription.trial_end) {
        return { success: false, error: 'Subscription is not in trial period' };
      }

      const currentTrialEnd = new Date(subscription.trial_end);
      const newTrialEnd = new Date(currentTrialEnd);
      newTrialEnd.setDate(newTrialEnd.getDate() + options.extensionDays);

      let extendResult;

      switch (subscription.provider) {
        case 'stripe':
          extendResult = await stripeService.extendTrial(
            subscription.provider_subscription_id,
            newTrialEnd
          );
          break;

        case 'paypal':
          // PayPal doesn't support trial extensions after subscription creation
          return { success: false, error: 'Trial extensions not supported for PayPal subscriptions' };

        default:
          return { success: false, error: 'Unsupported payment provider' };
      }

      if (!extendResult.success) {
        return { success: false, error: extendResult.error };
      }

      // Update subscription in database
      const { error: dbError } = await supabase
        .from('subscription')
        .update({
          trial_end: newTrialEnd.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', options.subscriptionId);

      if (dbError) {
        console.error('Error updating trial extension:', dbError);
        return { success: false, error: 'Failed to update subscription record' };
      }

      const extension: TrialExtension = {
        subscriptionId: options.subscriptionId,
        currentTrialEnd,
        newTrialEnd,
        extensionDays: options.extensionDays,
        reason: options.reason
      };

      // Log trial extension
      await this.logSubscriptionEvent(options.subscriptionId, 'trial_extended', {
        extension_days: options.extensionDays,
        new_trial_end: newTrialEnd.toISOString(),
        reason: options.reason
      });

      return { success: true, extension };

    } catch (error) {
      console.error('Error extending trial:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async cancelSubscription(subscriptionId: string, options?: {
    immediately?: boolean;
    reason?: string;
    feedback?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const { data: subscription, error: subError } = await supabase
        .from('subscription')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (subError || !subscription) {
        return { success: false, error: 'Subscription not found' };
      }

      let cancelResult;

      switch (subscription.provider) {
        case 'stripe':
          cancelResult = await stripeService.cancelSubscription(
            subscription.provider_subscription_id,
            {
              immediately: options?.immediately,
              cancellationReason: options?.reason
            }
          );
          break;

        case 'paypal':
          cancelResult = await paypalService.cancelSubscription(
            subscription.provider_subscription_id,
            options?.reason || 'User requested cancellation'
          );
          break;

        default:
          return { success: false, error: 'Unsupported payment provider' };
      }

      if (!cancelResult.success) {
        return { success: false, error: cancelResult.error };
      }

      // Update subscription status
      const updateData: any = {
        status: options?.immediately ? 'cancelled' : 'cancel_at_period_end',
        cancel_at_period_end: !options?.immediately,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: options?.reason,
        updated_at: new Date().toISOString()
      };

      if (options?.immediately) {
        updateData.ended_at = new Date().toISOString();
      }

      const { error: dbError } = await supabase
        .from('subscription')
        .update(updateData)
        .eq('id', subscriptionId);

      if (dbError) {
        console.error('Error updating cancelled subscription:', dbError);
        return { success: false, error: 'Failed to update subscription status' };
      }

      // Store cancellation feedback
      if (options?.feedback) {
        await supabase
          .from('cancellation_feedback')
          .insert({
            subscription_id: subscriptionId,
            tenant_id: subscription.tenant_id,
            reason: options.reason,
            feedback: options.feedback,
            created_at: new Date().toISOString()
          });
      }

      // Log cancellation event
      await this.logSubscriptionEvent(subscriptionId, 'cancelled', {
        immediately: options?.immediately,
        reason: options?.reason,
        has_feedback: !!options?.feedback
      });

      return { success: true };

    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const { data: subscription, error: subError } = await supabase
        .from('subscription')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (subError || !subscription) {
        return { success: false, error: 'Subscription not found' };
      }

      if (!subscription.cancel_at_period_end) {
        return { success: false, error: 'Subscription is not scheduled for cancellation' };
      }

      let reactivateResult;

      switch (subscription.provider) {
        case 'stripe':
          reactivateResult = await stripeService.reactivateSubscription(
            subscription.provider_subscription_id
          );
          break;

        case 'paypal':
          // PayPal doesn't support reactivation - need to create new subscription
          return { success: false, error: 'Reactivation not supported for PayPal subscriptions' };

        default:
          return { success: false, error: 'Unsupported payment provider' };
      }

      if (!reactivateResult.success) {
        return { success: false, error: reactivateResult.error };
      }

      // Update subscription status
      const { error: dbError } = await supabase
        .from('subscription')
        .update({
          status: 'active',
          cancel_at_period_end: false,
          cancelled_at: null,
          cancellation_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (dbError) {
        console.error('Error updating reactivated subscription:', dbError);
        return { success: false, error: 'Failed to update subscription status' };
      }

      // Log reactivation event
      await this.logSubscriptionEvent(subscriptionId, 'reactivated', {});

      return { success: true };

    } catch (error) {
      console.error('Error reactivating subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  getPlan(planId: string): SubscriptionPlan | undefined {
    return this.SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
  }

  getAllPlans(): SubscriptionPlan[] {
    return this.SUBSCRIPTION_PLANS;
  }

  private calculateProration(
    currentPlan: SubscriptionPlan,
    newPlan: SubscriptionPlan,
    periodStart: Date,
    periodEnd: Date
  ): number {
    const now = new Date();
    const totalPeriodMs = periodEnd.getTime() - periodStart.getTime();
    const remainingPeriodMs = periodEnd.getTime() - now.getTime();
    const remainingRatio = remainingPeriodMs / totalPeriodMs;

    // Calculate unused credit from current plan
    const unusedCredit = currentPlan.price * remainingRatio;

    // Calculate prorated charge for new plan
    const newPlanCharge = newPlan.price * remainingRatio;

    return newPlanCharge - unusedCredit;
  }

  private async logSubscriptionEvent(
    subscriptionId: string,
    eventType: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      const supabase = createClient();

      await supabase
        .from('subscription_events')
        .insert({
          subscription_id: subscriptionId,
          event_type: eventType,
          event_data: data,
          created_at: new Date().toISOString()
        });

    } catch (error) {
      console.error('Error logging subscription event:', error);
      // Don't throw - event logging shouldn't break main operations
    }
  }
}

export const subscriptionLifecycleService = new SubscriptionLifecycleService();