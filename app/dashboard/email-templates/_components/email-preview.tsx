"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Eye,
  Monitor,
  Smartphone,
  Send,
  Download,
  RefreshCw,
  Mail
} from "lucide-react";

interface EmailTemplate {
  id: string;
  template_type: 'invoice' | 'payment_reminder' | 'payment_received';
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
  logo_url?: string;
  subject_template?: string;
  greeting_message?: string;
  footer_message?: string;
  font_family?: string;
  header_style?: 'gradient' | 'solid' | 'minimal';
  layout_width?: string;
  header_padding?: string;
  content_padding?: string;
  section_spacing?: string;
  // PayPal fields
  enable_paypal_payments?: boolean;
  paypal_button_text?: string;
  paypal_instructions_text?: string;
  show_paypal_email?: boolean;
  show_paypal_me_link?: boolean;
  paypal_button_color?: string;
}

interface EmailPreviewProps {
  template: EmailTemplate | null;
}

const SAMPLE_DATA = {
  invoice: {
    invoice_number: "INV-2024-001",
    business_name: "Your Business Name",
    client_name: "John Smith",
    client_email: "john@example.com",
    issue_date: "2024-01-15",
    due_date: "2024-02-15",
    amount: 2500.00,
    currency: "USD",
    payment_link: "https://pay.example.com/invoice/123",
    business: {
      name: "Your Business Name",
      email: "business@example.com",
      paypal_email: "payments@example.com",
      paypal_me_link: "yourbusiness"
    }
  },
  payment_reminder: {
    invoice_number: "INV-2024-001",
    business_name: "Your Business Name", 
    client_name: "John Smith",
    days_overdue: 7,
    amount: 2500.00,
    currency: "USD",
    due_date: "2024-02-15",
    issue_date: "2024-01-15"
  },
  payment_received: {
    invoice_number: "INV-2024-001",
    business_name: "Your Business Name",
    client_name: "John Smith",
    amount: 2500.00,
    currency: "USD"
  }
};

// Convert font_family value to CSS font-family string
const getFontFamily = (fontValue?: string): string => {
  switch (fontValue) {
    case 'inter':
      return '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'poppins':
      return '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'helvetica':
      return '"Helvetica Neue", Helvetica, Arial, sans-serif';
    case 'georgia':
      return 'Georgia, "Times New Roman", Times, serif';
    case 'system':
    default:
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  }
};

