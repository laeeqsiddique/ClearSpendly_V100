import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripeService } from '@/lib/stripe-service';
import { paypalService } from '@/lib/paypal-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { invoiceId, provider = 'auto' } = body; // provider can be 'stripe', 'paypal', or 'auto'

    if (!invoiceId) {
      return NextResponse.json({ 
        error: 'Invoice ID is required' 
      }, { status: 400 });
    }

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 });
    }

    // Fetch invoice with client data
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoice')
      .select(`
        *,
        client:client_id (*)
      `)
      .eq('id', invoiceId)
      .eq('tenant_id', membership.tenant_id)
      .single();

    if (invoiceError || !invoiceData) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if invoice is in a valid state for payment
    if (invoiceData.status === 'paid') {
      return NextResponse.json({ 
        error: 'Invoice is already paid' 
      }, { status: 400 });
    }

    if (invoiceData.status === 'cancelled') {
      return NextResponse.json({ 
        error: 'Cannot create payment link for cancelled invoice' 
      }, { status: 400 });
    }

    // Get enabled payment providers for this tenant
    const { data: enabledProviders, error: providersError } = await supabase
      .from('payment_provider')
      .select('provider_type, is_default, paypal_client_id, verification_status')
      .eq('tenant_id', membership.tenant_id)
      .eq('is_enabled', true)
      .eq('verification_status', 'verified');

    if (providersError) {
      console.error('Error fetching payment providers:', providersError);
      return NextResponse.json({ error: 'Failed to fetch payment providers' }, { status: 500 });
    }

    if (!enabledProviders || enabledProviders.length === 0) {
      return NextResponse.json({ 
        error: 'No payment providers enabled for this account' 
      }, { status: 400 });
    }

    // Determine which provider to use
    let selectedProvider = provider;
    if (provider === 'auto') {
      // Use the default provider, or Stripe if no default is set
      const defaultProvider = enabledProviders.find(p => p.is_default);
      selectedProvider = defaultProvider?.provider_type || 'stripe';
    }

    // Validate that the selected provider is enabled
    const providerConfig = enabledProviders.find(p => p.provider_type === selectedProvider);
    if (!providerConfig) {
      return NextResponse.json({ 
        error: `Payment provider '${selectedProvider}' is not enabled for this account` 
      }, { status: 400 });
    }

    // Check if invoice already has a payment link for this provider
    const hasStripeLink = invoiceData.stripe_payment_link_id && invoiceData.stripe_payment_link_url;
    const hasPayPalLink = invoiceData.paypal_order_id && invoiceData.paypal_payment_link_url;

    if (selectedProvider === 'stripe' && hasStripeLink) {
      return NextResponse.json({
        success: true,
        paymentLink: {
          id: invoiceData.stripe_payment_link_id,
          url: invoiceData.stripe_payment_link_url,
          provider: 'stripe'
        },
        message: 'Stripe payment link already exists'
      });
    }

    if (selectedProvider === 'paypal' && hasPayPalLink) {
      return NextResponse.json({
        success: true,
        paymentLink: {
          id: invoiceData.paypal_order_id,
          url: invoiceData.paypal_payment_link_url,
          provider: 'paypal'
        },
        message: 'PayPal payment link already exists'
      });
    }

    // Get business information from tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant')
      .select('name')
      .eq('id', membership.tenant_id)
      .single();

    const businessName = tenant?.name || "Your Business";

    let result;
    let updateData: any = {};
    let activityDescription = '';

    if (selectedProvider === 'stripe') {
      // Create Stripe payment link
      result = await stripeService.createPaymentLink({
        invoiceId: invoiceData.id,
        amount: invoiceData.total_amount,
        currency: invoiceData.currency || 'USD',
        description: `Invoice ${invoiceData.invoice_number} from ${businessName}`,
        clientEmail: invoiceData.client.email,
        clientName: invoiceData.client.name,
        invoiceNumber: invoiceData.invoice_number,
        metadata: {
          tenant_id: membership.tenant_id,
          business_name: businessName,
          due_date: invoiceData.due_date
        }
      });

      if (result.success) {
        updateData = {
          stripe_payment_link_id: result.paymentLink!.id,
          stripe_payment_link_url: result.paymentLink!.url,
          payment_method: 'stripe',
          preferred_payment_provider: 'stripe'
        };
        activityDescription = `Stripe payment link created for invoice ${invoiceData.invoice_number}`;
      }

    } else if (selectedProvider === 'paypal') {
      // Create PayPal order
      result = await paypalService.createOrderForInvoice({
        invoiceId: invoiceData.id,
        amount: invoiceData.total_amount,
        currency: invoiceData.currency || 'USD',
        description: `Invoice ${invoiceData.invoice_number} from ${businessName}`,
        clientEmail: invoiceData.client.email,
        clientName: invoiceData.client.name,
        invoiceNumber: invoiceData.invoice_number,
        tenantId: membership.tenant_id,
        metadata: {
          tenant_id: membership.tenant_id,
          business_name: businessName,
          due_date: invoiceData.due_date
        }
      });

      if (result.success) {
        updateData = {
          paypal_order_id: result.order!.id,
          paypal_payment_link_url: result.order!.approvalUrl,
          payment_method: 'paypal',
          preferred_payment_provider: 'paypal'
        };
        activityDescription = `PayPal payment link created for invoice ${invoiceData.invoice_number}`;
      }
    } else {
      return NextResponse.json({ 
        error: `Unsupported payment provider: ${selectedProvider}` 
      }, { status: 400 });
    }

    if (!result || !result.success) {
      return NextResponse.json({ 
        error: `Failed to create ${selectedProvider} payment link: ${result?.error || 'Unknown error'}` 
      }, { status: 500 });
    }

    // Update invoice with payment link information
    const { error: updateError } = await supabase
      .from('invoice')
      .update(updateData)
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Error updating invoice with payment link:', updateError);
      // Don't fail the request if update fails - the payment link was created successfully
    }

    // Log the activity
    const { error: activityError } = await supabase
      .from('invoice_activity')
      .insert({
        invoice_id: invoiceId,
        activity_type: 'payment_link_created',
        description: activityDescription
      });

    if (activityError) {
      console.error('Error logging payment link activity:', activityError);
      // Don't fail the request if activity logging fails
    }

    return NextResponse.json({
      success: true,
      paymentLink: {
        id: selectedProvider === 'stripe' ? result.paymentLink!.id : result.order!.id,
        url: selectedProvider === 'stripe' ? result.paymentLink!.url : result.order!.approvalUrl,
        provider: selectedProvider
      },
      message: `${selectedProvider} payment link created successfully`
    });

  } catch (error) {
    console.error('Error in payment link API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json({ 
        error: 'Invoice ID is required' 
      }, { status: 400 });
    }

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 });
    }

    // Fetch invoice
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoice')
      .select('id, invoice_number, stripe_payment_link_id')
      .eq('id', invoiceId)
      .eq('tenant_id', membership.tenant_id)
      .single();

    if (invoiceError || !invoiceData) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if invoice has a payment link to deactivate
    if (!invoiceData.stripe_payment_link_id) {
      return NextResponse.json({ 
        error: 'Invoice does not have a payment link' 
      }, { status: 400 });
    }

    // Deactivate the payment link in Stripe
    const result = await stripeService.deactivatePaymentLink(invoiceData.stripe_payment_link_id);

    if (!result.success) {
      return NextResponse.json({ 
        error: `Failed to deactivate payment link: ${result.error}` 
      }, { status: 500 });
    }

    // Clear payment link information from invoice
    const { error: updateError } = await supabase
      .from('invoice')
      .update({
        stripe_payment_link_id: null,
        stripe_payment_link_url: null
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Error clearing payment link from invoice:', updateError);
      // Don't fail the request if update fails - the payment link was deactivated successfully
    }

    // Log the activity
    const { error: activityError } = await supabase
      .from('invoice_activity')
      .insert({
        invoice_id: invoiceId,
        activity_type: 'payment_link_deactivated',
        description: `Stripe payment link deactivated for invoice ${invoiceData.invoice_number}`
      });

    if (activityError) {
      console.error('Error logging payment link deactivation:', activityError);
      // Don't fail the request if activity logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Payment link deactivated successfully'
    });

  } catch (error) {
    console.error('Error in payment link deactivation API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}