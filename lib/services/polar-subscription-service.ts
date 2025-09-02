import { createClient } from '@/lib/supabase/server';
import { 
  polar, 
  PolarPlan, 
  fetchPolarPlans, 
  createPolarCustomer, 
  createCheckoutSession, 
  createPolarSubscription,
  getCustomerSubscriptions,
  cancelSubscription,
  getCustomerPortalUrl,
  POLAR_STATUS_MAP 
} from '@/lib/polar';

export const dynamic = 'force-dynamic';

export interface SubscriptionData {
  id: string;
  tenant_id: string;
  plan_id: string;
  plan_name: string;
  billing_cycle: 'monthly' | 'yearly';
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  amount: number;
  currency: string;
  polar_subscription_id?: string;
  polar_customer_id?: string;
  features: Record<string, any>;
  limits: Record<string, number>;
  usage_counts: Record<string, number>;
}

export interface CreateSubscriptionRequest {
  tenant_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  customer_email: string;
  customer_name?: string;
  trial_mode?: boolean;
}

export interface CheckoutSessionRequest {
  tenant_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  success_url: string;
  cancel_url: string;
  customer_email: string;
  customer_name?: string;
}

export class PolarSubscriptionService {
  private supabaseClient?: any;

  constructor(supabaseClient?: any) {
    supabaseClient = supabaseClient;
  }

  private getSupabase() {
    return supabaseClient || createClient();
  }

