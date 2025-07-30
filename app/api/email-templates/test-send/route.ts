import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCustomEmail } from '@/lib/email-template-generator';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const body = await request.json();
    const { 
      templateId, 
      templateType, 
      recipientEmail, 
      sampleData 
    } = body;

    // Validate required fields
    if ((!templateId && !templateType) || !recipientEmail) {
      return NextResponse.json({ 
        error: 'Template ID or type and recipient email are required' 
      }, { status: 400 });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json({ 
        error: 'Invalid email address' 
      }, { status: 400 });
    }

    // Get business information
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant')
      .select('*')
      .eq('id', membership.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Business information not found' }, { status: 404 });
    }

    // Prepare sample email data
    const mockEmailData = sampleData || {
      invoice_number: "TEST-001",
      issue_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      total_amount: 1250.00,
      currency: "USD",
      client: {
        name: "Test Client",
        email: recipientEmail,
        company_name: "Test Company"
      },
      business: {
        name: tenant.name || "Your Business",
        email: user.email || tenant.email || "business@example.com",
        phone: tenant.phone,
        website: tenant.website,
        address_line1: tenant.address_line1,
        address_line2: tenant.address_line2,
        city: tenant.city,
        state: tenant.state,
        postal_code: tenant.postal_code,
        country: tenant.country || "United States"
      },
      payment_link: "https://pay.example.com/test-payment",
      notes: "This is a test email to preview your template design.",
      days_overdue: templateType === 'payment_reminder' ? 7 : undefined,
      amount_paid: templateType === 'payment_received' ? 1250.00 : undefined
    };

    let emailContent;
    
    if (templateId) {
      // Use specific template by ID
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('tenant_id', membership.tenant_id)
        .single();

      if (templateError || !template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      emailContent = await generateCustomEmail(
        membership.tenant_id,
        template.template_type,
        mockEmailData
      );
    } else {
      // Use template by type (active template)
      emailContent = await generateCustomEmail(
        membership.tenant_id,
        templateType,
        mockEmailData
      );
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ 
        error: 'Email service not configured',
        preview: {
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        }
      }, { status: 200 });
    }

    // Send test email
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@clearspendly.com';
    const fromName = tenant.name || 'ClearSpendly';
    
    const emailResult = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [recipientEmail],
      subject: `[TEST] ${emailContent.subject}`,
      html: emailContent.html,
      text: emailContent.text,
      headers: {
        'X-Entity-Ref-ID': `test-${templateType || templateId}-${Date.now()}`
      }
    });

    if (emailResult.error) {
      console.error('Resend error:', emailResult.error);
      return NextResponse.json({ 
        error: `Failed to send test email: ${emailResult.error.message}`,
        preview: {
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        }
      }, { status: 500 });
    }

    // Log the test send
    await supabase
      .from('email_send_log')
      .insert({
        tenant_id: membership.tenant_id,
        template_id: templateId || null,
        recipient_email: recipientEmail,
        recipient_name: 'Test User',
        subject: emailContent.subject,
        template_type: templateType || 'test',
        status: 'sent',
        provider_message_id: emailResult.data?.id,
        sent_by: user.id,
        template_snapshot: {
          type: 'test_send',
          template_id: templateId,
          template_type: templateType,
          timestamp: new Date().toISOString()
        }
      });

    return NextResponse.json({
      success: true,
      messageId: emailResult.data?.id,
      message: `Test email sent successfully to ${recipientEmail}`,
      preview: {
        subject: emailContent.subject,
        recipientCount: 1
      }
    });

  } catch (error) {
    console.error('Error in test-send API:', error);
    
    // If it's a template generation error, provide more details
    if (error instanceof Error && error.message.includes('template')) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}