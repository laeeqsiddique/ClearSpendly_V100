/**
 * SaaS Subscription Lifecycle Manager
 * 
 * Handles subscription state changes with proper audit trails and expense reconciliation:
 * - Pause/Resume subscriptions with mid-cycle handling
 * - Cancel subscriptions with end-date processing
 * - Prorated charge calculations
 * - Audit trail for compliance and customer support
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface SubscriptionStatusChange {
  subscriptionId: string;
  tenantId: string;
  fromStatus: 'active' | 'paused' | 'cancelled';
  toStatus: 'active' | 'paused' | 'cancelled';
  effectiveDate?: string; // When the change takes effect
  reason?: string;
  userId: string;
}

interface ProrationCalculation {
  originalAmount: number;
  proratedAmount: number;
  daysUsed: number;
  totalDaysInPeriod: number;
  prorationRatio: number;
  reason: 'pause' | 'cancel' | 'resume';
}

export class SubscriptionLifecycleManager {
  private readonly PROCESSOR_VERSION = '1.0.0';

  /**
   * Pause a subscription with proper mid-cycle handling
   */
  async pauseSubscription(params: {
    subscriptionId: string;
    tenantId: string;
    userId: string;
    pauseDate?: string;
    reason?: string;
  }): Promise<{ success: boolean; prorationDetails?: ProrationCalculation; error?: string }> {
    try {
      console.log(`[LifecycleManager] Pausing subscription: ${params.subscriptionId}`);

      // Get current subscription details
      const subscription = await this.getSubscription(params.subscriptionId, params.tenantId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'active') {
        throw new Error(`Cannot pause subscription with status: ${subscription.status}`);
      }

      const pauseDate = params.pauseDate || new Date().toISOString().split('T')[0];
      
      // Calculate prorated charges if pausing mid-cycle
      const prorationDetails = await this.calculateMidCycleProration(
        subscription,
        pauseDate,
        'pause'
      );

      // Generate final prorated expense if needed
      if (prorationDetails && prorationDetails.proratedAmount > 0) {
        await this.createProratedExpense(subscription, prorationDetails, params.userId);
      }

      // Update subscription status
      const { error: updateError } = await supabase
        .from('expense_subscription')
        .update({
          status: 'paused',
          last_charge_date: pauseDate,
          next_charge_date: null, // Clear next charge date
          notes: `${subscription.notes || ''} | Paused on ${pauseDate}${params.reason ? ': ' + params.reason : ''}`.trim()
        })
        .eq('id', params.subscriptionId)
        .eq('tenant_id', params.tenantId);

      if (updateError) {
        throw new Error('Failed to update subscription status');
      }

      // Create audit event
      await this.createLifecycleEvent({
        subscriptionId: params.subscriptionId,
        tenantId: params.tenantId,
        fromStatus: 'active',
        toStatus: 'paused',
        effectiveDate: pauseDate,
        reason: params.reason,
        userId: params.userId
      });

      console.log(`[LifecycleManager] Successfully paused subscription: ${params.subscriptionId}`);

      return {
        success: true,
        prorationDetails: prorationDetails || undefined
      };

    } catch (error) {
      console.error('[LifecycleManager] Error pausing subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Resume a paused subscription
   */
  async resumeSubscription(params: {
    subscriptionId: string;
    tenantId: string;
    userId: string;
    resumeDate?: string;
    reason?: string;
  }): Promise<{ success: boolean; nextChargeDate?: string; error?: string }> {
    try {
      console.log(`[LifecycleManager] Resuming subscription: ${params.subscriptionId}`);

      const subscription = await this.getSubscription(params.subscriptionId, params.tenantId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'paused') {
        throw new Error(`Cannot resume subscription with status: ${subscription.status}`);
      }

      const resumeDate = params.resumeDate || new Date().toISOString().split('T')[0];
      
      // Calculate next charge date from resume date
      const nextChargeDate = this.calculateNextChargeDate(new Date(resumeDate), subscription.frequency);

      // Update subscription status
      const { error: updateError } = await supabase
        .from('expense_subscription')
        .update({
          status: 'active',
          next_charge_date: nextChargeDate.toISOString().split('T')[0],
          notes: `${subscription.notes || ''} | Resumed on ${resumeDate}${params.reason ? ': ' + params.reason : ''}`.trim()
        })
        .eq('id', params.subscriptionId)
        .eq('tenant_id', params.tenantId);

      if (updateError) {
        throw new Error('Failed to update subscription status');
      }

      // Create audit event
      await this.createLifecycleEvent({
        subscriptionId: params.subscriptionId,
        tenantId: params.tenantId,
        fromStatus: 'paused',
        toStatus: 'active',
        effectiveDate: resumeDate,
        reason: params.reason,
        userId: params.userId
      });

      console.log(`[LifecycleManager] Successfully resumed subscription: ${params.subscriptionId}`);

      return {
        success: true,
        nextChargeDate: nextChargeDate.toISOString().split('T')[0]
      };

    } catch (error) {
      console.error('[LifecycleManager] Error resuming subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cancel a subscription with proper end-date handling
   */
  async cancelSubscription(params: {
    subscriptionId: string;
    tenantId: string;
    userId: string;
    cancellationDate?: string;
    reason?: string;
    immediateCancel?: boolean; // If true, cancels immediately; if false, cancels at end of current period
  }): Promise<{ success: boolean; endDate?: string; prorationDetails?: ProrationCalculation; error?: string }> {
    try {
      console.log(`[LifecycleManager] Cancelling subscription: ${params.subscriptionId}`);

      const subscription = await this.getSubscription(params.subscriptionId, params.tenantId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status === 'cancelled') {
        throw new Error('Subscription is already cancelled');
      }

      const cancellationDate = params.cancellationDate || new Date().toISOString().split('T')[0];
      let endDate = cancellationDate;
      let prorationDetails: ProrationCalculation | undefined;

      if (!params.immediateCancel && subscription.status === 'active') {
        // Cancel at end of current billing period
        if (subscription.next_charge_date) {
          // End date is the day before next charge
          const nextCharge = new Date(subscription.next_charge_date);
          nextCharge.setDate(nextCharge.getDate() - 1);
          endDate = nextCharge.toISOString().split('T')[0];
        } else {
          // Calculate end of current period from last charge date
          const lastCharge = subscription.last_charge_date 
            ? new Date(subscription.last_charge_date)
            : new Date(subscription.start_date);
          const periodEnd = this.calculateNextChargeDate(lastCharge, subscription.frequency);
          periodEnd.setDate(periodEnd.getDate() - 1);
          endDate = periodEnd.toISOString().split('T')[0];
        }
      } else if (params.immediateCancel && subscription.status === 'active') {
        // Calculate prorated refund/final charge for immediate cancellation
        prorationDetails = await this.calculateMidCycleProration(
          subscription,
          cancellationDate,
          'cancel'
        );

        if (prorationDetails && prorationDetails.proratedAmount > 0) {
          await this.createProratedExpense(subscription, prorationDetails, params.userId);
        }
      }

      // Update subscription status
      const { error: updateError } = await supabase
        .from('expense_subscription')
        .update({
          status: 'cancelled',
          end_date: endDate,
          next_charge_date: null, // Clear next charge date
          notes: `${subscription.notes || ''} | Cancelled on ${cancellationDate}${params.reason ? ': ' + params.reason : ''}`.trim()
        })
        .eq('id', params.subscriptionId)
        .eq('tenant_id', params.tenantId);

      if (updateError) {
        throw new Error('Failed to update subscription status');
      }

      // Create audit event
      await this.createLifecycleEvent({
        subscriptionId: params.subscriptionId,
        tenantId: params.tenantId,
        fromStatus: subscription.status,
        toStatus: 'cancelled',
        effectiveDate: cancellationDate,
        reason: params.reason,
        userId: params.userId
      });

      console.log(`[LifecycleManager] Successfully cancelled subscription: ${params.subscriptionId}`);

      return {
        success: true,
        endDate,
        prorationDetails
      };

    } catch (error) {
      console.error('[LifecycleManager] Error cancelling subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get subscription lifecycle events for audit trail
   */
  async getSubscriptionLifecycleEvents(subscriptionId: string, tenantId: string): Promise<Array<{
    id: string;
    eventType: string;
    eventDate: string;
    fromStatus: string;
    toStatus: string;
    reason?: string;
    userName?: string;
    createdAt: string;
  }>> {
    const { data, error } = await supabase
      .from('subscription_processing_event')
      .select(`
        id,
        event_type,
        event_date,
        processing_context,
        created_at
      `)
      .eq('subscription_id', subscriptionId)
      .eq('tenant_id', tenantId)
      .in('event_type', ['subscription_paused', 'subscription_resumed', 'subscription_cancelled'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[LifecycleManager] Error fetching lifecycle events:', error);
      return [];
    }

    return (data || []).map(event => ({
      id: event.id,
      eventType: event.event_type,
      eventDate: event.event_date,
      fromStatus: event.processing_context?.fromStatus || 'unknown',
      toStatus: event.processing_context?.toStatus || 'unknown',
      reason: event.processing_context?.reason,
      userName: event.processing_context?.userName,
      createdAt: event.created_at
    }));
  }

  /**
   * Calculate mid-cycle proration for subscription changes
   */
  private async calculateMidCycleProration(
    subscription: any,
    changeDate: string,
    reason: 'pause' | 'cancel' | 'resume'
  ): Promise<ProrationCalculation | null> {
    // Get the current billing cycle dates
    const lastChargeDate = subscription.last_charge_date 
      ? new Date(subscription.last_charge_date)
      : new Date(subscription.start_date);
    
    const nextChargeDate = subscription.next_charge_date 
      ? new Date(subscription.next_charge_date)
      : this.calculateNextChargeDate(lastChargeDate, subscription.frequency);

    const changeDateObj = new Date(changeDate);
    
    // Only prorate if change is mid-cycle
    if (changeDateObj <= lastChargeDate || changeDateObj >= nextChargeDate) {
      return null;
    }

    // Calculate days used and total days in period
    const totalDaysInPeriod = Math.ceil((nextChargeDate.getTime() - lastChargeDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysUsed = Math.ceil((changeDateObj.getTime() - lastChargeDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const prorationRatio = daysUsed / totalDaysInPeriod;
    const proratedAmount = subscription.amount * prorationRatio;

    return {
      originalAmount: subscription.amount,
      proratedAmount: Math.round(proratedAmount * 100) / 100, // Round to 2 decimal places
      daysUsed,
      totalDaysInPeriod,
      prorationRatio: Math.round(prorationRatio * 10000) / 10000, // Round to 4 decimal places
      reason
    };
  }

  /**
   * Create prorated expense record
   */
  private async createProratedExpense(
    subscription: any,
    prorationDetails: ProrationCalculation,
    userId: string
  ): Promise<void> {
    // Find or create vendor
    const vendorId = await this.findOrCreateVendor(
      subscription.service_name,
      subscription.tenant_id,
      userId
    );

    const expenseRecord = {
      tenant_id: subscription.tenant_id,
      receipt_date: new Date().toISOString().split('T')[0],
      total_amount: prorationDetails.proratedAmount,
      vendor_id: vendorId,
      payment_method: subscription.payment_method || 'credit_card',
      business_purpose: `${subscription.service_name} subscription (${prorationDetails.reason} - prorated)`,
      notes: `Auto-generated prorated charge. ${prorationDetails.daysUsed}/${prorationDetails.totalDaysInPeriod} days used. ${subscription.notes || ''}`.trim(),
      receipt_type: 'manual',
      ocr_status: 'completed',
      source_subscription_id: subscription.id,
      created_by: userId,
      original_file_url: 'system://subscription-prorated' // Required field, use system identifier
    };

    const { error } = await supabase
      .from('receipt')
      .insert(expenseRecord);

    if (error) {
      console.error('[LifecycleManager] Error creating prorated expense:', error);
      throw new Error('Failed to create prorated expense record');
    }
  }

  /**
   * Create lifecycle audit event
   */
  private async createLifecycleEvent(change: SubscriptionStatusChange): Promise<void> {
    const eventDate = change.effectiveDate || new Date().toISOString().split('T')[0];
    const eventType = `subscription_${change.toStatus}`;
    const idempotencyKey = `${change.tenantId}:${change.subscriptionId}:${eventType}:${eventDate}`;

    await supabase
      .from('subscription_processing_event')
      .insert({
        tenant_id: change.tenantId,
        subscription_id: change.subscriptionId,
        event_type: eventType,
        event_date: eventDate,
        idempotency_key: idempotencyKey,
        processor_version: this.PROCESSOR_VERSION,
        processing_context: {
          fromStatus: change.fromStatus,
          toStatus: change.toStatus,
          reason: change.reason,
          userId: change.userId,
          effectiveDate: change.effectiveDate
        }
      });
  }

  /**
   * Get subscription details with tenant isolation
   */
  private async getSubscription(subscriptionId: string, tenantId: string): Promise<any> {
    const { data, error } = await supabase
      .from('expense_subscription')
      .select('*')
      .eq('id', subscriptionId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      console.error('[LifecycleManager] Error fetching subscription:', error);
      return null;
    }

    return data;
  }

  /**
   * Calculate next charge date based on frequency
   */
  private calculateNextChargeDate(fromDate: Date, frequency: string): Date {
    const nextDate = new Date(fromDate);
    
    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return nextDate;
  }

  /**
   * Find or create vendor for subscription expenses
   */
  private async findOrCreateVendor(serviceName: string, tenantId: string, createdBy: string): Promise<string> {
    // First, try to find existing vendor
    const { data: existingVendor } = await supabase
      .from('vendor')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('normalized_name', serviceName.toLowerCase().trim())
      .single();

    if (existingVendor) {
      return existingVendor.id;
    }

    // Create new vendor if not found
    const { data: newVendor, error } = await supabase
      .from('vendor')
      .insert({
        tenant_id: tenantId,
        name: serviceName,
        normalized_name: serviceName.toLowerCase().trim(),
        category: 'subscription_service',
        created_by: createdBy
      })
      .select('id')
      .single();

    if (error) {
      console.error('[LifecycleManager] Error creating vendor:', error);
      throw new Error('Failed to create vendor for subscription');
    }

    return newVendor.id;
  }
}

// Export singleton instance
export const subscriptionLifecycleManager = new SubscriptionLifecycleManager();