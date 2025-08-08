import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

type Subscription = Database['public']['Tables']['subscription']['Row'];
type SubscriptionInsert = Database['public']['Tables']['subscription']['Insert'];
type SubscriptionUpdate = Database['public']['Tables']['subscription']['Update'];
type SubscriptionCharge = Database['public']['Tables']['subscription_charge']['Row'];

export class SubscriptionService {
  private supabase;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  /**
   * Get all subscriptions for a tenant with optional filtering
   */
  async getSubscriptions(
    tenantId: string,
    filters?: {
      status?: string;
      category?: string;
      frequency?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: Subscription[] | null; error: any }> {
    let query = this.supabase
      .from('subscription')
      .select(`
        *,
        vendor:vendor_id (
          id,
          name,
          category,
          website,
          phone
        ),
        subscription_charge (
          id,
          charge_date,
          amount,
          status
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.frequency) {
      query = query.eq('frequency', filters.frequency);
    }
    if (filters?.limit) {
      const offset = filters.offset || 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    return await query;
  }

  /**
   * Get a specific subscription by ID
   */
  async getSubscription(
    subscriptionId: string,
    tenantId: string
  ): Promise<{ data: Subscription | null; error: any }> {
    return await this.supabase
      .from('subscription')
      .select(`
        *,
        vendor:vendor_id (
          id,
          name,
          category,
          website,
          phone,
          email
        ),
        subscription_charge (
          id,
          charge_date,
          amount,
          currency,
          status,
          receipt_id,
          processed_at
        )
      `)
      .eq('id', subscriptionId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();
  }

  /**
   * Create a new subscription
   */
  async createSubscription(
    tenantId: string,
    userId: string,
    subscriptionData: Omit<SubscriptionInsert, 'tenant_id' | 'created_by'>
  ): Promise<{ data: Subscription | null; error: any }> {
    const data: SubscriptionInsert = {
      ...subscriptionData,
      tenant_id: tenantId,
      created_by: userId,
      updated_by: userId,
    };

    const result = await this.supabase
      .from('subscription')
      .insert(data)
      .select()
      .single();

    // Generate initial charges if auto_create_expenses is true
    if (result.data && subscriptionData.auto_create_expenses) {
      await this.generateChargesForSubscription(result.data.id);
    }

    return result;
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(
    subscriptionId: string,
    tenantId: string,
    userId: string,
    updates: Omit<SubscriptionUpdate, 'tenant_id' | 'updated_by'>
  ): Promise<{ data: Subscription | null; error: any }> {
    return await this.supabase
      .from('subscription')
      .update({
        ...updates,
        updated_by: userId,
      })
      .eq('id', subscriptionId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single();
  }

  /**
   * Soft delete a subscription
   */
  async deleteSubscription(
    subscriptionId: string,
    tenantId: string,
    userId: string
  ): Promise<{ data: any; error: any }> {
    // First, cancel pending charges
    await this.supabase
      .from('subscription_charge')
      .update({ status: 'cancelled' })
      .eq('subscription_id', subscriptionId)
      .eq('status', 'pending');

    // Then soft delete the subscription
    return await this.supabase
      .from('subscription')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'cancelled',
        updated_by: userId,
      })
      .eq('id', subscriptionId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('id, name')
      .single();
  }

  /**
   * Get subscription charges with filtering
   */
  async getSubscriptionCharges(
    tenantId: string,
    filters?: {
      subscriptionId?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: SubscriptionCharge[] | null; error: any }> {
    let query = this.supabase
      .from('subscription_charge')
      .select(`
        *,
        subscription:subscription_id (
          id,
          name,
          vendor:vendor_id (
            name
          )
        ),
        receipt:receipt_id (
          id,
          receipt_number
        )
      `)
      .eq('tenant_id', tenantId)
      .order('charge_date', { ascending: false });

    if (filters?.subscriptionId) {
      query = query.eq('subscription_id', filters.subscriptionId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.fromDate) {
      query = query.gte('charge_date', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('charge_date', filters.toDate);
    }
    if (filters?.limit) {
      const offset = filters.offset || 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    return await query;
  }

  /**
   * Process pending subscription charges and create expense entries
   */
  async processSubscriptionCharges(): Promise<{ data: number | null; error: any }> {
    return await this.supabase.rpc('process_subscription_charges');
  }

  /**
   * Generate upcoming charges for active subscriptions
   */
  async generateUpcomingCharges(daysAhead: number = 30): Promise<{ data: number | null; error: any }> {
    return await this.supabase.rpc('generate_upcoming_charges', { days_ahead: daysAhead });
  }

  /**
   * Generate charges for a specific subscription
   */
  async generateChargesForSubscription(subscriptionId: string, daysAhead: number = 30): Promise<void> {
    const { data: subscription, error } = await this.supabase
      .from('subscription')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (error || !subscription) {
      throw new Error(`Failed to fetch subscription: ${error?.message}`);
    }

    const charges = [];
    let chargeDate = new Date(subscription.next_charge_date);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    while (chargeDate <= endDate) {
      // Check if charge already exists
      const { data: existingCharge } = await this.supabase
        .from('subscription_charge')
        .select('id')
        .eq('subscription_id', subscriptionId)
        .eq('charge_date', chargeDate.toISOString().split('T')[0])
        .single();

      if (!existingCharge) {
        charges.push({
          subscription_id: subscriptionId,
          tenant_id: subscription.tenant_id,
          amount: subscription.amount,
          currency: subscription.currency,
          charge_date: chargeDate.toISOString().split('T')[0],
          status: 'pending' as const
        });
      }

      // Calculate next charge date
      chargeDate = this.calculateNextChargeDate(
        chargeDate,
        subscription.frequency,
        subscription.billing_cycle_anchor,
        subscription.custom_frequency_days
      );
    }

    if (charges.length > 0) {
      await this.supabase
        .from('subscription_charge')
        .insert(charges);
    }
  }

  /**
   * Get subscription analytics for a tenant
   */
  async getSubscriptionAnalytics(tenantId: string, periodMonths: number = 12) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - periodMonths);

    // Get subscriptions
    const { data: subscriptions, error: subscriptionsError } = await this.supabase
      .from('subscription')
      .select('id, name, amount, currency, frequency, status, category, created_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (subscriptionsError) {
      return { error: subscriptionsError };
    }

    // Get charges for the period
    const { data: charges, error: chargesError } = await this.supabase
      .from('subscription_charge')
      .select('amount, currency, charge_date, status, subscription_id')
      .eq('tenant_id', tenantId)
      .gte('charge_date', startDate.toISOString().split('T')[0])
      .lte('charge_date', endDate.toISOString().split('T')[0]);

    if (chargesError) {
      return { error: chargesError };
    }

    return {
      data: this.calculateAnalytics(subscriptions || [], charges || [])
    };
  }

  /**
   * Get upcoming charges for a tenant
   */
  async getUpcomingCharges(
    tenantId: string,
    daysAhead: number = 30
  ): Promise<{ data: SubscriptionCharge[] | null; error: any }> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    return await this.supabase
      .from('subscription_charge')
      .select(`
        *,
        subscription:subscription_id (
          id,
          name,
          vendor:vendor_id (
            name
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .gte('charge_date', new Date().toISOString().split('T')[0])
      .lte('charge_date', endDate.toISOString().split('T')[0])
      .order('charge_date', { ascending: true });
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(
    subscriptionId: string,
    tenantId: string,
    userId: string
  ): Promise<{ data: Subscription | null; error: any }> {
    return this.updateSubscription(subscriptionId, tenantId, userId, {
      status: 'paused'
    });
  }

  /**
   * Resume a subscription
   */
  async resumeSubscription(
    subscriptionId: string,
    tenantId: string,
    userId: string
  ): Promise<{ data: Subscription | null; error: any }> {
    return this.updateSubscription(subscriptionId, tenantId, userId, {
      status: 'active'
    });
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    tenantId: string,
    userId: string
  ): Promise<{ data: Subscription | null; error: any }> {
    // Cancel pending charges
    await this.supabase
      .from('subscription_charge')
      .update({ status: 'cancelled' })
      .eq('subscription_id', subscriptionId)
      .eq('status', 'pending');

    return this.updateSubscription(subscriptionId, tenantId, userId, {
      status: 'cancelled',
      end_date: new Date().toISOString().split('T')[0]
    });
  }

  // Private helper methods

  private calculateNextChargeDate(
    currentDate: Date,
    frequency: string,
    billingCycleAnchor: number,
    customFrequencyDays?: number | null
  ): Date {
    const nextDate = new Date(currentDate);

    switch (frequency) {
      case 'weekly':
        nextDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(currentDate.getMonth() + 1);
        nextDate.setDate(billingCycleAnchor);
        break;
      case 'quarterly':
        nextDate.setMonth(currentDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(currentDate.getFullYear() + 1);
        break;
      case 'custom':
        if (customFrequencyDays) {
          nextDate.setDate(currentDate.getDate() + customFrequencyDays);
        }
        break;
    }

    return nextDate;
  }

  private calculateAnalytics(subscriptions: any[], charges: any[]) {
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const totalMonthlyAmount = activeSubscriptions.reduce((sum, sub) => {
      return sum + this.calculateMonthlyAmount(sub.amount, sub.frequency);
    }, 0);

    // Monthly spending from charges
    const monthlySpending = charges.reduce((acc, charge) => {
      const month = charge.charge_date.substring(0, 7);
      if (!acc[month]) acc[month] = 0;
      acc[month] += parseFloat(charge.amount);
      return acc;
    }, {});

    // Category breakdown
    const categoryBreakdown = activeSubscriptions.reduce((acc, sub) => {
      const category = sub.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { count: 0, total_amount: 0, monthly_amount: 0 };
      }
      acc[category].count++;
      acc[category].total_amount += parseFloat(sub.amount);
      acc[category].monthly_amount += this.calculateMonthlyAmount(sub.amount, sub.frequency);
      return acc;
    }, {});

    return {
      summary: {
        total_subscriptions: subscriptions.length,
        active_subscriptions: activeSubscriptions.length,
        total_monthly_amount: Math.round(totalMonthlyAmount * 100) / 100,
        total_yearly_amount: Math.round(totalMonthlyAmount * 12 * 100) / 100,
      },
      monthlySpending,
      categoryBreakdown,
    };
  }

  private calculateMonthlyAmount(amount: number, frequency: string): number {
    const amt = parseFloat(amount.toString());
    
    switch (frequency) {
      case 'monthly': return amt;
      case 'yearly': return amt / 12;
      case 'quarterly': return amt / 3;
      case 'weekly': return amt * 4.33;
      default: return amt;
    }
  }
}