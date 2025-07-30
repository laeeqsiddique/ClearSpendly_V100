import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailService } from '@/lib/email-service';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
}) : null;

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    if (!stripe || !endpointSecret) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = createClient();

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, supabase);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, supabase);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, supabase);
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, supabase: any) {
  try {
    console.log('Processing checkout session completed:', session.id);

    // Get invoice ID from metadata
    const invoiceId = session.metadata?.invoice_id;
    if (!invoiceId) {
      console.error('No invoice_id found in session metadata');
      return;
    }

    // Get payment details
    const amountPaid = (session.amount_total || 0) / 100; // Convert from cents
    const currency = session.currency || 'usd';

    // Fetch invoice with client and business info
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoice')
      .select(`
        *,
        client:client_id (*),
        tenant:tenant_id (*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoiceData) {
      console.error('Error fetching invoice:', invoiceError);
      return;
    }

    // Update invoice with payment information
    const { error: updateError } = await supabase
      .from('invoice')
      .update({
        status: 'paid',
        amount_paid: amountPaid
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      return;
    }

    // Record the payment
    const { error: paymentError } = await supabase
      .from('invoice_payment')
      .insert({
        invoice_id: invoiceId,
        amount: amountPaid,
        payment_method: 'stripe',
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_charge_id: session.latest_charge as string,
        transaction_id: session.id,
        notes: `Payment received via Stripe payment link`
      });

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      // Don't return - continue with other processing
    }

    // Log activity
    const { error: activityError } = await supabase
      .from('invoice_activity')
      .insert({
        invoice_id: invoiceId,
        activity_type: 'paid',
        description: `Payment of ${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amountPaid)} received via Stripe`,
        recipient_email: invoiceData.client.email
      });

    if (activityError) {
      console.error('Error logging activity:', activityError);
    }

    // Send payment confirmation email
    try {
      const businessInfo = {
        name: invoiceData.tenant?.name || "Your Business",
        email: invoiceData.tenant?.email || "",
        phone: invoiceData.tenant?.phone || "",
        website: invoiceData.tenant?.website || ""
      };

      const completeInvoiceData = {
        ...invoiceData,
        business: businessInfo,
        items: [] // We don't need items for payment confirmation
      };

      await emailService.sendPaymentReceivedEmail(completeInvoiceData, amountPaid);
    } catch (emailError) {
      console.error('Error sending payment confirmation email:', emailError);
      // Don't fail the webhook if email fails
    }

    console.log(`Successfully processed payment for invoice ${invoiceData.invoice_number}`);

  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  try {
    console.log('Processing payment intent succeeded:', paymentIntent.id);

    // Get invoice ID from metadata
    const invoiceId = paymentIntent.metadata?.invoice_id;
    if (!invoiceId) {
      console.log('No invoice_id found in payment intent metadata');
      return;
    }

    // Log activity
    const { error: activityError } = await supabase
      .from('invoice_activity')
      .insert({
        invoice_id: invoiceId,
        activity_type: 'payment_processing',
        description: `Payment processing completed for amount ${new Intl.NumberFormat('en-US', { style: 'currency', currency: paymentIntent.currency }).format((paymentIntent.amount || 0) / 100)}`
      });

    if (activityError) {
      console.error('Error logging payment intent activity:', activityError);
    }

  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  try {
    console.log('Processing payment intent failed:', paymentIntent.id);

    // Get invoice ID from metadata
    const invoiceId = paymentIntent.metadata?.invoice_id;
    if (!invoiceId) {
      console.log('No invoice_id found in failed payment intent metadata');
      return;
    }

    // Log activity
    const { error: activityError } = await supabase
      .from('invoice_activity')
      .insert({
        invoice_id: invoiceId,
        activity_type: 'payment_failed',
        description: `Payment attempt failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`
      });

    if (activityError) {
      console.error('Error logging payment failure activity:', activityError);
    }

  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}