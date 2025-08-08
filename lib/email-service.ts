import { Resend } from 'resend';
import { invoiceEmailTemplates, EmailTemplate } from './email-templates';
import { generateInvoicePDF } from './pdf-generator';
import { EmailTemplateGenerator } from './email-template-generator';
import { createClient } from './supabase/server';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface EmailSendOptions {
  to: string;
  template: EmailTemplate;
  data: any;
  tenantId: string;
  attachPDF?: boolean;
  customSubject?: string;
  customMessage?: string;
}

interface InvoiceEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class InvoiceEmailService {
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'invoice@updates.flowvya.com';
  }

  // Fetch active email template from database
  private async getActiveTemplate(tenantId: string, templateType: 'invoice' | 'payment_reminder' | 'payment_received') {
    try {
      const supabase = await createClient();
      
      const { data: template, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('template_type', templateType)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching email template:', error);
        return null;
      }

      return template;
    } catch (error) {
      console.error('Error in getActiveTemplate:', error);
      return null;
    }
  }

  async sendInvoiceEmail(options: EmailSendOptions): Promise<InvoiceEmailResult> {
    console.log('🚨 EMAIL SERVICE CALLED - sendInvoiceEmail');
    try {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('Resend API key not configured');
      }

      const { to, template, data, tenantId, attachPDF = true, customSubject, customMessage } = options;

      // First try to get custom template from database
      const templateTypeMap = {
        'newInvoice': 'invoice',
        'paymentReminder': 'payment_reminder', 
        'paymentReceived': 'payment_received'
      } as const;

      const templateType = templateTypeMap[template];
      const customTemplate = await this.getActiveTemplate(tenantId, templateType);

      let emailContent;

      if (customTemplate) {
        // Use custom template from database
        console.log('USING DATABASE TEMPLATE');
        console.log('🚨 Database template data:', customTemplate);
        const generator = new EmailTemplateGenerator(customTemplate, data);
        emailContent = {
          subject: customTemplate.subject_template || '',
          html: generator.generateHTML(),
          text: generator.generateText()
        };

        // Process template variables in subject
        emailContent.subject = generator.processVariables(emailContent.subject);
      } else {
        // Fallback to hardcoded templates
        switch (template) {
          case 'newInvoice':
            emailContent = invoiceEmailTemplates.newInvoice(data);
            break;
          case 'paymentReminder':
            emailContent = invoiceEmailTemplates.paymentReminder(data, data.daysOverdue || 0);
            break;
          case 'paymentReceived':
            emailContent = invoiceEmailTemplates.paymentReceived(data, data.amountPaid || 0);
            break;
          default:
            throw new Error(`Unknown email template: ${template}`);
        }
      }

      // Override subject and add custom message if provided
      if (customSubject) {
        emailContent.subject = customSubject;
      }

      if (customMessage) {
        // Insert custom message after greeting
        emailContent.html = emailContent.html.replace(
          /<p>Hi [^<]+<\/p>/,
          `$&\n          <div style="margin: 20px 0; padding: 16px; background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #1e40af; font-style: italic;">${customMessage}</p>
          </div>`
        );
      }

      // Prepare email data
      const replyToEmail = data.business?.reply_to_email || data.business?.email || this.fromEmail;
      const emailData: any = {
        from: this.fromEmail,
        to: [to],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      };
      
      // Always set reply_to if we have a valid reply-to email (Resend API expects 'replyTo' field)
      if (replyToEmail && replyToEmail !== this.fromEmail) {
        emailData.replyTo = replyToEmail;  // Changed from reply_to to replyTo for Resend API
      }
      
      // Debug email configuration
      console.log('🚨 Email Service - Detailed Email Configuration:', {
        from: emailData.from,
        replyTo: emailData.replyTo,  // Updated field name
        to: emailData.to,
        subject: emailData.subject,
        replyToEmailSource: replyToEmail,
        businessReplyTo: data.business?.reply_to_email,
        businessEmail: data.business?.email,
        fallbackFromEmail: this.fromEmail,
        willSetReplyTo: !!(replyToEmail && replyToEmail !== this.fromEmail)
      });
      
      // Debug PayPal settings
      console.log('Email Service - PayPal Debug:', {
        hasPayPalEmail: !!data.business?.paypal_email,
        hasPayPalMeLink: !!data.business?.paypal_me_link,
        hasPaymentInstructions: !!data.business?.payment_instructions,
        paypalEmail: data.business?.paypal_email,
        paypalMeLink: data.business?.paypal_me_link,
        paymentInstructions: data.business?.payment_instructions?.substring(0, 50) + '...'
      });
      
      // Debug what's being passed to email template
      console.log('Email Service - Template Data Preview:', {
        templateType: template,
        hasBusinessData: !!data.business,
        businessPayPalEmail: data.business?.paypal_email,
        businessPayPalMeLink: data.business?.paypal_me_link,
        paymentLinkLegacy: data.payment_link,
        totalAmount: data.total_amount
      });

      // Attach PDF if requested and it's not a payment received email
      if (attachPDF && template !== 'paymentReceived' && data.id) {
        try {
          // Use the SAME PDF API as the download function to ensure consistency
          const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/invoices/pdf`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              invoiceData: data // Pass the complete invoice data directly
            })
          });

          if (!response.ok) {
            throw new Error(`PDF API responded with status: ${response.status}`);
          }

          const pdfBuffer = Buffer.from(await response.arrayBuffer());
          
          emailData.attachments = [{
            filename: `Invoice-${data.invoice_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }];
        } catch (pdfError) {
          console.error('Error generating PDF attachment:', pdfError);
          // Continue without PDF attachment rather than failing the email
        }
      }

      // Send email
      if (!resend) {
        console.warn('Resend API key not configured, email sending disabled');
        return {
          success: false,
          error: 'Email service not configured',
          emailId: null
        };
      }

      const response = await resend.emails.send(emailData);

      if (response.error) {
        throw new Error(`Resend API error: ${response.error.message}`);
      }

      return {
        success: true,
        messageId: response.data?.id
      };

    } catch (error) {
      console.error('Error sending invoice email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async sendNewInvoiceEmail(invoiceData: any, tenantId: string, customOptions?: { subject?: string; message?: string }): Promise<InvoiceEmailResult> {
    console.log('🚨 sendNewInvoiceEmail CALLED');
    console.log('🚨 invoiceData.business:', invoiceData.business);
    console.log('🚨 invoiceData.business.paypal_me_link:', invoiceData.business?.paypal_me_link);
    console.log('🚨 invoiceData.business.reply_to_email:', invoiceData.business?.reply_to_email);
    
    return this.sendInvoiceEmail({
      to: invoiceData.client.email,
      template: 'newInvoice',
      data: invoiceData,
      tenantId,
      attachPDF: true,
      customSubject: customOptions?.subject,
      customMessage: customOptions?.message
    });
  }

  async sendPaymentReminderEmail(invoiceData: any, tenantId: string, daysOverdue: number, customOptions?: { subject?: string; message?: string }): Promise<InvoiceEmailResult> {
    return this.sendInvoiceEmail({
      to: invoiceData.client.email,
      template: 'paymentReminder',
      data: { ...invoiceData, daysOverdue },
      tenantId,
      attachPDF: true,
      customSubject: customOptions?.subject,
      customMessage: customOptions?.message
    });
  }

  async sendPaymentReceivedEmail(invoiceData: any, tenantId: string, amountPaid: number, customOptions?: { subject?: string; message?: string }): Promise<InvoiceEmailResult> {
    return this.sendInvoiceEmail({
      to: invoiceData.client.email,
      template: 'paymentReceived',
      data: { ...invoiceData, amountPaid },
      tenantId,
      attachPDF: false, // Usually don't attach PDF for payment confirmations
      customSubject: customOptions?.subject,
      customMessage: customOptions?.message
    });
  }

  async testEmailConfiguration(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!process.env.RESEND_API_KEY) {
        return { success: false, error: 'Resend API key not configured' };
      }

      if (!this.fromEmail) {
        return { success: false, error: 'From email address not configured' };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Utility function to calculate days overdue
export function calculateDaysOverdue(dueDate: string): number {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Utility function to check if invoice is overdue
export function isInvoiceOverdue(dueDate: string): boolean {
  return calculateDaysOverdue(dueDate) > 0;
}

// Default email service instance
export const emailService = new InvoiceEmailService();