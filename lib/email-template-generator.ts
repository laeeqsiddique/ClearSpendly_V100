import { createClient } from '@/lib/supabase/server';
import {
  PayPalConfig,
  PayPalBusinessInfo,
  generatePayPalPaymentSection,
  generatePayPalCSS,
  shouldShowPayPalPayments
} from '@/lib/paypal-utils';

// Enhanced email template system that uses database templates
interface EmailTemplateConfig {
  id: string;
  template_type: 'invoice' | 'payment_reminder' | 'payment_received';
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
  logo_url?: string;
  company_name?: string;
  subject_template?: string;
  greeting_message?: string;
  footer_message?: string;
  header_style: any;
  body_style: any;
  button_style: any;
  custom_css?: string;
  // PayPal configuration fields
  enable_paypal_payments?: boolean;
  paypal_button_text?: string;
  paypal_instructions_text?: string;
  show_paypal_email?: boolean;
  show_paypal_me_link?: boolean;
  paypal_button_color?: string;
}

interface BusinessInfo {
  name: string;
  email: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  // PayPal payment information
  paypal_email?: string;
  paypal_me_link?: string;
}

interface EmailData {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  currency: string;
  client: {
    name: string;
    email: string;
    company_name?: string;
  };
  business: BusinessInfo;
  payment_link?: string;
  notes?: string;
  days_overdue?: number;
  amount_paid?: number;
}

export class EmailTemplateGenerator {
  private template: EmailTemplateConfig;
  private data: EmailData;

  constructor(template: EmailTemplateConfig, data: EmailData) {
    this.template = template;
    this.data = data;
  }