export function EmailPreview({ template }: EmailPreviewProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('invoice');

  // Early return if template is not properly initialized
  if (!template || !template.id || !template.template_type) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Eye className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Preview Available</h3>
          <p className="text-gray-600">
            Select or create a template to see the live preview.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sampleData = useMemo(() => {
    if (template?.template_type) {
      return SAMPLE_DATA[template.template_type];
    }
    return SAMPLE_DATA[selectedTemplate as keyof typeof SAMPLE_DATA];
  }, [template?.template_type, selectedTemplate]);

  const processTemplate = (text: string, data: any): string => {
    if (!text) return '';
    if (!data) data = {};
    
    return text
      .replace(/\{\{invoice_number\}\}/g, (data && data.invoice_number) ? data.invoice_number : 'INV-001')
      .replace(/\{\{business_name\}\}/g, (data && data.business_name) ? data.business_name : 'Your Business')
      .replace(/\{\{client_name\}\}/g, (data && data.client_name) ? data.client_name : 'Client')
      .replace(/\{\{amount\}\}/g, (data && typeof data.amount === 'number') ? `$${data.amount.toFixed(2)}` : '$0.00')
      .replace(/\{\{days_overdue\}\}/g, (data && typeof data.days_overdue === 'number') ? data.days_overdue.toString() : '0')
      .replace(/\{\{due_date\}\}/g, (data && data.due_date) ? new Date(data.due_date).toLocaleDateString() : new Date().toLocaleDateString())
      .replace(/\{\{issue_date\}\}/g, (data && data.issue_date) ? new Date(data.issue_date).toLocaleDateString() : new Date().toLocaleDateString());
  };

  const generateEmailHTML = (): string => {
    if (!template) return '';

    // Ensure we have valid sample data with all required fields
    const currentData = {
      ...SAMPLE_DATA.invoice, // Always use invoice as base
      ...(sampleData || {}), // Override with specific template data if available
      // Ensure required fields are always present
      invoice_number: sampleData?.invoice_number || 'INV-2024-001',
      business_name: sampleData?.business_name || 'Your Business Name',
      client_name: sampleData?.client_name || 'John Smith',
      amount: sampleData?.amount || 2500.00,
      currency: sampleData?.currency || 'USD',
      issue_date: sampleData?.issue_date || '2024-01-15',
      due_date: sampleData?.due_date || '2024-02-15',
      days_overdue: sampleData?.days_overdue || 7
    };
    const primaryColor = template.primary_color || '#667eea';
    const secondaryColor = template.secondary_color || '#764ba2';
    const accentColor = template.accent_color || '#10b981';
    const textColor = template.text_color || '#1a1a1a';
    const backgroundColor = template.background_color || '#f5f5f5';
    const fontFamily = getFontFamily(template.font_family);
    
    // Layout settings
    const headerStyle = template.header_style || 'gradient';
    const layoutWidth = template.layout_width === 'full' ? '100%' : `${template.layout_width || '600'}px`;
    const headerPadding = `${template.header_padding || '48'}px`;
    const contentPadding = `${template.content_padding || '40'}px`;
    const sectionSpacing = `${template.section_spacing || '32'}px`;
    
    // Generate header background based on style
    const getHeaderBackground = () => {
      switch (headerStyle) {
        case 'solid':
          return primaryColor;
        case 'minimal':
          return '#ffffff';
        case 'gradient':
        default:
          return `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
      }
    };
    
    // Get text color for header based on style
    const getHeaderTextColor = () => {
      return headerStyle === 'minimal' ? textColor : '#ffffff';
    };
    
    console.log('Layout settings:', { headerStyle, layoutWidth, headerPadding, contentPadding, sectionSpacing });

    const subject = processTemplate(template.subject_template || '', currentData);
    const greeting = processTemplate(template.greeting_message || '', currentData);

    const getTemplateSpecificContent = () => {
      // Safe data access with defaults - ensure currentData is defined
      const safeData = {
        invoice_number: (currentData && currentData.invoice_number) ? currentData.invoice_number : 'INV-001',
        issue_date: (currentData && currentData.issue_date) ? currentData.issue_date : new Date().toISOString(),
        due_date: (currentData && currentData.due_date) ? currentData.due_date : new Date().toISOString(),
        amount: (currentData && typeof currentData.amount === 'number') ? currentData.amount : 2500.00,
        days_overdue: (currentData && typeof currentData.days_overdue === 'number') ? currentData.days_overdue : 7,
        business_name: (currentData && currentData.business_name) ? currentData.business_name : 'Your Business',
        client_name: (currentData && currentData.client_name) ? currentData.client_name : 'Client Name'
      };

      switch (template.template_type) {
        case 'invoice':
          return `
            <div class="invoice-card">
              <div class="invoice-grid">
                <div class="invoice-item">
                  <span class="invoice-label">Invoice Number</span>
                  <span class="invoice-value">#${safeData.invoice_number}</span>
                </div>
                <div class="invoice-item">
                  <span class="invoice-label">Issue Date</span>
                  <span class="invoice-value">${new Date(safeData.issue_date).toLocaleDateString()}</span>
                </div>
                <div class="invoice-item">
                  <span class="invoice-label">Due Date</span>
                  <span class="invoice-value">${new Date(safeData.due_date).toLocaleDateString()}</span>
                </div>
                <div class="invoice-item">
                  <span class="invoice-label">Payment Terms</span>
                  <span class="invoice-value">Net 30</span>
                </div>
              </div>
              
              <div class="amount-due">
                <span class="label">Total Amount Due</span>
                <span class="value">$${safeData.amount.toFixed(2)}</span>
              </div>
            </div>
            
            ${template.enable_paypal_payments && currentData?.business ? `
              <div class="paypal-payment-section">
                <h3 class="paypal-instructions">${template.paypal_instructions_text || 'You can also pay using PayPal:'}</h3>
                <div class="paypal-options">
                  ${currentData.business.paypal_me_link ? `
                    <div class="paypal-me-option">
                      <a href="https://paypal.me/${currentData.business.paypal_me_link}/${safeData.amount.toFixed(2)}" 
                         class="paypal-button" style="background-color: ${template.paypal_button_color || '#0070ba'};">
                        💳 ${template.paypal_button_text || 'Pay with PayPal'} $${safeData.amount.toFixed(2)}
                      </a>
                      <div class="paypal-security-note">🔒 Secure payment via PayPal</div>
                    </div>
                  ` : ''}
                  ${currentData.business.paypal_email ? `
                    <div class="paypal-email-option">
                      <div class="paypal-email-instructions">
                        <strong>Or send payment to:</strong>
                        <div class="paypal-email">${currentData.business.paypal_email}</div>
                        <div class="payment-amount">Amount: $${safeData.amount.toFixed(2)}</div>
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          `;
        
        case 'payment_reminder':
          return `
            <div class="overdue-badge">
              <span class="icon">⚠️</span>
              Invoice is ${safeData.days_overdue} days overdue
            </div>
            <div class="invoice-card">
              <div class="invoice-grid">
                <div class="invoice-item">
                  <span class="invoice-label">Invoice Number</span>
                  <span class="invoice-value">#${safeData.invoice_number}</span>
                </div>
                <div class="invoice-item">
                  <span class="invoice-label">Original Due Date</span>
                  <span class="invoice-value">${new Date(safeData.due_date).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div class="amount-due">
                <span class="label">Outstanding Amount</span>
                <span class="value">$${safeData.amount.toFixed(2)}</span>
              </div>
            </div>
          `;
        
        case 'payment_received':
          return `
            <div class="celebration-banner">
              <h2>🎉 Thank You for Your Payment!</h2>
              <p>We've successfully received and processed your payment.</p>
            </div>
            <div class="payment-card">
              <div class="payment-grid">
                <div class="payment-item">
                  <span class="payment-label">Invoice Number</span>
                  <span class="payment-value">#${safeData.invoice_number}</span>
                </div>
                <div class="payment-item">
                  <span class="payment-label">Payment Date</span>
                  <span class="payment-value">${new Date().toLocaleDateString()}</span>
                </div>
                <div class="payment-item">
                  <span class="payment-label">Payment Method</span>
                  <span class="payment-value">Online Payment</span>
                </div>
                <div class="payment-item">
                  <span class="payment-label">Amount Paid</span>
                  <span class="payment-value highlight">$${safeData.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          `;
        
        default:
          return '<div class="placeholder">Email content will appear here</div>';
      }
    };

    const getHeaderIcon = () => {
      switch (template.template_type) {
        case 'invoice':
          return '💼';
        case 'payment_reminder':
          return '⏰';
        case 'payment_received':
          return '✨';
        default:
          return '📧';
      }
    };

    const getHeaderTitle = () => {
      switch (template.template_type) {
        case 'invoice':
          return 'New Invoice';
        case 'payment_reminder':
          return 'Payment Reminder';
        case 'payment_received':
          return 'Payment Received!';
        default:
          return 'Email';
      }
    };

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: ${fontFamily} !important;
            line-height: 1.6;
            color: ${textColor};
            background-color: ${backgroundColor};
          }
          * {
            font-family: ${fontFamily} !important;
          }
          .wrapper {
            width: 100%;
            background-color: ${backgroundColor};
            padding: 40px 20px;
          }
          .container {
            max-width: ${layoutWidth};
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          }
          .header {
            background: ${getHeaderBackground()};
            padding: ${headerPadding} ${contentPadding};
            text-align: center;
            ${headerStyle === 'minimal' ? 'border-bottom: 1px solid #e1e4e8;' : ''}
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
            color: ${getHeaderTextColor()};
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header p {
            margin: 0;
            color: ${headerStyle === 'minimal' ? textColor : 'rgba(255, 255, 255, 0.9)'};
            font-size: 18px;
            font-weight: 400;
          }
          .content {
            padding: ${contentPadding};
          }
          .greeting {
            font-size: 20px;
            color: ${textColor};
            margin-bottom: 24px;
            font-weight: 500;
          }
          .invoice-card, .payment-card {
            background: linear-gradient(to bottom, #fafbfc 0%, #f4f5f7 100%);
            border: 1px solid #e1e4e8;
            border-radius: 12px;
            padding: ${sectionSpacing};
            margin-bottom: ${sectionSpacing};
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
            color: ${textColor};
            font-weight: 600;
          }
          .payment-value.highlight {
            color: ${accentColor};
            font-size: 24px;
          }
          .amount-due {
            background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
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
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
            color: white !important;
            padding: 18px 48px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
          }
          .footer {
            background: #f9fafb;
            padding: 32px 40px;
            text-align: center;
          }
          .footer-logo {
            font-size: 20px;
            font-weight: 700;
            color: ${primaryColor};
            margin-bottom: 16px;
          }
          .contact-info {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.6;
          }
          .placeholder {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            color: #6b7280;
            font-style: italic;
          }
          .paypal-payment-section {
            margin: 32px 0;
            padding: 24px;
            background: #f8f9fa;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
          }
          .paypal-instructions {
            margin: 0 0 16px 0;
            color: #374151;
            font-size: 18px;
            font-weight: 600;
          }
          .paypal-options {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .paypal-me-option {
            text-align: center;
          }
          .paypal-button {
            display: inline-block;
            color: white !important;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 112, 186, 0.2);
          }
          .paypal-security-note {
            color: #6b7280;
            font-size: 14px;
            margin-top: 8px;
          }
          .paypal-email-option {
            background: white;
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #d1d5db;
          }
          .paypal-email-instructions strong {
            color: #374151;
            font-size: 14px;
            display: block;
            margin-bottom: 8px;
          }
          .paypal-email {
            font-family: monospace;
            background: #f3f4f6;
            padding: 8px 12px;
            border-radius: 6px;
            color: #1f2937;
            font-weight: 600;
            font-size: 15px;
            margin: 4px 0;
          }
          .payment-amount {
            color: #059669;
            font-weight: 600;
            font-size: 16px;
            margin-top: 8px;
          }
          @media (max-width: 600px) {
            .wrapper { padding: 20px 10px; }
            .header { padding: 32px 24px; }
            .content { padding: 32px 24px; }
            .invoice-grid, .payment-grid { grid-template-columns: 1fr; gap: 16px; }
            .paypal-payment-section { padding: 16px; }
            .paypal-button { padding: 14px 24px; font-size: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              ${template.logo_url ? `
                <img src="${template.logo_url}" alt="Logo" class="logo-img" style="width: 60px; height: 60px; object-fit: contain; margin: 0 auto 24px; display: block; border-radius: 8px;" />
              ` : `
                <div class="logo">${getHeaderIcon()}</div>
              `}
              <h1>${getHeaderTitle()}</h1>
              <p>${currentData.business_name}</p>
            </div>
            
            <div class="content">
              <div style="background: #f0f0f0; padding: 8px; margin-bottom: 16px; font-size: 12px; border-radius: 4px;">
                <strong>Preview:</strong> Font = ${template.font_family || 'system'} | Header = ${headerStyle} | Width = ${layoutWidth} | Padding = ${contentPadding}
              </div>
              <div class="greeting">Hello ${currentData.client_name} 👋</div>
              
              ${greeting ? `
                <p style="color: #4a5568; font-size: 16px; margin-bottom: 32px;">
                  ${greeting}
                </p>
              ` : ''}

              ${getTemplateSpecificContent()}

              <div style="text-align: center; margin: 40px 0;">
                <a href="#" class="cta-button">
                  ${template.template_type === 'invoice' ? 'Pay Invoice Now →' : 
                    template.template_type === 'payment_reminder' ? 'Pay Now - Quick & Secure →' : 
                    'View Account →'}
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                ${template.footer_message || 'Questions? Just reply to this email and we\'ll be happy to help.'}
              </p>
            </div>

            <div class="footer">
              <div class="footer-logo">${currentData.business_name}</div>
              <div class="contact-info">
                business@example.com<br>
                (555) 123-4567<br>
                www.yourbusiness.com
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const sendTestEmail = async () => {
    if (!template) return;
    
    // This would integrate with the actual email sending API
    const subject = processTemplate(template.subject_template || '', sampleData);
    const htmlContent = generateEmailHTML();
    
    try {
      // await fetch('/api/email-templates/test-send', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     templateId: template.id,
      //     recipient: 'test@example.com',
      //     subject,
      //     htmlContent
      //   })
      // });
      
      console.log('Test email would be sent with:', { subject, htmlContent });
      // toast.success('Test email sent successfully!');
    } catch (error) {
      // toast.error('Failed to send test email');
    }
  };

  if (!template) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Eye className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Preview Available</h3>
          <p className="text-gray-600">
            Select or create a template to see the live preview.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <CardTitle>Live Preview</CardTitle>
              <Badge variant="secondary" className="ml-2">
                {template.template_type.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Select value={previewMode} onValueChange={(value: 'desktop' | 'mobile') => setPreviewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desktop">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Desktop
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Mobile
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={sendTestEmail}>
                <Send className="w-4 h-4 mr-1" />
                Test Send
              </Button>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Subject Line Preview */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Subject:</span>
            </div>
            <p className="font-medium">
              {processTemplate(template.subject_template || 'Email Subject', sampleData)}
            </p>
          </div>

          {/* Email Preview */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className={`bg-white transition-all duration-300 ${
                previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
              }`}
              style={{ 
                transform: previewMode === 'mobile' ? 'scale(0.8)' : 'scale(1)',
                transformOrigin: 'top center'
              }}
            >
              <iframe
                srcDoc={generateEmailHTML()}
                className="w-full border-0"
                style={{ 
                  height: previewMode === 'mobile' ? '800px' : '900px',
                  width: previewMode === 'mobile' ? '400px' : '100%'
                }}
                title="Email Preview"
              />
            </div>
          </div>

          {/* Template Info */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>Colors: </span>
              <div className="flex gap-1">
                <div 
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: template.primary_color }}
                  title="Primary"
                />
                <div 
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: template.secondary_color }}
                  title="Secondary"
                />
                <div 
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: template.accent_color }}
                  title="Accent"
                />
              </div>
              <span className="ml-4">Font: <span className="font-medium" style={{ fontFamily: getFontFamily(template.font_family) }}>{template.font_family || 'System'}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3 h-3" />
              <span>Auto-updating</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}