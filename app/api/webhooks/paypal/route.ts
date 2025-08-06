import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paypalService } from '@/lib/paypal-service';
import { emailService } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers: Record<string, string> = {};
    
    // Extract PayPal headers
    request.headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith('paypal-')) {
        headers[key.toLowerCase()] = value;
      }
    });

    // Verify webhook signature
    const isValidSignature = await paypalService.verifyWebhookSignature(headers, body);
    if (!isValidSignature) {
      console.error('Invalid PayPal webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const webhookEvent = JSON.parse(body);
    console.log('Received PayPal webhook:', {
      eventType: webhookEvent.event_type,
      eventId: webhookEvent.id,
      resourceType: webhookEvent.resource_type
    });

    // Get tenant ID from query params (set during webhook registration)
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant');
    if (!tenantId) {
      console.error('No tenant ID provided in PayPal webhook URL');
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }

    const supabase = createClient();

    // Check for duplicate webhook processing
    const { data: existingEvent, error: duplicateCheckError } = await supabase
      .from('paypal_webhook_event')
      .select('id, processing_status')
      .eq('tenant_id', tenantId)
      .eq('paypal_event_id', webhookEvent.id)
      .single();

    if (existingEvent) {
      if (existingEvent.processing_status === 'processed') {
        console.log('PayPal webhook already processed:', webhookEvent.id);
        return NextResponse.json({ received: true, status: 'already_processed' });
      }
      // If it failed before, we'll retry
    } else {
      // Store webhook event for processing
      const { error: storeError } = await supabase
        .from('paypal_webhook_event')
        .insert({
          tenant_id: tenantId,
          paypal_event_id: webhookEvent.id,
          event_type: webhookEvent.event_type,
          event_data: webhookEvent,
          processing_status: 'pending'
        });

      if (storeError) {
        console.error('Error storing PayPal webhook event:', storeError);
        return NextResponse.json({ error: 'Failed to store webhook event' }, { status: 500 });
      }
    }

    // Process different event types
    let processingResult = { success: false, error: 'Unknown event type' };

    switch (webhookEvent.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        processingResult = await handlePaymentCaptureCompleted(webhookEvent, tenantId, supabase);
        break;
      
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED':
        processingResult = await handlePaymentCaptureFailed(webhookEvent, tenantId, supabase);
        break;
      
      case 'CHECKOUT.ORDER.APPROVED':
        processingResult = await handleOrderApproved(webhookEvent, tenantId, supabase);
        break;
      
      case 'PAYMENT.AUTHORIZATION.CREATED':
        processingResult = await handlePaymentAuthorized(webhookEvent, tenantId, supabase);
        break;
      
      default:
        console.log(`Unhandled PayPal event type: ${webhookEvent.event_type}`);
        processingResult = { success: true, error: null }; // Don't fail for unknown events
    }

    // Update webhook processing status
    const { error: updateError } = await supabase
      .from('paypal_webhook_event')
      .update({
        processing_status: processingResult.success ? 'processed' : 'failed',
        processed_at: processingResult.success ? new Date().toISOString() : null,
        error_message: processingResult.error,
        retry_count: existingEvent ? (existingEvent.retry_count || 0) + 1 : 1
      })
      .eq('tenant_id', tenantId)
      .eq('paypal_event_id', webhookEvent.id);

    if (updateError) {
      console.error('Error updating webhook processing status:', updateError);
    }

    if (!processingResult.success) {
      console.error('PayPal webhook processing failed:', processingResult.error);
      return NextResponse.json({ 
        error: 'Webhook processing failed',
        details: processingResult.error 
      }, { status: 500 });
    }

    return NextResponse.json({ received: true, status: 'processed' });

  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handlePaymentCaptureCompleted(webhookEvent: any, tenantId: string, supabase: any) {
  try {
    const resource = webhookEvent.resource;
    const orderId = resource.supplementary_data?.related_ids?.order_id;
    const captureId = resource.id;
    const amount = parseFloat(resource.amount?.value || '0');
    const currency = resource.amount?.currency_code || 'USD';
    const customId = resource.custom_id; // This should be our invoice ID

    console.log('Processing PayPal payment capture:', {
      orderId,
      captureId,
      amount,
      currency,
      customId
    });

    if (!customId) {
      return { success: false, error: 'No custom_id (invoice ID) found in capture data' };
    }

    // Find the invoice by ID and verify it belongs to this tenant
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoice')
      .select(`
        *,
        client:client_id (*),
        tenant:tenant_id (*)
      `)
      .eq('id', customId)
      .eq('tenant_id', tenantId)
      .single();

    if (invoiceError || !invoiceData) {
      console.error('Invoice not found or access denied:', invoiceError);
      return { success: false, error: 'Invoice not found or access denied' };
    }

    // Check if payment already recorded
    const { data: existingPayment } = await supabase
      .from('invoice_payment')
      .select('id')
      .eq('paypal_capture_id', captureId)
      .single();

    if (existingPayment) {
      console.log('Payment already recorded for capture:', captureId);
      return { success: true, error: null };
    }

    // Update invoice status
    const { error: updateInvoiceError } = await supabase
      .from('invoice')
      .update({
        paypal_order_id: orderId,
        status: 'paid',
        amount_paid: amount,
        payment_method: 'paypal'
      })
      .eq('id', customId);

    if (updateInvoiceError) {
      console.error('Error updating invoice:', updateInvoiceError);
      return { success: false, error: 'Failed to update invoice status' };
    }

    // Record the payment
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('invoice_payment')
      .insert({
        invoice_id: customId,
        amount: amount,
        payment_method: 'paypal',
        paypal_order_id: orderId,
        paypal_capture_id: captureId,
        paypal_payer_id: resource.payer?.payer_id,
        transaction_id: captureId,
        notes: `Payment received via PayPal. Capture ID: ${captureId}`
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      // Don't fail the webhook if payment recording fails
    }

    // Log activity
    const { error: activityError } = await supabase
      .from('invoice_activity')
      .insert({
        invoice_id: customId,
        activity_type: 'paid',
        description: `Payment of ${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)} received via PayPal`,
        recipient_email: invoiceData.client?.email
      });

    if (activityError) {
      console.error('Error logging payment activity:', activityError);
    }

    // Update webhook event with related records
    await supabase
      .from('paypal_webhook_event')
      .update({
        invoice_id: customId,
        payment_id: paymentRecord?.id
      })
      .eq('tenant_id', tenantId)
      .eq('paypal_event_id', webhookEvent.id);

    // Send payment confirmation email
    try {
      if (invoiceData.client?.email) {
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

        await emailService.sendPaymentReceivedEmail(completeInvoiceData, amount);
        console.log('Payment confirmation email sent for invoice:', invoiceData.invoice_number);
      }
    } catch (emailError) {
      console.error('Error sending payment confirmation email:', emailError);
      // Don't fail the webhook if email fails
    }

    console.log(`Successfully processed PayPal payment for invoice ${invoiceData.invoice_number}`);
    return { success: true, error: null };

  } catch (error) {
    console.error('Error handling PayPal payment capture completed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function handlePaymentCaptureFailed(webhookEvent: any, tenantId: string, supabase: any) {
  try {
    const resource = webhookEvent.resource;
    const orderId = resource.supplementary_data?.related_ids?.order_id;
    const customId = resource.custom_id;
    const reason = resource.reason || 'Payment failed';

    console.log('Processing PayPal payment failure:', {
      orderId,
      customId,
      reason,
      eventType: webhookEvent.event_type
    });

    if (!customId) {
      return { success: true, error: null }; // Don't fail for missing custom_id in failures
    }

    // Log activity for the failed payment
    const { error: activityError } = await supabase
      .from('invoice_activity')
      .insert({
        invoice_id: customId,
        activity_type: 'payment_failed',
        description: `PayPal payment failed: ${reason}`
      });

    if (activityError) {
      console.error('Error logging payment failure activity:', activityError);
    }

    return { success: true, error: null };

  } catch (error) {
    console.error('Error handling PayPal payment failure:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function handleOrderApproved(webhookEvent: any, tenantId: string, supabase: any) {
  try {
    const resource = webhookEvent.resource;
    const orderId = resource.id;
    const customId = resource.purchase_units?.[0]?.custom_id;

    console.log('Processing PayPal order approved:', {
      orderId,
      customId
    });

    if (!customId) {
      return { success: true, error: null };
    }

    // Log activity for order approval
    const { error: activityError } = await supabase
      .from('invoice_activity')
      .insert({
        invoice_id: customId,
        activity_type: 'payment_processing',
        description: `PayPal order approved and awaiting capture. Order ID: ${orderId}`
      });

    if (activityError) {
      console.error('Error logging order approval activity:', activityError);
    }

    return { success: true, error: null };

  } catch (error) {
    console.error('Error handling PayPal order approved:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function handlePaymentAuthorized(webhookEvent: any, tenantId: string, supabase: any) {
  try {
    const resource = webhookEvent.resource;
    const authorizationId = resource.id;
    const orderId = resource.supplementary_data?.related_ids?.order_id;
    const customId = resource.custom_id;

    console.log('Processing PayPal payment authorized:', {
      authorizationId,
      orderId,
      customId
    });

    if (!customId) {
      return { success: true, error: null };
    }

    // Log activity for payment authorization
    const { error: activityError } = await supabase
      .from('invoice_activity')
      .insert({
        invoice_id: customId,
        activity_type: 'payment_processing',
        description: `PayPal payment authorized. Authorization ID: ${authorizationId}`
      });

    if (activityError) {
      console.error('Error logging payment authorization activity:', activityError);
    }

    return { success: true, error: null };

  } catch (error) {
    console.error('Error handling PayPal payment authorized:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}