  // Process template variables like {{invoice_number}}, {{client_name}}, etc.
  private processVariables(text: string): string {
    if (!text) return '';

    // Safe data access with defaults
    const safeData = {
      invoice_number: this.data?.invoice_number || 'INV-001',
      business: this.data?.business || { name: 'Your Business', email: '', phone: '', website: '' },
      client: this.data?.client || { name: 'Client Name', email: '', company_name: '' },
      issue_date: this.data?.issue_date || new Date().toISOString(),
      due_date: this.data?.due_date || new Date().toISOString(),
      total_amount: this.data?.total_amount || 0,
      currency: this.data?.currency || 'USD',
      days_overdue: this.data?.days_overdue || 0,
      amount_paid: this.data?.amount_paid || 0
    };

    const variables: Record<string, string> = {
      invoice_number: safeData.invoice_number,
      business_name: safeData.business.name,
      client_name: safeData.client.name,
      client_email: safeData.client.email,
      client_company: safeData.client.company_name || '',
      issue_date: new Date(safeData.issue_date).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      }),
      due_date: new Date(safeData.due_date).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      }),
      amount: new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: safeData.currency 
      }).format(safeData.total_amount),
      currency: safeData.currency,
      days_overdue: safeData.days_overdue.toString(),
      amount_paid: safeData.amount_paid ? new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: safeData.currency 
      }).format(safeData.amount_paid) : '',
      payment_terms: `Net ${Math.ceil((new Date(safeData.due_date).getTime() - new Date(safeData.issue_date).getTime()) / (1000 * 60 * 60 * 24))}`,
      business_email: safeData.business.email,
      business_phone: safeData.business.phone || '',
      business_website: safeData.business.website || '',
    };

    let processed = text;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processed = processed.replace(regex, value);
    });

    return processed;
  }

  // Generate the email subject
  generateSubject(): string {
    const template = this.template.subject_template;
    const safeInvoiceNumber = this.data?.invoice_number || 'INV-001';
    const safeBusinessName = this.data?.business?.name || 'Your Business';
    const safeDaysOverdue = this.data?.days_overdue || 0;
    
    if (!template) {
      switch (this.template.template_type) {
        case 'invoice':
          return `Invoice ${safeInvoiceNumber} from ${safeBusinessName}`;
        case 'payment_reminder':
          return `Friendly Reminder: Invoice ${safeInvoiceNumber} is ${safeDaysOverdue} days overdue`;
        case 'payment_received':
          return `Thank you! Payment received for Invoice ${safeInvoiceNumber}`;
        default:
          return `Invoice ${safeInvoiceNumber}`;
      }
    }
    return this.processVariables(template);
  }

  // Generate template-specific content
  private generateTemplateContent(): string {
    switch (this.template.template_type) {
      case 'invoice':
        return this.generateInvoiceContent();
      case 'payment_reminder':
        return this.generateReminderContent();
      case 'payment_received':
        return this.generateConfirmationContent();
      default:
        return '';
    }
  }

  private generateInvoiceContent(): string {
    const safeData = {
      invoice_number: this.data?.invoice_number || 'INV-001',
      issue_date: this.data?.issue_date || new Date().toISOString(),
      due_date: this.data?.due_date || new Date().toISOString(),
      total_amount: this.data?.total_amount || 0,
      currency: this.data?.currency || 'USD',
      notes: this.data?.notes || '',
      payment_link: this.data?.payment_link || ''
    };

    // Generate PayPal payment section if enabled
    const paypalSection = shouldShowPayPalPayments(this.data.business, this.template) 
      ? generatePayPalPaymentSection(
          this.data.business, 
          this.template, 
          safeData.total_amount, 
          safeData.currency
        )
      : '';

    return `
      <!-- Invoice Details Card -->
      <div class="invoice-card">
        <div class="invoice-grid">
          <div class="invoice-item">
            <span class="invoice-label">Invoice Number</span>
            <span class="invoice-value">#${safeData.invoice_number}</span>
          </div>
          <div class="invoice-item">
            <span class="invoice-label">Issue Date</span>
            <span class="invoice-value">${new Date(safeData.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div class="invoice-item">
            <span class="invoice-label">Due Date</span>
            <span class="invoice-value">${new Date(safeData.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div class="invoice-item">
            <span class="invoice-label">Payment Terms</span>
            <span class="invoice-value">Net ${Math.ceil((new Date(safeData.due_date).getTime() - new Date(safeData.issue_date).getTime()) / (1000 * 60 * 60 * 24))}</span>
          </div>
        </div>
        
        <div class="amount-due">
          <span class="label">Total Amount Due</span>
          <span class="value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: safeData.currency }).format(safeData.total_amount)}</span>
        </div>
      </div>

      ${safeData.notes ? `
        <div class="message-box">
          <p>${this.processVariables(safeData.notes)}</p>
        </div>
      ` : ''}

      ${safeData.payment_link ? `
        <div class="cta-section">
          <a href="${safeData.payment_link}" class="cta-button">
            Pay Invoice Now →
          </a>
          <div class="security-note">
            🔒 Secure payment powered by Stripe
          </div>
        </div>
      ` : `
        <div class="message-box">
          <p>📎 Please find the detailed invoice attached to this email for payment instructions.</p>
        </div>
      `}

      ${paypalSection}
    `;
  }

  private generateReminderContent(): string {
    const safeData = {
      invoice_number: this.data?.invoice_number || 'INV-001',
      issue_date: this.data?.issue_date || new Date().toISOString(),
      due_date: this.data?.due_date || new Date().toISOString(),
      total_amount: this.data?.total_amount || 0,
      currency: this.data?.currency || 'USD',
      days_overdue: this.data?.days_overdue || 0,
      payment_link: this.data?.payment_link || ''
    };
    
    const daysOverdue = safeData.days_overdue;

    // Generate PayPal payment section if enabled
    const paypalSection = shouldShowPayPalPayments(this.data.business, this.template) 
      ? generatePayPalPaymentSection(
          this.data.business, 
          this.template, 
          safeData.total_amount, 
          safeData.currency
        )
      : '';
    
    return `
      <div class="overdue-badge">
        <span class="icon">⚠️</span>
        Invoice is ${daysOverdue} days overdue
      </div>

      <div class="invoice-card">
        <div class="invoice-grid">
          <div class="invoice-item">
            <span class="invoice-label">Invoice Number</span>
            <span class="invoice-value">#${this.data?.invoice_number || 'INV-001'}</span>
          </div>
          <div class="invoice-item">
            <span class="invoice-label">Original Due Date</span>
            <span class="invoice-value">${new Date(this.data?.due_date || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
        
        <div class="amount-due">
          <span class="label">Outstanding Amount</span>
          <span class="value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: this.data?.currency || 'USD' }).format(this.data?.total_amount || 0)}</span>
        </div>
      </div>

      <!-- Timeline -->
      <div class="timeline">
        <div class="timeline-item">
          <div class="timeline-icon">📧</div>
          <div class="timeline-content">
            <div class="timeline-title">Invoice Sent</div>
            <div class="timeline-date">${new Date(this.data?.issue_date || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-icon">📅</div>
          <div class="timeline-content">
            <div class="timeline-title">Payment Was Due</div>
            <div class="timeline-date">${new Date(this.data?.due_date || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${daysOverdue} days ago)</div>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-icon active">⏰</div>
          <div class="timeline-content">
            <div class="timeline-title">Today's Reminder</div>
            <div class="timeline-date">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          </div>
        </div>
      </div>

      ${this.data?.payment_link ? `
        <div class="cta-section">
          <a href="${this.data.payment_link}" class="cta-button">
            Pay Now - Quick & Secure →
          </a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
            🔒 Secure payment via Stripe • Takes less than 2 minutes
          </p>
        </div>
      ` : `
        <div class="help-section">
          <h3>📎 Need the Invoice?</h3>
          <p>The original invoice with payment instructions is attached to this email.</p>
        </div>
      `}

      ${paypalSection}

      <div class="help-section">
        <h3>Need Help?</h3>
        <p>If you've already paid or have any questions about this invoice, just reply to this email. We're here to help!</p>
      </div>
    `;
  }

  private generateConfirmationContent(): string {
    const amountPaid = this.data?.amount_paid || this.data?.total_amount || 0;
    
    return `
      <div class="celebration-banner">
        <h2>🎉 Thank You for Your Payment!</h2>
        <p>We've successfully received and processed your payment.</p>
      </div>

      <!-- Payment Details Card -->
      <div class="payment-card">
        <div class="payment-grid">
          <div class="payment-item">
            <span class="payment-label">Invoice Number</span>
            <span class="payment-value">#${this.data?.invoice_number || 'INV-001'}</span>
          </div>
          <div class="payment-item">
            <span class="payment-label">Payment Date</span>
            <span class="payment-value">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div class="payment-item">
            <span class="payment-label">Payment Method</span>
            <span class="payment-value">Online Payment</span>
          </div>
          <div class="payment-item">
            <span class="payment-label">Amount Paid</span>
            <span class="payment-value highlight">${new Intl.NumberFormat('en-US', { style: 'currency', currency: this.data?.currency || 'USD' }).format(amountPaid)}</span>
          </div>
        </div>
      </div>

      <div class="receipt-box">
        <h3>📄 Need a Receipt?</h3>
        <p>A payment receipt has been generated and is available in your account. You can also reply to this email if you need us to send you a copy.</p>
      </div>

      <div class="thank-you-message">
        <h3>We Appreciate Your Business!</h3>
        <p>Thank you for your prompt payment and for choosing ${this.data?.business?.name || 'Your Business'}. We look forward to continuing to work with you.</p>
      </div>

      <div class="next-steps">
        <h3>What's Next?</h3>
        <ul>
          <li>Your account is now up to date</li>
          <li>You'll receive a payment receipt for your records</li>
          <li>No further action is needed on this invoice</li>
        </ul>
      </div>
    `;
  }

  // Generate the complete HTML email
  generateHTML(): string {
    const greeting = this.processVariables(this.template.greeting_message || '');
    const footerMessage = this.processVariables(this.template.footer_message || 'Questions? Just reply to this email and we\'ll be happy to help.');

    const getHeaderIcon = () => {
      switch (this.template.template_type) {
        case 'invoice': return '💼';
        case 'payment_reminder': return '⏰';
        case 'payment_received': return '✨';
        default: return '📧';
      }
    };

    const getHeaderTitle = () => {
      switch (this.template.template_type) {
        case 'invoice': return 'New Invoice';
        case 'payment_reminder': return 'Payment Reminder';
        case 'payment_received': return 'Payment Received!';
        default: return 'Email';
      }
    };

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.generateSubject()}</title>
        <!--[if mso]>
        <noscript>
          <xml>
            <o:OfficeDocumentSettings>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        </noscript>
        <![endif]-->
        <style>
          ${this.generateCSS()}
          ${generatePayPalCSS(this.template)}
          ${this.template.custom_css || ''}
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <!-- Header -->
            <div class="header">
              ${this.template.logo_url ? `
                <img src="${this.template.logo_url}" alt="${this.data?.business?.name || 'Logo'}" class="logo-img" />
              ` : `
                <div class="logo">${getHeaderIcon()}</div>
              `}
              <h1>${getHeaderTitle()}</h1>
              <p>${this.template.company_name || this.data?.business?.name || 'Your Business'}</p>
            </div>

            <!-- Content -->
            <div class="content">
              <div class="greeting">Hello ${this.data?.client?.name || 'Client'} 👋</div>
              
              ${greeting ? `
                <p style="color: #4a5568; font-size: 16px; margin-bottom: 32px;">
                  ${greeting}
                </p>
              ` : ''}

              ${this.generateTemplateContent()}

              <div class="divider"></div>

              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                ${footerMessage}
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-logo">${this.data?.business?.name || 'Your Business'}</div>
              <div class="contact-info">
                ${this.data?.business?.email ? `<a href="mailto:${this.data.business.email}">${this.data.business.email}</a><br>` : ''}
                ${this.data?.business?.phone ? `${this.data.business.phone}<br>` : ''}
                ${this.data?.business?.website ? `<a href="${this.data.business.website}">${this.data.business.website}</a>` : ''}
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate CSS with template colors
  private generateCSS(): string {
    const colors = {
      primary: this.template.primary_color,
      secondary: this.template.secondary_color,
      accent: this.template.accent_color,
      text: this.template.text_color,
      background: this.template.background_color,
    };

    return `
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: ${colors.text};
        background-color: ${colors.background};
      }
      .wrapper {
        width: 100%;
        background-color: ${colors.background};
        padding: 40px 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
      }
      .header {
        background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
        padding: 48px 40px;
        text-align: center;
      }
      .logo {
        width: 60px;
        height: 60px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        margin: 0 auto 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        color: white;
        font-weight: bold;
      }
      .logo-img {
        width: 60px;
        height: 60px;
        object-contain: contain;
        margin: 0 auto 24px;
        display: block;
      }
      .header h1 {
        margin: 0 0 8px 0;
        color: #ffffff;
        font-size: 32px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .header p {
        margin: 0;
        color: rgba(255, 255, 255, 0.9);
        font-size: 18px;
        font-weight: 400;
      }
      .content {
        padding: 48px 40px;
      }
      .greeting {
        font-size: 20px;
        color: ${colors.text};
        margin-bottom: 24px;
        font-weight: 500;
      }
      .invoice-card, .payment-card {
        background: linear-gradient(to bottom, #fafbfc 0%, #f4f5f7 100%);
        border: 1px solid #e1e4e8;
        border-radius: 12px;
        padding: 32px;
        margin-bottom: 32px;
      }
      .invoice-grid, .payment-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
        margin-bottom: 24px;
      }
      .invoice-item, .payment-item {
        text-align: center;
      }
      .invoice-label, .payment-label {
        display: block;
        font-size: 13px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .invoice-value, .payment-value {
        display: block;
        font-size: 18px;
        color: ${colors.text};
        font-weight: 600;
      }
      .payment-value.highlight {
        color: ${colors.accent};
        font-size: 24px;
      }
      .amount-due {
        background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
        color: white;
        padding: 24px;
        border-radius: 12px;
        text-align: center;
        margin-top: 24px;
      }
      .amount-due .label {
        display: block;
        font-size: 14px;
        opacity: 0.9;
        margin-bottom: 8px;
      }
      .amount-due .value {
        display: block;
        font-size: 36px;
        font-weight: 700;
        letter-spacing: -1px;
      }
      .message-box {
        background: #f8f9fa;
        border-left: 4px solid ${colors.primary};
        padding: 20px;
        border-radius: 0 8px 8px 0;
        margin: 32px 0;
      }
      .message-box p {
        margin: 0;
        color: #4a5568;
        font-size: 16px;
      }
      .cta-section {
        text-align: center;
        margin: 40px 0;
      }
      .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
        color: white !important;
        padding: 18px 48px;
        text-decoration: none;
        border-radius: 50px;
        font-weight: 600;
        font-size: 16px;
        box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
      }
      .security-note {
        color: #6b7280;
        font-size: 14px;
        margin-top: 16px;
      }
      .overdue-badge {
        display: inline-flex;
        align-items: center;
        background: #fef3c7;
        color: #92400e;
        padding: 12px 24px;
        border-radius: 50px;
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 32px;
      }
      .overdue-badge .icon {
        margin-right: 8px;
        font-size: 20px;
      }
      .celebration-banner {
        background: linear-gradient(to right, #ecfdf5 0%, #d1fae5 100%);
        border: 1px solid #86efac;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 32px;
        text-align: center;
      }
      .celebration-banner h2 {
        margin: 0 0 8px 0;
        color: #047857;
        font-size: 24px;
        font-weight: 600;
      }
      .celebration-banner p {
        margin: 0;
        color: #065f46;
        font-size: 16px;
      }
      .timeline {
        background: #f9fafb;
        border-radius: 12px;
        padding: 24px;
        margin: 32px 0;
      }
      .timeline-item {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
      }
      .timeline-item:last-child {
        margin-bottom: 0;
      }
      .timeline-icon {
        width: 40px;
        height: 40px;
        background: #e5e7eb;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 16px;
        font-size: 18px;
      }
      .timeline-icon.active {
        background: #fbbf24;
        color: #92400e;
      }
      .timeline-content {
        flex: 1;
      }
      .timeline-title {
        font-weight: 600;
        color: ${colors.text};
        font-size: 15px;
      }
      .timeline-date {
        color: #6b7280;
        font-size: 13px;
      }
      .help-section, .receipt-box, .next-steps {
        background: #f3f4f6;
        border-radius: 12px;
        padding: 24px;
        margin: 32px 0;
      }
      .help-section h3, .receipt-box h3, .next-steps h3 {
        margin: 0 0 8px 0;
        color: ${colors.text};
        font-size: 18px;
        font-weight: 600;
      }
      .help-section p, .receipt-box p {
        margin: 0;
        color: #6b7280;
        font-size: 15px;
      }
      .next-steps ul {
        margin: 0;
        padding-left: 24px;
        color: #4b5563;
        font-size: 15px;
      }
      .next-steps li {
        margin-bottom: 8px;
      }
      .thank-you-message {
        background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
        color: white;
        padding: 32px;
        border-radius: 12px;
        text-align: center;
        margin: 32px 0;
      }
      .thank-you-message h3 {
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 700;
      }
      .thank-you-message p {
        margin: 0;
        font-size: 16px;
        opacity: 0.95;
      }
      .divider {
        height: 1px;
        background: #e5e7eb;
        margin: 32px 0;
      }
      .footer {
        background: #f9fafb;
        padding: 32px 40px;
        text-align: center;
      }
      .footer-logo {
        font-size: 20px;
        font-weight: 700;
        color: ${colors.primary};
        margin-bottom: 16px;
      }
      .contact-info {
        font-size: 14px;
        color: #6b7280;
        line-height: 1.6;
      }
      .contact-info a {
        color: ${colors.primary};
        text-decoration: none;
      }
      @media (max-width: 600px) {
        .wrapper { padding: 20px 10px; }
        .header { padding: 32px 24px; }
        .content { padding: 32px 24px; }
        .invoice-grid, .payment-grid { grid-template-columns: 1fr; gap: 16px; }
        .cta-button { padding: 16px 32px; font-size: 15px; }
      }
    `;
  }

  // Generate plain text version
  generateText(): string {
    const subject = this.generateSubject();
    const greeting = this.processVariables(this.template.greeting_message || '');
    
    return `
${subject}

Hi ${this.data?.client?.name || 'Client'},

${greeting || 'This is regarding your invoice.'}

Invoice Details:
- Invoice Number: ${this.data?.invoice_number || 'INV-001'}
- Issue Date: ${new Date(this.data?.issue_date || new Date()).toLocaleDateString()}
- Due Date: ${new Date(this.data?.due_date || new Date()).toLocaleDateString()}
- Amount Due: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: this.data?.currency || 'USD' }).format(this.data?.total_amount || 0)}

${this.data?.payment_link ? `Pay online: ${this.data.payment_link}` : 'Please refer to the attached invoice for payment instructions.'}

${this.processVariables(this.template.footer_message || 'If you have any questions, please contact us.')}

Best regards,
${this.data?.business?.name || 'Your Business'}
${this.data?.business?.email || ''}
${this.data?.business?.phone || ''}
    `.trim();
  }
}