  /**
   * Get available plans from database and Polar
   */
  async getPlans(): Promise<PolarPlan[]> {
    try {
      // First try to get plans from database  
      const supabase = this.getSupabase();
      const { data: dbPlans, error } = await supabase
        .from('subscription_plan')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching plans from database:', error);
        return await fetchPolarPlans();
      }

      // Convert database plans to PolarPlan format
      if (dbPlans && dbPlans.length > 0) {
        return dbPlans.map(plan => ({
          id: plan.slug,
          name: plan.name,
          description: plan.description || '',
          monthlyPrice: parseFloat(plan.price_monthly) || 0,
          yearlyPrice: parseFloat(plan.price_yearly) || 0,
          polar_product_id: plan.polar_product_id,
          polar_price_monthly_id: plan.polar_price_monthly_id,
          polar_price_yearly_id: plan.polar_price_yearly_id,
          features: plan.features || {},
          limits: plan.limits || {},
          trial_days: plan.trial_days,
          popular: plan.is_featured
        }));
      }

      // Fallback to Polar API
      return await fetchPolarPlans();
    } catch (error) {
      console.error('Error in getPlans:', error);
      return await fetchPolarPlans();
    }
  }

  /**
   * Sync Polar plans to database
   */
  async syncPlansFromPolar(): Promise<void> {
    try {
      const polarPlans = await fetchPolarPlans();
      const supabase = this.getSupabase();
      
      for (const plan of polarPlans) {
        const { error } = await supabase
          .from('subscription_plan')
          .upsert({
            slug: plan.id,
            name: plan.name,
            description: plan.description,
            price_monthly: plan.monthlyPrice,
            price_yearly: plan.yearlyPrice,
            polar_product_id: plan.polar_product_id,
            polar_price_monthly_id: plan.polar_price_monthly_id,
            polar_price_yearly_id: plan.polar_price_yearly_id,
            features: plan.features,
            limits: plan.limits,
            trial_days: plan.trial_days,
            is_featured: plan.popular || false,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'slug'
          });

        if (error) {
          console.error(`Error syncing plan ${plan.id}:`, error);
        }
      }

      console.log('Successfully synced plans from Polar');
    } catch (error) {
      console.error('Error syncing plans from Polar:', error);
    }
  }

  /**
   * Get tenant's current subscription
   */
  async getTenantSubscription(tenantId: string): Promise<SubscriptionData | null> {
    try {
      const { data, error } = await supabase
        .from('subscription')
        .select(`
          *,
          subscription_plan (
            name,
            features,
            limits
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.log(`No active subscription found for tenant ${tenantId}`);
        return null;
      }

      return {
        id: data.id,
        tenant_id: data.tenant_id,
        plan_id: data.plan_id,
        plan_name: data.subscription_plan?.name || 'Unknown',
        billing_cycle: data.billing_cycle,
        status: data.status,
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        trial_end: data.trial_end,
        amount: parseFloat(data.amount),
        currency: data.currency,
        polar_subscription_id: data.polar_subscription_id,
        polar_customer_id: data.polar_customer_id,
        features: data.subscription_plan?.features || {},
        limits: data.subscription_plan?.limits || {},
        usage_counts: data.usage_counts || {}
      };
    } catch (error) {
      console.error('Error getting tenant subscription:', error);
      return null;
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(request: CheckoutSessionRequest): Promise<{ url: string; checkout_id: string }> {
    try {
      // Get the plan details
      const plans = await this.getPlans();
      const plan = plans.find(p => p.id === request.plan_id);
      
      if (!plan) {
        throw new Error(`Plan ${request.plan_id} not found`);
      }

      // Create or get Polar customer
      let polarCustomer;
      
      // Check if customer already exists
      const { data: existingTenant } = await supabase
        .from('tenant')
        .select('polar_customer_id')
        .eq('id', request.tenant_id)
        .single();

      if (existingTenant?.polar_customer_id) {
        polarCustomer = { id: existingTenant.polar_customer_id };
      } else {
        polarCustomer = await createPolarCustomer(
          request.customer_email,
          request.customer_name
        );

        // Update tenant with customer ID
        await supabase
          .from('tenant')
          .update({ 
            polar_customer_id: polarCustomer.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', request.tenant_id);
      }

      // Determine price ID based on billing cycle
      const priceId = request.billing_cycle === 'yearly' 
        ? plan.polar_price_yearly_id 
        : plan.polar_price_monthly_id;

      if (!priceId) {
        throw new Error(`No price ID found for plan ${plan.name} (${request.billing_cycle})`);
      }

      // Create checkout session
      const checkout = await createCheckoutSession(
        polarCustomer.id,
        priceId,
        request.success_url,
        request.cancel_url,
        {
          tenant_id: request.tenant_id,
          plan_id: request.plan_id,
          billing_cycle: request.billing_cycle
        }
      );

      return {
        url: checkout.url,
        checkout_id: checkout.id
      };

    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Create subscription directly (for trial mode)
   */
  async createTrialSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionData> {
    try {
      // Verify tenant ownership first
      const supabase = this.getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required for trial creation');
      }

      // Verify user has ownership access to this tenant
      const { data: membership, error: membershipError } = await supabase
        .from('membership')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', request.tenant_id)
        .eq('role', 'owner')
        .single();

      if (membershipError || !membership) {
        throw new Error('Access denied. Only tenant owners can start trials.');
      }

      // Check for existing active subscriptions
      const { data: existingSubs, error: checkError } = await supabase
        .from('subscription')
        .select('id, status, plan_id')
        .eq('tenant_id', request.tenant_id)
        .in('status', ['active', 'trialing'])
        .limit(1);

      if (checkError) {
        console.error('Error checking existing subscriptions:', checkError);
      } else if (existingSubs && existingSubs.length > 0) {
        const existing = existingSubs[0];
        if (existing.status === 'trialing') {
          throw new Error('A trial is already active for this organization');
        }
        if (existing.status === 'active') {
          throw new Error('An active subscription already exists for this organization');
        }
      }

      const plans = await this.getPlans();
      const plan = plans.find(p => p.id === request.plan_id);
      
      if (!plan) {
        throw new Error(`Plan ${request.plan_id} not found`);
      }

      // Ensure plan supports trials
      if (!plan.trial_days || plan.trial_days <= 0) {
        throw new Error(`Plan ${plan.name} does not support trials`);
      }

      // Calculate trial end date
      const trialDays = plan.trial_days;
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + trialDays);

      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date(trialEnd);

      // Get plan record ID for foreign key
      const { data: planRecord, error: planError } = await supabase
        .from('subscription_plan')
        .select('id')
        .eq('slug', plan.id)
        .single();

      if (planError || !planRecord) {
        throw new Error(`Plan record not found for ${plan.id}`);
      }

      // Create subscription in database with proper multi-tenant isolation
      const { data: subscription, error } = await supabase
        .from('subscription')
        .insert({
          tenant_id: request.tenant_id,
          plan_id: planRecord.id,
          billing_cycle: request.billing_cycle,
          status: 'trialing',
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          trial_end: trialEnd.toISOString(),
          amount: 0, // Trial is free
          currency: 'USD',
          provider: 'polar',
          usage_counts: {},
          metadata: {
            trial_started_by: user.id,
            trial_start_reason: 'onboarding',
            original_plan: plan.id
          }
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create trial subscription: ${error.message}`);
      }

      // Log subscription event
      try {
        await supabase
          .from('subscription_event')
          .insert({
            subscription_id: subscription.id,
            tenant_id: request.tenant_id,
            event_type: 'trial_started',
            event_source: 'onboarding',
            new_status: 'trialing',
            event_data: {
              plan_id: plan.id,
              trial_days: trialDays,
              trial_end: trialEnd.toISOString(),
              billing_cycle: request.billing_cycle
            },
            triggered_by: user.id
          });
      } catch (eventError) {
        console.warn('Failed to log trial start event:', eventError);
      }

      // Initialize usage quotas based on plan limits
      if (plan.limits && typeof plan.limits === 'object') {
        const quotaPromises = Object.entries(plan.limits).map(([quotaType, limit]) => {
          const quotaEnd = new Date(currentPeriodEnd);
          
          return supabase
            .from('usage_quota')
            .insert({
              tenant_id: request.tenant_id,
              subscription_id: subscription.id,
              quota_type: quotaType,
              quota_limit: limit as number,
              quota_used: 0,
              quota_period: 'monthly',
              period_start: currentPeriodStart.toISOString(),
              period_end: quotaEnd.toISOString(),
              reset_frequency: 'monthly',
              metadata: {
                trial: true,
                plan_slug: plan.id
              }
            })
            .select()
            .single();
        });

        try {
          await Promise.all(quotaPromises);
        } catch (quotaError) {
          console.warn('Failed to initialize some usage quotas:', quotaError);
        }
      }

      return {
        id: subscription.id,
        tenant_id: subscription.tenant_id,
        plan_id: plan.id,
        plan_name: plan.name,
        billing_cycle: subscription.billing_cycle,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        trial_end: subscription.trial_end,
        amount: parseFloat(subscription.amount),
        currency: subscription.currency,
        features: plan.features,
        limits: plan.limits,
        usage_counts: subscription.usage_counts || {}
      };
    } catch (error) {
      console.error('Error creating trial subscription:', error);
      throw error;
    }
  }

  /**
   * Handle successful checkout completion
   */
  async handleCheckoutSuccess(polarSubscriptionId: string, tenantId: string): Promise<void> {
    try {
      // Get subscription details from Polar
      const polarSubscription = await polar.subscriptions.get({
        id: polarSubscriptionId
      });

      if (!polarSubscription.data) {
        throw new Error('Subscription not found in Polar');
      }

      const sub = polarSubscription.data;

      // Update or create subscription in database
      const { error } = await supabase
        .from('subscription')
        .upsert({
          tenant_id: tenantId,
          polar_subscription_id: sub.id,
          polar_customer_id: sub.customer_id,
          status: POLAR_STATUS_MAP[sub.status as keyof typeof POLAR_STATUS_MAP] || 'active',
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          amount: sub.price_amount / 100, // Convert from cents
          currency: sub.price_currency || 'USD',
          provider: 'polar',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id'
        });

      if (error) {
        throw new Error(`Failed to update subscription: ${error.message}`);
      }

      console.log(`Successfully processed checkout for tenant ${tenantId}`);
    } catch (error) {
      console.error('Error handling checkout success:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(tenantId: string, cancelAtPeriodEnd: boolean = true): Promise<void> {
    try {
      // Get current subscription
      const subscription = await this.getTenantSubscription(tenantId);
      
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      if (subscription.polar_subscription_id) {
        // Cancel in Polar
        await cancelSubscription(subscription.polar_subscription_id);
      }

      // Update subscription in database
      const updates: any = {
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString()
      };

      if (!cancelAtPeriodEnd) {
        updates.status = 'cancelled';
        updates.cancelled_at = new Date().toISOString();
        updates.ended_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('subscription')
        .update(updates)
        .eq('id', subscription.id);

      if (error) {
        throw new Error(`Failed to cancel subscription: ${error.message}`);
      }

      console.log(`Successfully cancelled subscription for tenant ${tenantId}`);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Get customer portal URL
   */
  async getCustomerPortalUrl(tenantId: string): Promise<string | null> {
    try {
      const subscription = await this.getTenantSubscription(tenantId);
      
      if (!subscription?.polar_customer_id) {
        return null;
      }

      const portalUrl = await getCustomerPortalUrl(subscription.polar_customer_id);
      return portalUrl || null;
    } catch (error) {
      console.error('Error getting customer portal URL:', error);
      return null;
    }
  }

  /**
   * Check if feature is enabled for tenant
   */
  async isFeatureEnabled(tenantId: string, featureKey: string): Promise<boolean> {
    try {
      // Check for explicit feature flag override
      const { data: featureFlag } = await supabase
        .from('feature_flag')
        .select('is_enabled, enabled_until')
        .eq('tenant_id', tenantId)
        .eq('feature_key', featureKey)
        .single();

      if (featureFlag) {
        // Check if override is still valid
        if (!featureFlag.enabled_until || new Date(featureFlag.enabled_until) > new Date()) {
          return featureFlag.is_enabled;
        }
      }

      // Check subscription plan features
      const subscription = await this.getTenantSubscription(tenantId);
      
      if (!subscription) {
        return false; // No subscription = no features
      }

      return subscription.features[featureKey] === true || 
             subscription.features[featureKey] === 'basic' ||
             subscription.features[featureKey] === 'advanced' ||
             subscription.features[featureKey] === 'premium';
    } catch (error) {
      console.error('Error checking feature status:', error);
      return false;
    }
  }

  /**
   * Get usage limits for tenant
   */
  async getTenantLimits(tenantId: string): Promise<Record<string, number>> {
    try {
      const subscription = await this.getTenantSubscription(tenantId);
      
      if (!subscription) {
        // Return free tier limits as fallback
        return {
          receipts_per_month: 10,
          invoices_per_month: 2,
          storage_mb: 100,
          users_max: 1
        };
      }

      return subscription.limits;
    } catch (error) {
      console.error('Error getting tenant limits:', error);
      return {};
    }
  }

  /**
   * Check if usage limit is exceeded
   */
  async checkUsageLimit(tenantId: string, usageType: string, increment: number = 1): Promise<boolean> {
    try {
      const limits = await this.getTenantLimits(tenantId);
      const limit = limits[usageType];
      
      // -1 means unlimited
      if (limit === -1) {
        return false;
      }

      const subscription = await this.getTenantSubscription(tenantId);
      if (!subscription) {
        return true; // No subscription = limit exceeded
      }

      const currentUsage = subscription.usage_counts[usageType] || 0;
      return (currentUsage + increment) > limit;
    } catch (error) {
      console.error('Error checking usage limit:', error);
      return true; // Fail safe - assume limit exceeded
    }
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(tenantId: string, usageType: string, increment: number = 1): Promise<boolean> {
    try {
      // Check if increment would exceed limit
      const wouldExceed = await this.checkUsageLimit(tenantId, usageType, increment);
      
      if (wouldExceed) {
        return false;
      }

      // Get current subscription
      const subscription = await this.getTenantSubscription(tenantId);
      
      if (!subscription) {
        return false;
      }

      const currentUsage = subscription.usage_counts[usageType] || 0;
      const newUsage = currentUsage + increment;

      // Update usage counter
      const { error } = await supabase
        .from('subscription')
        .update({
          usage_counts: {
            ...subscription.usage_counts,
            [usageType]: newUsage
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (error) {
        console.error('Error incrementing usage:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in incrementUsage:', error);
      return false;
    }
  }

  /**
   * Check trial status for tenant
   */
  async getTrialStatus(tenantId: string): Promise<{
    isTrial: boolean;
    trialEnd: string | null;
    daysRemaining: number;
    hasExpired: boolean;
    canConvert: boolean;
  }> {
    try {
      const subscription = await this.getTenantSubscription(tenantId);
      
      if (!subscription) {
        return {
          isTrial: false,
          trialEnd: null,
          daysRemaining: 0,
          hasExpired: true,
          canConvert: false
        };
      }

      const isTrial = subscription.status === 'trialing' && subscription.trial_end;
      const trialEnd = subscription.trial_end;
      const now = new Date();
      const endDate = trialEnd ? new Date(trialEnd) : now;
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const hasExpired = isTrial && endDate <= now;
      const canConvert = isTrial && !hasExpired;

      return {
        isTrial,
        trialEnd,
        daysRemaining,
        hasExpired,
        canConvert
      };
    } catch (error) {
      console.error('Error checking trial status:', error);
      return {
        isTrial: false,
        trialEnd: null,
        daysRemaining: 0,
        hasExpired: true,
        canConvert: false
      };
    }
  }

  /**
   * Convert trial to paid subscription
   */
  async convertTrialToPaid(request: CheckoutSessionRequest): Promise<{ url: string; checkout_id: string }> {
    try {
      // Verify tenant has an active trial
      const trialStatus = await this.getTrialStatus(request.tenant_id);
      
      if (!trialStatus.isTrial) {
        throw new Error('No active trial found for this organization');
      }

      if (trialStatus.hasExpired) {
        throw new Error('Trial has expired. Please contact support.');
      }

      if (!trialStatus.canConvert) {
        throw new Error('Trial cannot be converted at this time');
      }

      // Verify user ownership
      const supabase = this.getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      const { data: membership, error: membershipError } = await supabase
        .from('membership')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', request.tenant_id)
        .eq('role', 'owner')
        .single();

      if (membershipError || !membership) {
        throw new Error('Access denied. Only tenant owners can convert trials.');
      }

      // Create checkout session with special trial conversion metadata
      const checkout = await this.createCheckoutSession({
        ...request,
        success_url: request.success_url + '?converted=true',
        cancel_url: request.cancel_url + '?conversion_cancelled=true'
      });

      // Log conversion attempt
      try {
        const { data: subscription } = await supabase
          .from('subscription')
          .select('id')
          .eq('tenant_id', request.tenant_id)
          .eq('status', 'trialing')
          .single();

        if (subscription) {
          await supabase
            .from('subscription_event')
            .insert({
              subscription_id: subscription.id,
              tenant_id: request.tenant_id,
              event_type: 'conversion_started',
              event_source: 'dashboard',
              event_data: {
                checkout_id: checkout.checkout_id,
                plan_id: request.plan_id,
                billing_cycle: request.billing_cycle,
                days_remaining: trialStatus.daysRemaining
              },
              triggered_by: user.id
            });
        }
      } catch (eventError) {
        console.warn('Failed to log conversion start event:', eventError);
      }

      return checkout;
    } catch (error) {
      console.error('Error converting trial to paid:', error);
      throw error;
    }
  }

  /**
   * Get subscription analytics for tenant
   */
  async getSubscriptionAnalytics(tenantId: string): Promise<{
    currentPlan: string;
    status: string;
    trialInfo: any;
    usageData: Record<string, any>;
    billingHistory: any[];
    nextBillingDate: string | null;
    totalSpent: number;
  }> {
    try {
      const subscription = await this.getTenantSubscription(tenantId);
      const trialStatus = await this.getTrialStatus(tenantId);

      if (!subscription) {
        return {
          currentPlan: 'free',
          status: 'none',
          trialInfo: trialStatus,
          usageData: {},
          billingHistory: [],
          nextBillingDate: null,
          totalSpent: 0
        };
      }

      // Get usage data with limits
      const usageData = {
        limits: subscription.limits,
        current: subscription.usage_counts,
        percentUsed: {}
      };

      // Calculate usage percentages
      Object.entries(subscription.limits || {}).forEach(([key, limit]) => {
        const used = subscription.usage_counts[key] || 0;
        if (typeof limit === 'number' && limit > 0) {
          usageData.percentUsed[key] = Math.min(100, (used / limit) * 100);
        } else if (limit === -1) {
          usageData.percentUsed[key] = 0; // Unlimited
        }
      });

      // Get billing history
      const { data: billingHistory, error: billingError } = await supabase
        .from('subscription_billing_history')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (billingError) {
        console.warn('Error fetching billing history:', billingError);
      }

      // Calculate total spent
      const totalSpent = (billingHistory || [])
        .filter(bill => bill.status === 'paid')
        .reduce((sum, bill) => sum + parseFloat(bill.amount), 0);

      return {
        currentPlan: subscription.plan_name,
        status: subscription.status,
        trialInfo: trialStatus,
        usageData,
        billingHistory: billingHistory || [],
        nextBillingDate: subscription.current_period_end,
        totalSpent
      };
    } catch (error) {
      console.error('Error getting subscription analytics:', error);
      throw error;
    }
  }

  /**
   * Handle trial expiration
   */
  async handleTrialExpiration(tenantId: string): Promise<void> {
    try {
      const subscription = await this.getTenantSubscription(tenantId);
      
      if (!subscription || subscription.status !== 'trialing') {
        return;
      }

      const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
      const now = new Date();

      if (!trialEnd || trialEnd > now) {
        return; // Trial hasn't expired yet
      }

      // Update subscription status to expired
      const { error } = await supabase
        .from('subscription')
        .update({
          status: 'trial_expired',
          ended_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', subscription.id);

      if (error) {
        throw new Error(`Failed to expire trial: ${error.message}`);
      }

      // Log trial expiration event
      try {
        await supabase
          .from('subscription_event')
          .insert({
            subscription_id: subscription.id,
            tenant_id: tenantId,
            event_type: 'trial_expired',
            event_source: 'system',
            previous_status: 'trialing',
            new_status: 'trial_expired',
            event_data: {
              trial_end: subscription.trial_end,
              expired_at: now.toISOString()
            }
          });
      } catch (eventError) {
        console.warn('Failed to log trial expiration event:', eventError);
      }

      console.log(`Trial expired for tenant ${tenantId}`);
    } catch (error) {
      console.error('Error handling trial expiration:', error);
      throw error;
    }
  }

  /**
   * Get trials expiring soon (for notifications)
   */
  async getTrialsExpiringSoon(days: number = 3): Promise<Array<{
    tenant_id: string;
    subscription_id: string;
    trial_end: string;
    days_remaining: number;
    tenant_name: string;
    owner_email: string;
  }>> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data: expiring, error } = await supabase
        .from('subscription')
        .select(`
          id,
          tenant_id,
          trial_end,
          tenant!inner(name),
          membership!inner(user_id, role, auth.users!inner(email))
        `)
        .eq('status', 'trialing')
        .eq('membership.role', 'owner')
        .lte('trial_end', futureDate.toISOString())
        .gte('trial_end', new Date().toISOString());

      if (error) {
        console.error('Error fetching expiring trials:', error);
        return [];
      }

      return (expiring || []).map(sub => {
        const trialEnd = new Date(sub.trial_end);
        const now = new Date();
        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          tenant_id: sub.tenant_id,
          subscription_id: sub.id,
          trial_end: sub.trial_end,
          days_remaining: daysRemaining,
          tenant_name: sub.tenant.name,
          owner_email: sub.membership.auth.users.email
        };
      });
    } catch (error) {
      console.error('Error getting trials expiring soon:', error);
      return [];
    }
  }
}

// Export both the class and a singleton getter function to avoid cookies context issues  
export const polarSubscriptionService = {
  getTenantSubscription: (tenantId: string) => new PolarSubscriptionService().getTenantSubscription(tenantId),
  getPlans: () => new PolarSubscriptionService().getPlans(),
  createTrialSubscription: (data: any) => new PolarSubscriptionService().createTrialSubscription(data),
  convertTrialToPaid: (data: any) => new PolarSubscriptionService().convertTrialToPaid(data),
  cancelSubscription: (subscriptionId: string) => new PolarSubscriptionService().cancelSubscription(subscriptionId),
  getSubscriptionAnalytics: (tenantId: string) => new PolarSubscriptionService().getSubscriptionAnalytics(tenantId),
  getTrialStatus: (tenantId: string) => new PolarSubscriptionService().getTrialStatus(tenantId),
  processWebhookEvent: (event: any) => new PolarSubscriptionService().processWebhookEvent(event),
  getTrialsExpiringSoon: (days = 3) => new PolarSubscriptionService().getTrialsExpiringSoon(days),
};