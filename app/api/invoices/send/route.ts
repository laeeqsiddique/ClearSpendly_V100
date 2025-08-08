import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailService, calculateDaysOverdue } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  console.log('🚨 SEND EMAIL API CALLED');
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { invoiceId, emailType, customSubject, customMessage, includePaymentLink, paymentProvider } = body;

    if (!invoiceId || !emailType) {
      return NextResponse.json({ 
        error: 'Invoice ID and email type are required' 
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

    // Fetch invoice with all related data
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoice')
      .select(`
        *,
        client:client_id (*),
        template:template_id (*),
        items:invoice_item (*)
      `)
      .eq('id', invoiceId)
      .eq('tenant_id', membership.tenant_id)
      .single();

    if (invoiceError || !invoiceData) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get business information from tenant - specifically including reply_to_email
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant')
      .select('*')
      .eq('id', membership.tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error('🚨 Tenant fetch error:', tenantError);
      return NextResponse.json({ error: 'Tenant information not found' }, { status: 404 });
    }

    // Debug tenant data
    console.log('Send Email API - Tenant Debug:', {
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      tenantReplyToEmail: tenant.reply_to_email,
      userEmail: user.email,
      paypal_email: tenant.paypal_email,
      paypal_me_link: tenant.paypal_me_link,
      payment_instructions: tenant.payment_instructions
    });

    // Prepare business info for email
    const businessInfo = {
      name: tenant.name || "Your Business",
      email: user.email || "",  // Use user email since tenant table doesn't have email field
      reply_to_email: tenant.reply_to_email || user.email || "",  // Use dedicated reply-to field
      phone: tenant.phone || "",
      website: tenant.website || "",
      address_line1: tenant.address_line1 || "",
      address_line2: tenant.address_line2 || "",
      city: tenant.city || "",
      state: tenant.state || "",
      postal_code: tenant.postal_code || "",
      country: tenant.country || "United States",
      paypal_email: tenant.paypal_email || "",
      paypal_me_link: tenant.paypal_me_link || "",
      payment_instructions: tenant.payment_instructions || ""
    };
    
    console.log('Send Email API - Business Info:', businessInfo);

    // Prepare payment links based on user preference
    let paymentLinks = {};
    if (includePaymentLink && ['new', 'reminder'].includes(emailType)) {
      switch (paymentProvider) {
        case 'stripe':
          if (invoiceData.stripe_payment_link_url) {
            paymentLinks = {
              stripe_payment_link: invoiceData.stripe_payment_link_url
            };
          }
          break;
        case 'paypal':
          if (invoiceData.paypal_payment_link_url) {
            paymentLinks = {
              paypal_payment_link: invoiceData.paypal_payment_link_url
            };
          }
          break;
        case 'both':
        default:
          paymentLinks = {
            stripe_payment_link: invoiceData.stripe_payment_link_url || undefined,
            paypal_payment_link: invoiceData.paypal_payment_link_url || undefined
          };
          break;
      }
    }

    // Prepare complete invoice data for email
    const completeInvoiceData = {
      ...invoiceData,
      business: businessInfo,
      items: invoiceData.items || [],
      ...paymentLinks,
      // Legacy support
      payment_link: invoiceData.stripe_payment_link_url || undefined
    };

    // Send email based on type
    let result;
    let activityType;
    let activityDescription;

    switch (emailType) {
      case 'new':
        result = await emailService.sendNewInvoiceEmail(completeInvoiceData, membership.tenant_id, {
          subject: customSubject,
          message: customMessage
        });
        activityType = 'sent';
        activityDescription = `Invoice sent via email to ${invoiceData.client.email}`;
        break;

      case 'reminder':
        const daysOverdue = calculateDaysOverdue(invoiceData.due_date);
        result = await emailService.sendPaymentReminderEmail(
          completeInvoiceData, 
          membership.tenant_id,
          daysOverdue,
          {
            subject: customSubject,
            message: customMessage
          }
        );
        activityType = 'reminded';
        activityDescription = `Payment reminder sent to ${invoiceData.client.email} (${daysOverdue} days overdue)`;
        break;

      case 'payment_received':
        const amountPaid = invoiceData.amount_paid || invoiceData.total_amount;
        result = await emailService.sendPaymentReceivedEmail(
          completeInvoiceData,
          membership.tenant_id,
          amountPaid,
          {
            subject: customSubject,
            message: customMessage
          }
        );
        activityType = 'payment_confirmed';
        activityDescription = `Payment confirmation sent to ${invoiceData.client.email}`;
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid email type. Must be: new, reminder, or payment_received' 
        }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ 
        error: `Failed to send email: ${result.error}` 
      }, { status: 500 });
    }

    // Log the email activity
    const { error: activityError } = await supabase
      .from('invoice_activity')
      .insert({
        invoice_id: invoiceId,
        activity_type: activityType,
        description: activityDescription,
        email_subject: customSubject || `Invoice ${invoiceData.invoice_number}`,
        recipient_email: invoiceData.client.email
      });

    if (activityError) {
      console.error('Error logging email activity:', activityError);
      // Don't fail the request if activity logging fails
    }

    // Update invoice status and sent timestamp for new invoice emails
    if (emailType === 'new' && invoiceData.status === 'draft') {
      const { error: updateError } = await supabase
        .from('invoice')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (updateError) {
        console.error('Error updating invoice status:', updateError);
        // Don't fail the request if status update fails
      }
    }

    // Update reminder count and timestamp for reminder emails
    if (emailType === 'reminder') {
      const { error: reminderUpdateError } = await supabase
        .from('invoice')
        .update({
          last_reminder_sent_at: new Date().toISOString(),
          reminder_count: (invoiceData.reminder_count || 0) + 1,
          status: 'overdue' // Ensure status is set to overdue
        })
        .eq('id', invoiceId);

      if (reminderUpdateError) {
        console.error('Error updating reminder info:', reminderUpdateError);
      }
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Error in send email API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}