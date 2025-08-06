import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
}) : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// POST /api/webhooks/stripe/subscriptions
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json(
        { error: 'No Stripe signature found' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('Received Stripe webhook event:', event.type, event.id);

    const supabase = createClient();

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(supabase, event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(supabase, event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  try {
    const tenantId = subscription.metadata?.tenant_id;
    if (!tenantId) {
      console.error('No tenant_id found in subscription metadata');
      return;
    }

    // Map Stripe status to our status
    let status = subscription.status;
    if (status === 'incomplete' || status === 'incomplete_expired') {
      status = 'inactive';
    }

    const updateData = {
      status: status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('subscription')
      .update(updateData)
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating subscription:', error);
    } else {
      console.log('Subscription updated successfully:', subscription.id);
    }

  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error);
  }
}

async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  try {
    const { error } = await supabase
      .from('subscription')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error deleting subscription:', error);
    } else {
      console.log('Subscription deleted successfully:', subscription.id);
    }

  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error);
  }
}

async function handlePaymentSucceeded(supabase: any, invoice: Stripe.Invoice) {
  try {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    // Get subscription info
    const { data: subscription, error: subError } = await supabase
      .from('subscription')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (subError || !subscription) {
      console.error('Subscription not found for invoice:', subscriptionId);
      return;
    }

    // Record the transaction
    const { error: transactionError } = await supabase
      .from('subscription_transaction')
      .insert({
        subscription_id: subscription.id,
        tenant_id: subscription.tenant_id,
        transaction_type: 'charge',
        amount: (invoice.amount_paid || 0) / 100, // Convert from cents
        currency: invoice.currency,
        status: 'succeeded',
        provider: 'stripe',
        provider_transaction_id: invoice.charge || invoice.id,
        provider_fee: invoice.application_fee_amount ? invoice.application_fee_amount / 100 : 0,
        billing_period_start: new Date(invoice.period_start * 1000).toISOString(),
        billing_period_end: new Date(invoice.period_end * 1000).toISOString(),
        description: `Payment for ${subscription.billing_cycle} subscription`,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.number,
          hosted_invoice_url: invoice.hosted_invoice_url
        }
      });

    if (transactionError) {
      console.error('Error recording transaction:', transactionError);
    } else {
      console.log('Payment recorded successfully for subscription:', subscriptionId);
    }

    // Reset usage if it's a new billing period
    if (subscription.status === 'active') {
      await supabase
        .from('subscription')
        .update({
          usage_counts: {},
          usage_reset_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
    }

  } catch (error) {
    console.error('Error in handlePaymentSucceeded:', error);
  }
}

async function handlePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  try {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    // Get subscription info
    const { data: subscription, error: subError } = await supabase
      .from('subscription')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (subError || !subscription) {
      console.error('Subscription not found for failed payment:', subscriptionId);
      return;
    }

    // Record the failed transaction
    const { error: transactionError } = await supabase
      .from('subscription_transaction')
      .insert({
        subscription_id: subscription.id,
        tenant_id: subscription.tenant_id,
        transaction_type: 'charge',
        amount: (invoice.amount_due || 0) / 100, // Convert from cents
        currency: invoice.currency,
        status: 'failed',
        provider: 'stripe',
        provider_transaction_id: invoice.id,
        billing_period_start: new Date(invoice.period_start * 1000).toISOString(),
        billing_period_end: new Date(invoice.period_end * 1000).toISOString(),
        description: `Failed payment for ${subscription.billing_cycle} subscription`,
        failure_reason: 'Payment failed - customer may need to update payment method',
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.number,
          hosted_invoice_url: invoice.hosted_invoice_url,
          attempt_count: invoice.attempt_count
        }
      });

    if (transactionError) {
      console.error('Error recording failed transaction:', transactionError);
    } else {
      console.log('Failed payment recorded for subscription:', subscriptionId);
    }

    // Update subscription status to past_due
    await supabase
      .from('subscription')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }
}

async function handleTrialWillEnd(supabase: any, subscription: Stripe.Subscription) {
  try {
    const tenantId = subscription.metadata?.tenant_id;
    if (!tenantId) return;

    // You can implement email notifications here
    console.log(`Trial will end soon for tenant: ${tenantId}`);

    // Optionally update a flag or send notification
    await supabase
      .from('subscription')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

  } catch (error) {
    console.error('Error in handleTrialWillEnd:', error);
  }
}