// Enhanced email service that uses database templates
export async function generateCustomEmail(
  tenantId: string,
  templateType: 'invoice' | 'payment_reminder' | 'payment_received',
  emailData: EmailData
): Promise<{ subject: string; html: string; text: string }> {
  const supabase = await createClient();
  
  // Fetch the active template for this type
  const { data: template, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('template_type', templateType)
    .eq('is_active', true)
    .single();

  if (error || !template) {
    throw new Error(`No active email template found for ${templateType}`);
  }

  const generator = new EmailTemplateGenerator(template, emailData);
  
  return {
    subject: generator.generateSubject(),
    html: generator.generateHTML(),
    text: generator.generateText()
  };
}

// Utility to get all available merge tags
export const AVAILABLE_MERGE_TAGS = {
  invoice: [
    { tag: '{{invoice_number}}', description: 'Invoice number' },
    { tag: '{{business_name}}', description: 'Your business name' },
    { tag: '{{client_name}}', description: 'Client name' },
    { tag: '{{client_email}}', description: 'Client email' },
    { tag: '{{client_company}}', description: 'Client company name' },
    { tag: '{{issue_date}}', description: 'Invoice issue date' },
    { tag: '{{due_date}}', description: 'Invoice due date' },
    { tag: '{{amount}}', description: 'Invoice total amount' },
    { tag: '{{currency}}', description: 'Currency code' },
    { tag: '{{payment_terms}}', description: 'Payment terms (e.g., Net 30)' },
    { tag: '{{business_email}}', description: 'Your business email' },
    { tag: '{{business_phone}}', description: 'Your business phone' },
    { tag: '{{business_website}}', description: 'Your business website' },
  ],
  payment_reminder: [
    { tag: '{{invoice_number}}', description: 'Invoice number' },
    { tag: '{{business_name}}', description: 'Your business name' },
    { tag: '{{client_name}}', description: 'Client name' },
    { tag: '{{due_date}}', description: 'Original due date' },
    { tag: '{{days_overdue}}', description: 'Number of days overdue' },
    { tag: '{{amount}}', description: 'Outstanding amount' },
    { tag: '{{currency}}', description: 'Currency code' },
  ],
  payment_received: [
    { tag: '{{invoice_number}}', description: 'Invoice number' },
    { tag: '{{business_name}}', description: 'Your business name' },
    { tag: '{{client_name}}', description: 'Client name' },
    { tag: '{{amount_paid}}', description: 'Amount that was paid' },
    { tag: '{{currency}}', description: 'Currency code' },
  ],
};