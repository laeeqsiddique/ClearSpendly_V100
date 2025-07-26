import { Resend } from 'resend';
import { invoiceEmailTemplates, EmailTemplate } from './email-templates';
import { generateInvoicePDF } from './pdf-generator';
import { EmailTemplateGenerator } from './email-template-generator';
import { createClient } from './supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

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
      const emailData: any = {
        from: this.fromEmail,
        to: [to],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      };

      // Attach PDF if requested and it's not a payment received email
      if (attachPDF && template !== 'paymentReceived' && data.id) {
        try {
          const pdfBlob = await generateInvoicePDF(data);
          const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
          
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