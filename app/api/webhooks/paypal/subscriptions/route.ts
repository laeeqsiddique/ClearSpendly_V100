import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/webhooks/paypal/subscriptions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = Object.fromEntries(request.headers.entries());
    
    console.log('Received PayPal webhook event:', body.event_type, body.id);

    // In production, you should verify the webhook signature
    // For now, we'll process the event directly
    
    const supabase = createClient();

    // Store webhook event for audit and idempotency
    const { error: webhookError } = await supabase
      .from('paypal_webhook_event')
      .upsert({
        paypal_event_id: body.id,
        event_type: body.event_type,
        event_data: body,
        processing_status: 'pending',
        created_at: new Date().toISOString()
      }, {
        onConflict: 'paypal_event_id',
        ignoreDuplicates: true
      });

    if (webhookError) {
      console.error('Error storing webhook event:', webhookError);
    }

    switch (body.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(supabase, body);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(supabase, body);
        break;

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(supabase, body);
        break;

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await handlePaymentFailed(supabase, body);
        break;

      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(supabase, body);
        break;

      default:
        console.log(`Unhandled PayPal event type: ${body.event_type}`);
    }

    // Mark webhook as processed
    await supabase
      .from('paypal_webhook_event')
      .update({
        processing_status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('paypal_event_id', body.id);

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    
    // Mark webhook as failed
    const body = await request.json().catch(() => ({}));
    if (body.id) {
      const supabase = createClient();
      await supabase
        .from('paypal_webhook_event')
        .update({
          processing_status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          processed_at: new Date().toISOString()
        })
        .eq('paypal_event_id', body.id);
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionActivated(supabase: any, event: any) {
  try {
    const subscriptionId = event.resource?.id;
    const customId = event.resource?.custom_id; // This should be the tenant_id
    
    if (!subscriptionId) {
      console.error('No subscription ID found in activation event');
      return;
    }

    // Update subscription status
    const { error } = await supabase
      .from('subscription')
      .update({
        status: 'active',
        paypal_subscriber_id: event.resource?.subscriber?.payer_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('paypal_subscription_id', subscriptionId);

    if (error) {
      console.error('Error activating PayPal subscription:', error);
    } else {
      console.log('PayPal subscription activated:', subscriptionId);
    }

    // If custom_id (tenant_id) is provided, also update by tenant
    if (customId) {
      await supabase
        .from('subscription')
        .update({
          status: 'active',
          paypal_subscription_id: subscriptionId,
          paypal_subscriber_id: event.resource?.subscriber?.payer_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', customId)
        .eq('provider', 'paypal');
    }

  } catch (error) {
    console.error('Error in handleSubscriptionActivated:', error);
  }
}

async function handleSubscriptionCancelled(supabase: any, event: any) {
  try {
    const subscriptionId = event.resource?.id;
    
    if (!subscriptionId) {
      console.error('No subscription ID found in cancellation event');
      return;
    }

    const { error } = await supabase
      .from('subscription')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('paypal_subscription_id', subscriptionId);

    if (error) {
      console.error('Error cancelling PayPal subscription:', error);
    } else {
      console.log('PayPal subscription cancelled:', subscriptionId);
    }

  } catch (error) {
    console.error('Error in handleSubscriptionCancelled:', error);
  }
}

async function handleSubscriptionSuspended(supabase: any, event: any) {
  try {
    const subscriptionId = event.resource?.id;
    
    if (!subscriptionId) {
      console.error('No subscription ID found in suspension event');
      return;
    }

    const { error } = await supabase
      .from('subscription')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('paypal_subscription_id', subscriptionId);

    if (error) {
      console.error('Error suspending PayPal subscription:', error);
    } else {
      console.log('PayPal subscription suspended:', subscriptionId);
    }

  } catch (error) {
    console.error('Error in handleSubscriptionSuspended:', error);
  }
}

async function handlePaymentFailed(supabase: any, event: any) {
  try {
    const subscriptionId = event.resource?.id;
    
    if (!subscriptionId) {
      console.error('No subscription ID found in payment failed event');
      return;
    }

    // Get subscription info
    const { data: subscription, error: subError } = await supabase
      .from('subscription')
      .select('*')
      .eq('paypal_subscription_id', subscriptionId)
      .single();

    if (subError || !subscription) {
      console.error('Subscription not found for PayPal payment failure:', subscriptionId);
      return;
    }

    // Record the failed transaction
    const { error: transactionError } = await supabase
      .from('subscription_transaction')
      .insert({
        subscription_id: subscription.id,
        tenant_id: subscription.tenant_id,
        transaction_type: 'charge',
        amount: subscription.amount,
        currency: subscription.currency,
        status: 'failed',
        provider: 'paypal',
        provider_transaction_id: event.id,
        description: `Failed PayPal payment for ${subscription.billing_cycle} subscription`,
        failure_reason: event.resource?.failure_reason || 'Payment failed',
        metadata: {
          event_id: event.id,
          resource_id: event.resource?.id,
          failure_reason: event.resource?.failure_reason
        }
      });

    if (transactionError) {
      console.error('Error recording PayPal failed transaction:', transactionError);
    }

    // Update subscription status
    await supabase
      .from('subscription')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('paypal_subscription_id', subscriptionId);

  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }
}

async function handlePaymentCompleted(supabase: any, event: any) {
  try {
    const saleId = event.resource?.id;
    const parentPayment = event.resource?.parent_payment;
    
    // For subscription payments, we need to find the related subscription
    // This is tricky with PayPal as the payment event doesn't directly reference the subscription
    
    if (!saleId) {
      console.error('No sale ID found in payment completed event');
      return;
    }

    // Try to find subscription by matching transaction details
    // This is a simplified approach - in production you might want more robust matching
    const { data: subscriptions, error: subError } = await supabase
      .from('subscription')
      .select('*')
      .eq('provider', 'paypal')
      .eq('status', 'active');

    if (subError || !subscriptions) {
      console.error('Error fetching PayPal subscriptions:', subError);
      return;
    }

    // For each active PayPal subscription, record the payment
    // In a real implementation, you'd want better matching logic
    for (const subscription of subscriptions) {
      const { error: transactionError } = await supabase
        .from('subscription_transaction')
        .insert({
          subscription_id: subscription.id,
          tenant_id: subscription.tenant_id,
          transaction_type: 'charge',
          amount: parseFloat(event.resource?.amount?.total || subscription.amount),
          currency: event.resource?.amount?.currency || subscription.currency,
          status: 'succeeded',
          provider: 'paypal',
          provider_transaction_id: saleId,
          description: `PayPal payment for ${subscription.billing_cycle} subscription`,
          metadata: {
            sale_id: saleId,
            parent_payment: parentPayment,
            event_id: event.id
          }
        });

      if (transactionError) {
        console.error('Error recording PayPal payment:', transactionError);
      } else {
        console.log('PayPal payment recorded for subscription:', subscription.id);
        
        // Reset usage for new billing period
        await supabase
          .from('subscription')
          .update({
            usage_counts: {},
            usage_reset_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
      }
    }

  } catch (error) {
    console.error('Error in handlePaymentCompleted:', error);
  }
}