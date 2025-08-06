interface InvoiceEmailData {
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
  business: {
    name: string;
    email: string;
    phone?: string;
    website?: string;
    paypal_email?: string;
    paypal_me_link?: string;
    payment_instructions?: string;
  };
  payment_link?: string;
  notes?: string;
  pdf_attachment?: Buffer;
}

export const invoiceEmailTemplates = {
  newInvoice: (data: InvoiceEmailData) => ({
    subject: `Invoice ${data.invoice_number} from ${data.business.name}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${data.invoice_number}</title>
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
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background-color: #f5f5f5;
          }
          .wrapper {
            width: 100%;
            background-color: #f5f5f5;
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            color: #1a1a1a;
            margin-bottom: 24px;
            font-weight: 500;
          }
          .invoice-card {
            background: linear-gradient(to bottom, #fafbfc 0%, #f4f5f7 100%);
            border: 1px solid #e1e4e8;
            border-radius: 12px;
            padding: 32px;
            margin-bottom: 32px;
          }
          .invoice-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            margin-bottom: 24px;
          }
          .invoice-item {
            text-align: center;
          }
          .invoice-label {
            display: block;
            font-size: 13px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .invoice-value {
            display: block;
            font-size: 18px;
            color: #1a1a1a;
            font-weight: 600;
          }
          .amount-due {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            border-left: 4px solid #667eea;
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            padding: 18px 48px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
          }
          .security-note {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #6b7280;
            font-size: 14px;
            margin-top: 16px;
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
            color: #667eea;
            margin-bottom: 16px;
          }
          .contact-info {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.6;
          }
          .contact-info a {
            color: #667eea;
            text-decoration: none;
          }
          .social-links {
            margin-top: 24px;
          }
          .social-links a {
            display: inline-block;
            width: 32px;
            height: 32px;
            background: #e5e7eb;
            border-radius: 50%;
            margin: 0 6px;
            line-height: 32px;
            color: #6b7280;
            text-decoration: none;
            transition: all 0.3s ease;
          }
          .social-links a:hover {
            background: #667eea;
            color: white;
          }
          @media (max-width: 600px) {
            .wrapper {
              padding: 20px 10px;
            }
            .header {
              padding: 32px 24px;
            }
            .content {
              padding: 32px 24px;
            }
            .invoice-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }
            .cta-button {
              padding: 16px 32px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="logo">💼</div>
              <h1>New Invoice</h1>
              <p>${data.business.name}</p>
            </div>

            <!-- Content -->
            <div class="content">
              <div class="greeting">Hello ${data.client.name} 👋</div>
              
              <p style="color: #4a5568; font-size: 16px; margin-bottom: 32px;">
                We've prepared your invoice. Here's a summary of the details:
              </p>

              <!-- Invoice Details Card -->
              <div class="invoice-card">
                <div class="invoice-grid">
                  <div class="invoice-item">
                    <span class="invoice-label">Invoice Number</span>
                    <span class="invoice-value">#${data.invoice_number}</span>
                  </div>
                  <div class="invoice-item">
                    <span class="invoice-label">Issue Date</span>
                    <span class="invoice-value">${new Date(data.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div class="invoice-item">
                    <span class="invoice-label">Due Date</span>
                    <span class="invoice-value">${new Date(data.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div class="invoice-item">
                    <span class="invoice-label">Payment Terms</span>
                    <span class="invoice-value">Net ${Math.ceil((new Date(data.due_date).getTime() - new Date(data.issue_date).getTime()) / (1000 * 60 * 60 * 24))}</span>
                  </div>
                </div>
                
                <div class="amount-due">
                  <span class="label">Total Amount Due</span>
                  <span class="value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.total_amount)}</span>
                </div>
              </div>

              ${data.notes ? `
                <div class="message-box">
                  <p>${data.notes}</p>
                </div>
              ` : ''}

              <!-- Payment Options Section -->
              ${data.payment_link || data.business.paypal_email || data.business.paypal_me_link ? `
                <div class="cta-section">
                  <h3 style="color: #1a1a1a; margin-bottom: 16px; font-size: 18px;">💳 Payment Options</h3>
                  
                  ${data.payment_link ? `
                    <a href="${data.payment_link}" class="cta-button" style="background: #635bff; margin-bottom: 12px;">
                      Pay with Card →
                    </a>
                    <div class="security-note" style="margin-bottom: 20px;">
                      🔒 Secure payment powered by Stripe
                    </div>
                  ` : ''}
                  
                  ${data.business.paypal_me_link ? `
                    <a href="https://paypal.me/${data.business.paypal_me_link.replace(/^https?:\/\/(www\.)?paypal\.me\//, '')}/${data.total_amount.toFixed(2)}" class="cta-button" style="background: #0070ba; margin-bottom: 12px;">
                      💰 Pay $${data.total_amount.toFixed(2)} via PayPal
                    </a>
                    <div class="security-note" style="margin-bottom: 20px;">
                      🔒 Secure payment via PayPal
                    </div>
                  ` : data.business.paypal_email ? `
                    <div class="payment-option" style="background: #f0f8ff; border: 1px solid #0070ba; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                      <h4 style="color: #0070ba; margin: 0 0 8px 0; font-size: 16px;">💙 Pay with PayPal</h4>
                      <p style="margin: 0 0 8px 0; color: #1a1a1a;">Send payment to: <strong>${data.business.paypal_email}</strong></p>
                      <p style="margin: 0; color: #6b7280; font-size: 14px;">Reference: Invoice ${data.invoice_number}</p>
                    </div>
                  ` : ''}
                  
                  ${data.business.payment_instructions ? `
                    <div class="payment-instructions" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 16px;">
                      <h4 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 16px;">📝 Payment Instructions</h4>
                      <p style="margin: 0; color: #374151; line-height: 1.5;">${data.business.payment_instructions}</p>
                    </div>
                  ` : ''}
                </div>
              ` : `
                <div class="message-box">
                  <p>📎 Please find the detailed invoice attached to this email for payment instructions.</p>
                </div>
              `}

              <div class="divider"></div>

              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                Questions about this invoice? Just reply to this email and we'll be happy to help.
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-logo">${data.business.name}</div>
              <div class="contact-info">
                ${data.business.email ? `<a href="mailto:${data.business.email}">${data.business.email}</a><br>` : ''}
                ${data.business.phone ? `${data.business.phone}<br>` : ''}
                ${data.business.website ? `<a href="${data.business.website}">${data.business.website}</a>` : ''}
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Invoice ${data.invoice_number} from ${data.business.name}

Hi ${data.client.name},

Please find attached your invoice for ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.total_amount)}.

Invoice Details:
- Invoice Number: ${data.invoice_number}
- Issue Date: ${new Date(data.issue_date).toLocaleDateString()}
- Due Date: ${new Date(data.due_date).toLocaleDateString()}
- Amount Due: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.total_amount)}

${data.notes ? data.notes : 'Thank you for your business!'}

${data.payment_link ? `Pay online: ${data.payment_link}` : 'Please refer to the attached invoice for payment instructions.'}

If you have any questions, please contact us at ${data.business.email}.

Best regards,
${data.business.name}
    `
  }),

  paymentReminder: (data: InvoiceEmailData, daysOverdue: number) => ({
    subject: `Friendly Reminder: Invoice ${data.invoice_number} is ${daysOverdue} days overdue`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Reminder - Invoice ${data.invoice_number}</title>
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
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background-color: #f5f5f5;
          }
          .wrapper {
            width: 100%;
            background-color: #f5f5f5;
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
            background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%);
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
            color: #1a1a1a;
            margin-bottom: 24px;
            font-weight: 500;
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
            box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
          }
          .overdue-badge .icon {
            margin-right: 8px;
            font-size: 20px;
          }
          .invoice-card {
            background: linear-gradient(to bottom, #fef3c7 0%, #fde68a 100%);
            border: 1px solid #fbbf24;
            border-radius: 12px;
            padding: 32px;
            margin-bottom: 32px;
          }
          .invoice-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            margin-bottom: 24px;
          }
          .invoice-item {
            text-align: center;
          }
          .invoice-label {
            display: block;
            font-size: 13px;
            color: #92400e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
            opacity: 0.8;
          }
          .invoice-value {
            display: block;
            font-size: 18px;
            color: #78350f;
            font-weight: 600;
          }
          .amount-due {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
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
            color: #1a1a1a;
            font-size: 15px;
          }
          .timeline-date {
            color: #6b7280;
            font-size: 13px;
          }
          .cta-section {
            text-align: center;
            margin: 40px 0;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white !important;
            padding: 18px 48px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);
            transition: all 0.3s ease;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(220, 38, 38, 0.5);
          }
          .help-section {
            background: #f3f4f6;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
            text-align: center;
          }
          .help-section h3 {
            margin: 0 0 8px 0;
            color: #1a1a1a;
            font-size: 18px;
          }
          .help-section p {
            margin: 0;
            color: #6b7280;
            font-size: 15px;
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
            color: #dc2626;
            margin-bottom: 16px;
          }
          .contact-info {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.6;
          }
          .contact-info a {
            color: #dc2626;
            text-decoration: none;
          }
          @media (max-width: 600px) {
            .wrapper {
              padding: 20px 10px;
            }
            .header {
              padding: 32px 24px;
            }
            .content {
              padding: 32px 24px;
            }
            .invoice-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }
            .cta-button {
              padding: 16px 32px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="logo">⏰</div>
              <h1>Payment Reminder</h1>
              <p>${data.business.name}</p>
            </div>

            <!-- Content -->
            <div class="content">
              <div class="greeting">Hi ${data.client.name} 👋</div>
              
              <div class="overdue-badge">
                <span class="icon">⚠️</span>
                Invoice is ${daysOverdue} days overdue
              </div>

              <p style="color: #4a5568; font-size: 16px; margin-bottom: 32px;">
                We hope you're doing well! This is a friendly reminder about an outstanding invoice that needs your attention.
              </p>

              <!-- Invoice Details Card -->
              <div class="invoice-card">
                <div class="invoice-grid">
                  <div class="invoice-item">
                    <span class="invoice-label">Invoice Number</span>
                    <span class="invoice-value">#${data.invoice_number}</span>
                  </div>
                  <div class="invoice-item">
                    <span class="invoice-label">Original Due Date</span>
                    <span class="invoice-value">${new Date(data.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                
                <div class="amount-due">
                  <span class="label">Outstanding Amount</span>
                  <span class="value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.total_amount)}</span>
                </div>
              </div>

              <!-- Timeline -->
              <div class="timeline">
                <div class="timeline-item">
                  <div class="timeline-icon">📧</div>
                  <div class="timeline-content">
                    <div class="timeline-title">Invoice Sent</div>
                    <div class="timeline-date">${new Date(data.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>
                <div class="timeline-item">
                  <div class="timeline-icon">📅</div>
                  <div class="timeline-content">
                    <div class="timeline-title">Payment Was Due</div>
                    <div class="timeline-date">${new Date(data.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${daysOverdue} days ago)</div>
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

              <!-- Payment Options Section -->
              ${data.payment_link || data.business.paypal_email || data.business.paypal_me_link ? `
                <div class="cta-section">
                  <h3 style="color: #1a1a1a; margin-bottom: 16px; font-size: 18px;">💳 Pay Now - Multiple Options</h3>
                  
                  ${data.payment_link ? `
                    <a href="${data.payment_link}" class="cta-button" style="background: #635bff; margin-bottom: 12px;">
                      Pay with Card →
                    </a>
                    <div style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
                      🔒 Secure payment powered by Stripe
                    </div>
                  ` : ''}
                  
                  ${data.business.paypal_me_link ? `
                    <a href="https://paypal.me/${data.business.paypal_me_link.replace(/^https?:\/\/(www\.)?paypal\.me\//, '')}/${data.total_amount.toFixed(2)}" class="cta-button" style="background: #0070ba; margin-bottom: 12px;">
                      💰 Pay $${data.total_amount.toFixed(2)} via PayPal
                    </a>
                    <div style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
                      🔒 Secure payment via PayPal
                    </div>
                  ` : data.business.paypal_email ? `
                    <div class="payment-option" style="background: #f0f8ff; border: 1px solid #0070ba; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                      <h4 style="color: #0070ba; margin: 0 0 8px 0; font-size: 16px;">💙 Pay with PayPal</h4>
                      <p style="margin: 0 0 8px 0; color: #1a1a1a;">Send payment to: <strong>${data.business.paypal_email}</strong></p>
                      <p style="margin: 0; color: #6b7280; font-size: 14px;">Reference: Invoice ${data.invoice_number}</p>
                    </div>
                  ` : ''}
                  
                  ${data.business.payment_instructions ? `
                    <div class="payment-instructions" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 16px;">
                      <h4 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 16px;">📝 Payment Instructions</h4>
                      <p style="margin: 0; color: #374151; line-height: 1.5;">${data.business.payment_instructions}</p>
                    </div>
                  ` : ''}
                </div>
              ` : `
                <div class="help-section">
                  <h3>📎 Need the Invoice?</h3>
                  <p>The original invoice with payment instructions is attached to this email.</p>
                </div>
              `}

              <div class="help-section">
                <h3>Need Help?</h3>
                <p>If you've already paid or have any questions about this invoice, just reply to this email. We're here to help!</p>
              </div>

              <div class="divider"></div>

              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                Thank you for your prompt attention to this matter. We value your business!
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-logo">${data.business.name}</div>
              <div class="contact-info">
                ${data.business.email ? `<a href="mailto:${data.business.email}">${data.business.email}</a><br>` : ''}
                ${data.business.phone ? `${data.business.phone}<br>` : ''}
                ${data.business.website ? `<a href="${data.business.website}">${data.business.website}</a>` : ''}
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Payment Reminder - Invoice ${data.invoice_number}

Hi ${data.client.name},

This is a friendly reminder that payment for Invoice ${data.invoice_number} was due ${daysOverdue} days ago.

Invoice Details:
- Invoice Number: ${data.invoice_number}
- Original Due Date: ${new Date(data.due_date).toLocaleDateString()}
- Amount Due: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.total_amount)}

To avoid any service interruption or late fees, please process this payment at your earliest convenience.

Payment Options:
${data.payment_link ? `• Pay with Card: ${data.payment_link}` : ''}
${data.business.paypal_me_link ? `• PayPal: https://paypal.me/${data.business.paypal_me_link.replace(/^https?:\/\/(www\.)?paypal\.me\//, '')}/${data.total_amount.toFixed(2)}` : ''}
${data.business.paypal_email ? `• Send PayPal payment to: ${data.business.paypal_email} (Reference: Invoice ${data.invoice_number})` : ''}
${data.business.payment_instructions ? `\nPayment Instructions:\n${data.business.payment_instructions}` : ''}

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

${data.business.name}
${data.business.email}
${data.business.phone || ''}
    `
  }),

  paymentReceived: (data: InvoiceEmailData, amountPaid: number) => ({
    subject: `Thank you! Payment received for Invoice ${data.invoice_number}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Received - Invoice ${data.invoice_number}</title>
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
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background-color: #f5f5f5;
          }
          .wrapper {
            width: 100%;
            background-color: #f5f5f5;
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
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 48px 40px;
            text-align: center;
          }
          .success-animation {
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            margin: 0 auto 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: white;
            animation: pulse 2s ease-in-out infinite;
          }
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.7; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.7; }
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
            color: #1a1a1a;
            margin-bottom: 24px;
            font-weight: 500;
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
          .payment-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 32px;
            margin-bottom: 32px;
          }
          .payment-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
          .payment-item {
            text-align: center;
          }
          .payment-label {
            display: block;
            font-size: 13px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .payment-value {
            display: block;
            font-size: 18px;
            color: #1a1a1a;
            font-weight: 600;
          }
          .payment-value.highlight {
            color: #059669;
            font-size: 24px;
          }
          .receipt-box {
            background: #ecfdf5;
            border: 1px solid #86efac;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
            text-align: center;
          }
          .receipt-box h3 {
            margin: 0 0 12px 0;
            color: #047857;
            font-size: 18px;
            font-weight: 600;
          }
          .receipt-box p {
            margin: 0;
            color: #065f46;
            font-size: 15px;
          }
          .next-steps {
            background: #f3f4f6;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
          }
          .next-steps h3 {
            margin: 0 0 16px 0;
            color: #1a1a1a;
            font-size: 18px;
            font-weight: 600;
          }
          .next-steps ul {
            margin: 0;
            padding-left: 24px;
          }
          .next-steps li {
            color: #4b5563;
            font-size: 15px;
            margin-bottom: 8px;
          }
          .thank-you-message {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            color: #10b981;
            margin-bottom: 16px;
          }
          .contact-info {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.6;
          }
          .contact-info a {
            color: #10b981;
            text-decoration: none;
          }
          @media (max-width: 600px) {
            .wrapper {
              padding: 20px 10px;
            }
            .header {
              padding: 32px 24px;
            }
            .content {
              padding: 32px 24px;
            }
            .payment-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="success-animation">✨</div>
              <h1>Payment Received!</h1>
              <p>${data.business.name}</p>
            </div>

            <!-- Content -->
            <div class="content">
              <div class="greeting">Hi ${data.client.name} 👋</div>
              
              <div class="celebration-banner">
                <h2>🎉 Thank You for Your Payment!</h2>
                <p>We've successfully received and processed your payment.</p>
              </div>

              <!-- Payment Details Card -->
              <div class="payment-card">
                <div class="payment-grid">
                  <div class="payment-item">
                    <span class="payment-label">Invoice Number</span>
                    <span class="payment-value">#${data.invoice_number}</span>
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
                    <span class="payment-value highlight">${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(amountPaid)}</span>
                  </div>
                </div>
              </div>

              <div class="receipt-box">
                <h3>📄 Need a Receipt?</h3>
                <p>A payment receipt has been generated and is available in your account. You can also reply to this email if you need us to send you a copy.</p>
              </div>

              <div class="thank-you-message">
                <h3>We Appreciate Your Business!</h3>
                <p>Thank you for your prompt payment and for choosing ${data.business.name}. We look forward to continuing to work with you.</p>
              </div>

              <div class="next-steps">
                <h3>What's Next?</h3>
                <ul>
                  <li>Your account is now up to date</li>
                  <li>You'll receive a payment receipt for your records</li>
                  <li>No further action is needed on this invoice</li>
                </ul>
              </div>

              <div class="divider"></div>

              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                Questions? Just reply to this email and we'll be happy to help.
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-logo">${data.business.name}</div>
              <div class="contact-info">
                ${data.business.email ? `<a href="mailto:${data.business.email}">${data.business.email}</a><br>` : ''}
                ${data.business.phone ? `${data.business.phone}<br>` : ''}
                ${data.business.website ? `<a href="${data.business.website}">${data.business.website}</a>` : ''}
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Payment Received - Invoice ${data.invoice_number}

Hi ${data.client.name},

Thank you for your payment! We have successfully received your payment of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(amountPaid)} for Invoice ${data.invoice_number}.

Payment Details:
- Invoice Number: ${data.invoice_number}
- Payment Date: ${new Date().toLocaleDateString()}
- Amount Paid: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(amountPaid)}

Your account has been updated to reflect this payment. If you have any questions or need a receipt, please contact us.

We appreciate your business and look forward to working with you again!

${data.business.name}
${data.business.email}
${data.business.phone || ''}
    `
  })
};

export type EmailTemplate = 'newInvoice' | 'paymentReminder' | 'paymentReceived';