import { createClient } from '@/lib/supabase/server';
import { stripeService } from '@/lib/stripe-service';
import { paypalService } from '@/lib/paypal-service';
import Stripe from 'stripe';

// Types for subscription management
export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: Record<string, any>;
  limits: Record<string, any>;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  stripe_product_id?: string;
  paypal_plan_id_monthly?: string;
  paypal_plan_id_yearly?: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'unpaid' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  cancel_at_period_end: boolean;
  amount: number;
  currency: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  paypal_subscription_id?: string;
  provider: 'stripe' | 'paypal';
  usage_counts: Record<string, number>;
}

export interface CreateSubscriptionOptions {
  tenantId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  provider: 'stripe' | 'paypal';
  customerEmail: string;
  customerName: string;
  paymentMethodId?: string; // For Stripe
  trialDays?: number;
}

export interface SubscriptionResult {
  success: boolean;
  subscription?: TenantSubscription;
  clientSecret?: string; // For Stripe payment intent
  approvalUrl?: string; // For PayPal approval
  error?: string;
}

export interface UsageCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  isUnlimited: boolean;
  remainingUsage?: number;
}

export class SubscriptionService {
  private stripe: Stripe | null;

  constructor() {
    this.stripe = process.env.STRIPE_SECRET_KEY ? 
      new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-11-20.acacia',
      }) : null;
  }

  // Get all available subscription plans
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    try {
      const supabase = createClient();
      
      const { data: plans, error } = await supabase
        .from('subscription_plan')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching subscription plans:', error);
        return [];
      }

      return plans || [];
    } catch (error) {
      console.error('Error in getAvailablePlans:', error);
      return [];
    }
  }

  // Get current subscription for a tenant
  async getTenantSubscription(tenantId: string): Promise<TenantSubscription | null> {
    try {
      const supabase = createClient();
      
      const { data: subscription, error } = await supabase
        .from('subscription')
        .select(`
          *,
          subscription_plan (
            name,
            slug,
            features,
            limits
          )
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !subscription) {
        return null;
      }

      return subscription;
    } catch (error) {
      console.error('Error getting tenant subscription:', error);
      return null;
    }
  }

  // Create a new subscription with Stripe
  async createStripeSubscription(options: CreateSubscriptionOptions): Promise<SubscriptionResult> {
    try {
      if (!this.stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const { tenantId, planId, billingCycle, customerEmail, customerName, paymentMethodId, trialDays } = options;
      
      // Get subscription plan details
      const supabase = createClient();
      const { data: plan, error: planError } = await supabase
        .from('subscription_plan')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        return { success: false, error: 'Subscription plan not found' };
      }

      const priceId = billingCycle === 'monthly' ? plan.stripe_price_id_monthly : plan.stripe_price_id_yearly;
      if (!priceId) {
        return { success: false, error: 'Stripe price not configured for this plan' };
      }

      // Create or get Stripe customer
      let customer: Stripe.Customer;
      
      // Check if customer already exists
      const existingCustomers = await this.stripe.customers.list({
        email: customerEmail,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await this.stripe.customers.create({
          email: customerEmail,
          name: customerName,
          metadata: {
            tenant_id: tenantId,
            flowvya_customer: 'true'
          }
        });
      }

      // Attach payment method to customer if provided
      if (paymentMethodId) {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id,
        });

        await this.stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      // Create the subscription
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customer.id,
        items: [{ price: priceId }],
        metadata: {
          tenant_id: tenantId,
          plan_id: planId,
          billing_cycle: billingCycle
        },
        expand: ['latest_invoice.payment_intent'],
      };

      // Add trial period if specified
      if (trialDays && trialDays > 0) {
        subscriptionData.trial_period_days = trialDays;
      }

      // If no payment method, require payment later
      if (!paymentMethodId) {
        subscriptionData.payment_behavior = 'default_incomplete';
        subscriptionData.payment_settings = {
          save_default_payment_method: 'on_subscription',
        };
      }

      const stripeSubscription = await this.stripe.subscriptions.create(subscriptionData);

      // Save subscription to database
      const amount = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
      
      const { data: dbSubscription, error: dbError } = await supabase
        .from('subscription')
        .insert({
          tenant_id: tenantId,
          plan_id: planId,
          billing_cycle: billingCycle,
          status: stripeSubscription.status === 'incomplete' ? 'inactive' : 
                  stripeSubscription.status === 'trialing' ? 'trialing' : 'active',
          current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          trial_end: stripeSubscription.trial_end ? 
            new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
          amount: amount,
          currency: 'usd',
          stripe_subscription_id: stripeSubscription.id,
          stripe_customer_id: customer.id,
          provider: 'stripe',
          usage_counts: {}
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error saving subscription to database:', dbError);
        // Try to cancel the Stripe subscription
        await this.stripe.subscriptions.cancel(stripeSubscription.id);
        return { success: false, error: 'Failed to save subscription' };
      }

      const result: SubscriptionResult = {
        success: true,
        subscription: dbSubscription
      };

      // If payment is required, include client secret
      if (stripeSubscription.status === 'incomplete') {
        const latestInvoice = stripeSubscription.latest_invoice as Stripe.Invoice;
        const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;
        if (paymentIntent) {
          result.clientSecret = paymentIntent.client_secret || undefined;
        }
      }

      return result;

    } catch (error) {
      console.error('Error creating Stripe subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Create PayPal subscription
  async createPayPalSubscription(options: CreateSubscriptionOptions): Promise<SubscriptionResult> {
    try {
      const { tenantId, planId, billingCycle, customerEmail, customerName } = options;
      
      // Get subscription plan details
      const supabase = createClient();
      const { data: plan, error: planError } = await supabase
        .from('subscription_plan')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        return { success: false, error: 'Subscription plan not found' };
      }

      const paypalPlanId = billingCycle === 'monthly' ? 
        plan.paypal_plan_id_monthly : plan.paypal_plan_id_yearly;
      
      if (!paypalPlanId) {
        return { success: false, error: 'PayPal plan not configured for this billing cycle' };
      }

      // Create PayPal subscription
      const accessToken = await this.getPayPalAccessToken();
      if (!accessToken) {
        return { success: false, error: 'Failed to get PayPal access token' };
      }

      const subscriptionPayload = {
        plan_id: paypalPlanId,
        subscriber: {
          email_address: customerEmail,
          name: {
            given_name: customerName.split(' ')[0] || customerName,
            surname: customerName.split(' ').slice(1).join(' ') || 'User'
          }
        },
        application_context: {
          brand_name: 'Flowvya',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          },
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?cancelled=true`
        },
        custom_id: tenantId
      };

      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const response = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'PayPal-Request-Id': `${tenantId}-${Date.now()}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(subscriptionPayload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('PayPal subscription creation failed:', errorData);
        return { success: false, error: 'Failed to create PayPal subscription' };
      }

      const paypalSubscription = await response.json();
      
      // Find approval URL
      const approvalLink = paypalSubscription.links?.find((link: any) => link.rel === 'approve');
      if (!approvalLink) {
        return { success: false, error: 'No approval URL found in PayPal response' };
      }

      // Save subscription to database (status will be inactive until approved)
      const amount = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
      
      const { data: dbSubscription, error: dbError } = await supabase
        .from('subscription')
        .insert({
          tenant_id: tenantId,
          plan_id: planId,
          billing_cycle: billingCycle,
          status: 'inactive', // Will be activated via webhook
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (billingCycle === 'monthly' ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000)).toISOString(),
          amount: amount,
          currency: 'usd',
          paypal_subscription_id: paypalSubscription.id,
          provider: 'paypal',
          usage_counts: {}
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error saving PayPal subscription to database:', dbError);
        return { success: false, error: 'Failed to save subscription' };
      }

      return {
        success: true,
        subscription: dbSubscription,
        approvalUrl: approvalLink.href
      };

    } catch (error) {
      console.error('Error creating PayPal subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Cancel subscription
  async cancelSubscription(tenantId: string, cancelAtPeriodEnd: boolean = true): Promise<{ success: boolean; error?: string }> {
    try {
      const subscription = await this.getTenantSubscription(tenantId);
      if (!subscription) {
        return { success: false, error: 'No active subscription found' };
      }

      if (subscription.provider === 'stripe' && subscription.stripe_subscription_id) {
        return await this.cancelStripeSubscription(subscription.stripe_subscription_id, cancelAtPeriodEnd);
      } else if (subscription.provider === 'paypal' && subscription.paypal_subscription_id) {
        return await this.cancelPayPalSubscription(subscription.paypal_subscription_id);
      }

      return { success: false, error: 'Invalid subscription provider' };

    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Cancel Stripe subscription
  private async cancelStripeSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const stripeSubscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd
      });

      // Update database
      const supabase = createClient();
      await supabase
        .from('subscription')
        .update({
          cancel_at_period_end: cancelAtPeriodEnd,
          cancelled_at: cancelAtPeriodEnd ? null : new Date().toISOString(),
          status: cancelAtPeriodEnd ? 'active' : 'cancelled'
        })
        .eq('stripe_subscription_id', subscriptionId);

      return { success: true };

    } catch (error) {
      console.error('Error cancelling Stripe subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Cancel PayPal subscription
  private async cancelPayPalSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = await this.getPayPalAccessToken();
      if (!accessToken) {
        return { success: false, error: 'Failed to get PayPal access token' };
      }

      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const response = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          reason: 'User requested cancellation'
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('PayPal subscription cancellation failed:', errorData);
        return { success: false, error: 'Failed to cancel PayPal subscription' };
      }

      // Update database
      const supabase = createClient();
      await supabase
        .from('subscription')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_at_period_end: false
        })
        .eq('paypal_subscription_id', subscriptionId);

      return { success: true };

    } catch (error) {
      console.error('Error cancelling PayPal subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Check usage limits
  async checkUsageLimit(tenantId: string, usageType: string): Promise<UsageCheckResult> {
    try {
      const supabase = createClient();
      
      // Get tenant's subscription and limits
      const subscription = await this.getTenantSubscription(tenantId);
      if (!subscription) {
        // No subscription - default to free limits
        const freeLimits = { receipts_per_month: 10, invoices_per_month: 2, storage_mb: 100 };
        const limit = freeLimits[usageType as keyof typeof freeLimits] || 0;
        return {
          allowed: false,
          currentUsage: 0,
          limit: limit,
          isUnlimited: false,
          remainingUsage: limit
        };
      }

      // Get limits from subscription plan
      const { data } = await supabase
        .rpc('get_tenant_limits', { tenant_uuid: tenantId });

      const limits = data || {};
      const limit = limits[usageType] || 0;

      // If limit is -1, it's unlimited
      if (limit === -1) {
        return {
          allowed: true,
          currentUsage: 0,
          limit: -1,
          isUnlimited: true
        };
      }

      // Get current usage
      const currentUsage = subscription.usage_counts?.[usageType] || 0;
      const remainingUsage = Math.max(0, limit - currentUsage);

      return {
        allowed: currentUsage < limit,
        currentUsage: currentUsage,
        limit: limit,
        isUnlimited: false,
        remainingUsage: remainingUsage
      };

    } catch (error) {
      console.error('Error checking usage limit:', error);
      return {
        allowed: false,
        currentUsage: 0,
        limit: 0,
        isUnlimited: false
      };
    }
  }

  // Increment usage
  async incrementUsage(tenantId: string, usageType: string, amount: number = 1): Promise<boolean> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .rpc('increment_usage', {
          tenant_uuid: tenantId,
          usage_type: usageType,
          increment_by: amount
        });

      if (error) {
        console.error('Error incrementing usage:', error);
        return false;
      }

      return data === true;

    } catch (error) {
      console.error('Error in incrementUsage:', error);
      return false;
    }
  }

  // Check if feature is enabled
  async isFeatureEnabled(tenantId: string, featureName: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .rpc('is_feature_enabled', {
          tenant_uuid: tenantId,
          feature_name: featureName
        });

      if (error) {
        console.error('Error checking feature:', error);
        return false;
      }

      return data === true;

    } catch (error) {
      console.error('Error in isFeatureEnabled:', error);
      return false;
    }
  }

  // Get PayPal access token
  private async getPayPalAccessToken(): Promise<string | null> {
    try {
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        console.error('PayPal credentials not configured');
        return null;
      }

      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en_US',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        console.error('PayPal token request failed:', response.status);
        return null;
      }

      const data = await response.json();
      return data.access_token;

    } catch (error) {
      console.error('Error getting PayPal access token:', error);
      return null;
    }
  }

  // Upgrade/downgrade subscription
  async changeSubscription(tenantId: string, newPlanId: string): Promise<SubscriptionResult> {
    try {
      const currentSubscription = await this.getTenantSubscription(tenantId);
      if (!currentSubscription) {
        return { success: false, error: 'No active subscription found' };
      }

      const supabase = createClient();
      
      // Get new plan details
      const { data: newPlan, error: planError } = await supabase
        .from('subscription_plan')
        .select('*')
        .eq('id', newPlanId)
        .single();

      if (planError || !newPlan) {
        return { success: false, error: 'New subscription plan not found' };
      }

      if (currentSubscription.provider === 'stripe') {
        return await this.changeStripeSubscription(currentSubscription, newPlan);
      } else if (currentSubscription.provider === 'paypal') {
        return await this.changePayPalSubscription(currentSubscription, newPlan);
      }

      return { success: false, error: 'Invalid subscription provider' };

    } catch (error) {
      console.error('Error changing subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Change Stripe subscription
  private async changeStripeSubscription(currentSubscription: TenantSubscription, newPlan: SubscriptionPlan): Promise<SubscriptionResult> {
    try {
      if (!this.stripe || !currentSubscription.stripe_subscription_id) {
        return { success: false, error: 'Stripe not configured or subscription ID missing' };
      }

      const newPriceId = currentSubscription.billing_cycle === 'monthly' 
        ? newPlan.stripe_price_id_monthly 
        : newPlan.stripe_price_id_yearly;

      if (!newPriceId) {
        return { success: false, error: 'Stripe price not configured for new plan' };
      }

      // Get the current subscription from Stripe
      const stripeSubscription = await this.stripe.subscriptions.retrieve(currentSubscription.stripe_subscription_id);
      
      // Update the subscription
      const updatedSubscription = await this.stripe.subscriptions.update(currentSubscription.stripe_subscription_id, {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: newPriceId,
        }],
        metadata: {
          ...stripeSubscription.metadata,
          plan_id: newPlan.id
        }
      });

      // Update database
      const newAmount = currentSubscription.billing_cycle === 'monthly' 
        ? newPlan.price_monthly 
        : newPlan.price_yearly;

      const supabase = createClient();
      const { data: dbSubscription, error: dbError } = await supabase
        .from('subscription')
        .update({
          plan_id: newPlan.id,
          amount: newAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSubscription.id)
        .select()
        .single();

      if (dbError) {
        console.error('Error updating subscription in database:', dbError);
        return { success: false, error: 'Failed to update subscription' };
      }

      return {
        success: true,
        subscription: dbSubscription
      };

    } catch (error) {
      console.error('Error changing Stripe subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Change PayPal subscription (requires canceling old and creating new)
  private async changePayPalSubscription(currentSubscription: TenantSubscription, newPlan: SubscriptionPlan): Promise<SubscriptionResult> {
    // PayPal doesn't support plan changes directly, so we need to:
    // 1. Cancel the current subscription
    // 2. Create a new subscription with the new plan
    // This is typically handled through the UI by having user subscribe to new plan
    
    return {
      success: false,
      error: 'PayPal plan changes require creating a new subscription. Please cancel current and subscribe to new plan.'
    };
  }
}

// Default subscription service instance
export const subscriptionService = new SubscriptionService();