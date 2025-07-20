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
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .email-container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
          }
          .header h1 {
            margin: 0;
            color: #1e40af;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 8px 0 0 0;
            color: #64748b;
            font-size: 16px;
          }
          .invoice-details {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .detail-row:last-child {
            margin-bottom: 0;
          }
          .detail-label {
            color: #64748b;
            font-weight: 500;
          }
          .detail-value {
            color: #1e293b;
            font-weight: 600;
          }
          .amount {
            font-size: 24px;
            color: #059669;
            font-weight: 700;
          }
          .message {
            margin: 32px 0;
            padding: 24px;
            background: #fefce8;
            border-left: 4px solid #eab308;
            border-radius: 0 8px 8px 0;
          }
          .message p {
            margin: 0;
            color: #713f12;
          }
          .cta-section {
            text-align: center;
            margin: 40px 0;
          }
          .cta-button {
            display: inline-block;
            background: #2563eb;
            color: white !important;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.2s;
          }
          .cta-button:hover {
            background: #1d4ed8;
          }
          .payment-info {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
          }
          .payment-info h3 {
            margin: 0 0 12px 0;
            color: #1e293b;
            font-size: 16px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }
          .business-contact {
            margin-top: 16px;
          }
          .business-contact p {
            margin: 4px 0;
          }
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            .email-container {
              padding: 24px;
            }
            .detail-row {
              flex-direction: column;
              align-items: flex-start;
              gap: 4px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Invoice ${data.invoice_number}</h1>
            <p>From ${data.business.name}</p>
          </div>

          <div class="invoice-details">
            <div class="detail-row">
              <span class="detail-label">Invoice Number:</span>
              <span class="detail-value">${data.invoice_number}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Issue Date:</span>
              <span class="detail-value">${new Date(data.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Due Date:</span>
              <span class="detail-value">${new Date(data.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount Due:</span>
              <span class="detail-value amount">${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.total_amount)}</span>
            </div>
          </div>

          <div class="message">
            <p>Hi ${data.client.name},</p>
            <br>
            <p>Please find attached your invoice. ${data.notes ? data.notes : 'Thank you for your business!'}</p>
          </div>

          ${data.payment_link ? `
            <div class="cta-section">
              <a href="${data.payment_link}" class="cta-button">
                Pay Invoice Online
              </a>
            </div>

            <div class="payment-info">
              <h3>🔒 Secure Payment</h3>
              <p>Click the button above to pay securely online with your credit card or bank account. Your payment information is protected and encrypted.</p>
            </div>
          ` : `
            <div class="payment-info">
              <h3>Payment Instructions</h3>
              <p>Please refer to the attached invoice for payment details and instructions.</p>
            </div>
          `}

          <div class="footer">
            <p>If you have any questions about this invoice, please contact us.</p>
            
            <div class="business-contact">
              <p><strong>${data.business.name}</strong></p>
              <p>Email: ${data.business.email}</p>
              ${data.business.phone ? `<p>Phone: ${data.business.phone}</p>` : ''}
              ${data.business.website ? `<p>Website: ${data.business.website}</p>` : ''}
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
    subject: `Payment Reminder: Invoice ${data.invoice_number} - ${daysOverdue} days overdue`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Reminder - Invoice ${data.invoice_number}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .email-container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 2px solid #fee2e2;
          }
          .header h1 {
            margin: 0;
            color: #dc2626;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 8px 0 0 0;
            color: #991b1b;
            font-size: 16px;
            font-weight: 600;
          }
          .overdue-notice {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
            text-align: center;
          }
          .overdue-notice h2 {
            margin: 0 0 8px 0;
            color: #dc2626;
            font-size: 20px;
          }
          .overdue-notice p {
            margin: 0;
            color: #991b1b;
          }
          .invoice-details {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .detail-row:last-child {
            margin-bottom: 0;
          }
          .detail-label {
            color: #64748b;
            font-weight: 500;
          }
          .detail-value {
            color: #1e293b;
            font-weight: 600;
          }
          .amount {
            font-size: 24px;
            color: #dc2626;
            font-weight: 700;
          }
          .cta-section {
            text-align: center;
            margin: 40px 0;
          }
          .cta-button {
            display: inline-block;
            background: #dc2626;
            color: white !important;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.2s;
          }
          .cta-button:hover {
            background: #b91c1c;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Payment Reminder</h1>
            <p>Invoice ${data.invoice_number}</p>
          </div>

          <div class="overdue-notice">
            <h2>⚠️ Payment Overdue</h2>
            <p>This invoice is <strong>${daysOverdue} days</strong> past due</p>
          </div>

          <div class="invoice-details">
            <div class="detail-row">
              <span class="detail-label">Invoice Number:</span>
              <span class="detail-value">${data.invoice_number}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Original Due Date:</span>
              <span class="detail-value">${new Date(data.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount Due:</span>
              <span class="detail-value amount">${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.total_amount)}</span>
            </div>
          </div>

          <p>Hi ${data.client.name},</p>
          
          <p>We hope this email finds you well. This is a friendly reminder that payment for Invoice ${data.invoice_number} was due ${daysOverdue} days ago.</p>
          
          <p>To avoid any service interruption or late fees, please process this payment at your earliest convenience.</p>

          ${data.payment_link ? `
            <div class="cta-section">
              <a href="${data.payment_link}" class="cta-button">
                Pay Now
              </a>
            </div>
          ` : ''}

          <p>If you have already sent payment, please disregard this notice. If you have any questions or concerns about this invoice, please don't hesitate to contact us.</p>

          <div class="footer">
            <p>Thank you for your prompt attention to this matter.</p>
            <p><strong>${data.business.name}</strong></p>
            <p>Email: ${data.business.email}</p>
            ${data.business.phone ? `<p>Phone: ${data.business.phone}</p>` : ''}
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

${data.payment_link ? `Pay online: ${data.payment_link}` : ''}

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

${data.business.name}
${data.business.email}
${data.business.phone || ''}
    `
  }),

  paymentReceived: (data: InvoiceEmailData, amountPaid: number) => ({
    subject: `Payment Received - Invoice ${data.invoice_number}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Received - Invoice ${data.invoice_number}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .email-container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 2px solid #dcfce7;
          }
          .header h1 {
            margin: 0;
            color: #059669;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 8px 0 0 0;
            color: #047857;
            font-size: 16px;
            font-weight: 600;
          }
          .success-notice {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
            text-align: center;
          }
          .success-notice h2 {
            margin: 0 0 8px 0;
            color: #059669;
            font-size: 20px;
          }
          .success-notice p {
            margin: 0;
            color: #047857;
          }
          .payment-details {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .detail-row:last-child {
            margin-bottom: 0;
          }
          .detail-label {
            color: #64748b;
            font-weight: 500;
          }
          .detail-value {
            color: #1e293b;
            font-weight: 600;
          }
          .amount {
            font-size: 24px;
            color: #059669;
            font-weight: 700;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Payment Received</h1>
            <p>Thank you!</p>
          </div>

          <div class="success-notice">
            <h2>✅ Payment Confirmed</h2>
            <p>Your payment has been successfully processed</p>
          </div>

          <div class="payment-details">
            <div class="detail-row">
              <span class="detail-label">Invoice Number:</span>
              <span class="detail-value">${data.invoice_number}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Date:</span>
              <span class="detail-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount Paid:</span>
              <span class="detail-value amount">${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(amountPaid)}</span>
            </div>
          </div>

          <p>Hi ${data.client.name},</p>
          
          <p>Thank you for your payment! We have successfully received your payment of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(amountPaid)} for Invoice ${data.invoice_number}.</p>
          
          <p>Your account has been updated to reflect this payment. If you have any questions or need a receipt, please don't hesitate to contact us.</p>

          <p>We appreciate your business and look forward to working with you again!</p>

          <div class="footer">
            <p>Thank you for choosing ${data.business.name}</p>
            <p><strong>${data.business.name}</strong></p>
            <p>Email: ${data.business.email}</p>
            ${data.business.phone ? `<p>Phone: ${data.business.phone}</p>` : ''}
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