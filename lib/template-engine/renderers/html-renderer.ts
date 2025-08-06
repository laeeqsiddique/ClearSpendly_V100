import { TemplateConfig, InvoiceData, ColorScheme } from '../types';

export class HTMLRenderer {
  generateCompleteDocument(config: TemplateConfig, invoiceData: InvoiceData): string {
    // Use the custom template's color scheme from the database
    const primaryColor = invoiceData.template.color_scheme || '#1e40af';
    const colorScheme = this.generateColorScheme(primaryColor);
    
    // Using custom template color scheme
    
    // Process data for consistent rendering
    const processedData = this.processInvoiceData(invoiceData);
    
    // Generate the complete HTML document
    return this.generateDocumentHTML(config, processedData, colorScheme);
  }

  render(config: TemplateConfig, invoiceData: InvoiceData): string {
    const primaryColor = invoiceData.template.color_scheme || '#1e40af';
    const colorScheme = this.generateColorScheme(primaryColor);
    
    // Process data for consistent rendering
    const processedData = this.processInvoiceData(invoiceData);
    
    // Generate content only (without document wrapper)
    return this.renderTemplateContent(config, processedData, colorScheme);
  }

  private generateDocumentHTML(config: TemplateConfig, data: ProcessedInvoiceData, colors: ColorScheme): string {
    const templateContent = this.renderTemplateContent(config, data, colors);
    const fontFamily = this.getFontFamily(config.primaryFont);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${data.invoice_number}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Open+Sans:wght@300;400;500;600;700;800&family=Roboto:wght@100;300;400;500;700;900&family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap');
        
        :root {
          --primary-color: ${colors.primary};
          --secondary-color: ${colors.secondary};
          --accent-color: ${colors.accent};
          --text-color: ${colors.text};
          --text-secondary: ${colors.textSecondary};
          --background-color: ${colors.background};
          --border-color: ${colors.border};
        }
        
        body { 
            margin: 0; 
            padding: 20px; 
            background: white;
            font-family: ${fontFamily};
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            font-size: ${config.fontSizeBase};
        }
        
        .invoice-container {
            ${config.styles.html.container}
        }

        @media print {
            body { margin: 0; padding: 0; }
            .invoice-container { margin: 0; max-width: none; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        ${templateContent}
    </div>
</body>
</html>`;
  }

  private renderTemplateContent(config: TemplateConfig, data: ProcessedInvoiceData, colors: ColorScheme): string {
    // Use EXACT SAME template rendering logic as ReactRenderer
    return this.renderTemplate(config, data, colors);
  }

  private renderTemplate(config: TemplateConfig, data: ProcessedInvoiceData, colors: ColorScheme): string {
    console.log('HTML Renderer using CUSTOM template with all settings:', {
      templateName: data.template.name,
      templateType: config.type,
      colorScheme: colors.primary,
      companyName: data.business.name,
      logoUrl: data.business.logo_url,
      logoPosition: data.business.logo_position,
      logoSize: data.business.logo_size
    });

    // Dynamic header with logo positioning
    const logoAlignment = this.getLogoAlignment(data.business.logo_position);
    const logoSection = data.business.logo_url ? `
      <div style="margin-bottom: 16px; ${logoAlignment}">
        <img 
          src="${data.business.logo_url}" 
          alt="Company Logo" 
          style="height: ${this.getLogoHeight(data.business.logo_size)}px; width: auto; object-fit: contain;"
        />
      </div>
    ` : '';

    // Use CUSTOM renderers that apply all user settings
    switch (config.type) {
      case 'executive-professional':
        return this.renderCustomExecutiveProfessional(config, data, colors, logoSection, logoAlignment);
      case 'modern-creative':
        return this.renderCustomModernCreative(config, data, colors, logoSection, logoAlignment);
      case 'minimal-scandinavian':
        return this.renderCustomMinimalScandinavian(config, data, colors, logoSection, logoAlignment);
      case 'traditional-corporate':
      default:
        return this.renderCustomTraditionalCorporate(config, data, colors, logoSection, logoAlignment);
    }
  }

  private getLogoAlignment(position: string = 'left'): string {
    switch (position) {
      case 'center': return 'text-align: center;';
      case 'right': return 'text-align: right;';
      case 'left':
      default: return 'text-align: left;';
    }
  }

  // Custom template renderers that match React renderer output exactly
  private renderCustomTraditionalCorporate(config: TemplateConfig, data: ProcessedInvoiceData, colors: ColorScheme, logoSection: string, logoAlignment: string): string {
    return `
    <!-- Traditional Corporate Template with Custom Settings -->
    <div style="max-width: 210mm; margin: 0 auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
      
      <!-- Header with Custom Color and Logo -->
      <div style="background: ${colors.primary}; padding: 32px; color: white;">
        ${logoSection}
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="font-size: 32px; font-weight: bold; margin: 0; color: white;">
              ${data.business.name}
            </h1>
            <div style="margin-top: 8px; font-size: 14px; color: rgba(255,255,255,0.9);">
              ${data.business.email ? `<div>${data.business.email}</div>` : ''}
              ${data.business.phone ? `<div>${data.business.phone}</div>` : ''}
              ${data.business.address ? `<div style="white-space: pre-line; margin-top: 8px;">${data.business.address}</div>` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin: 0 0 8px 0;">INVOICE</h2>
            <div style="font-size: 14px; color: rgba(255,255,255,0.9);">
              <div><strong>Invoice #:</strong> ${data.invoice_number}</div>
              <div><strong>Date:</strong> ${data.issue_date}</div>
              <div><strong>Due:</strong> ${data.due_date}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="padding: 32px;">
        <!-- Bill To -->
        <div style="margin-bottom: 32px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 4px;">
          <h3 style="font-weight: bold; color: #111827; margin: 0 0 8px 0;">BILL TO:</h3>
          <div style="font-size: 14px; color: #374151;">
            <div style="font-weight: 500; font-size: 16px;">${data.client.name}</div>
            ${data.client.company_name ? `<div style="font-weight: 500;">${data.client.company_name}</div>` : ''}
            ${data.client.address ? `<div style="white-space: pre-line; margin-top: 4px;">${data.client.address}</div>` : ''}
            ${data.client.email ? `<div style="font-size: 14px; margin-top: 4px; color: #6b7280;">${data.client.email}</div>` : ''}
          </div>
        </div>

        ${data.subject ? `
        <div style="background: #dbeafe; border-left: 4px solid ${colors.primary}; padding: 16px; border-radius: 0 4px 4px 0; margin-bottom: 32px;">
          <h3 style="font-weight: bold; color: #111827; margin: 0 0 8px 0;">Subject:</h3>
          <p style="color: #1f2937; margin: 0;">${data.subject}</p>
        </div>
        ` : ''}

        <!-- Items Table -->
        <div style="margin-bottom: 32px;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background-color: ${colors.primary}; color: white;">
                <th style="padding: 12px; text-align: left; font-weight: 600;">Description</th>
                <th style="padding: 12px; text-align: center; width: 80px; font-weight: 600;">Qty</th>
                <th style="padding: 12px; text-align: right; width: 96px; font-weight: 600;">Rate</th>
                <th style="padding: 12px; text-align: right; width: 96px; font-weight: 600;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map((item, index) => `
              <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 1 ? 'background-color: #f9fafb;' : ''}">
                <td style="padding: 12px; color: #374151;">${item.description}</td>
                <td style="padding: 12px; text-align: center; color: #374151;">${item.quantity}</td>
                <td style="padding: 12px; text-align: right; color: #374151;">$${item.rate.toFixed(2)}</td>
                <td style="padding: 12px; text-align: right; font-weight: 500; color: #374151;">$${item.amount.toFixed(2)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- Totals -->
          <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
            <div style="min-width: 200px;">
              <div style="background: #f9fafb; display: flex; justify-content: space-between; padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">
                <span style="font-size: 14px; font-weight: 500; color: #374151;">Subtotal:</span>
                <span style="font-size: 14px; font-weight: 500; color: #111827;">$${data.subtotal.toFixed(2)}</span>
              </div>
              ${data.show_tax ? `
              <div style="background: #f9fafb; display: flex; justify-content: space-between; padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">
                <span style="font-size: 14px; font-weight: 500; color: #374151;">Tax (${(data.tax_rate * 100).toFixed(1)}%):</span>
                <span style="font-size: 14px; font-weight: 500; color: #111827;">$${data.tax_amount.toFixed(2)}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 12px 16px; background-color: ${colors.primary}; color: white;">
                <span style="font-weight: bold;">TOTAL:</span>
                <span style="font-weight: bold; font-size: 18px;">$${data.display_total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        ${(data.notes || data.terms) ? `
        <!-- Footer -->
        <div style="border-top: 2px solid #d1d5db; padding-top: 24px;">
          <div style="font-size: 14px; color: #374151;">
            ${data.terms ? `<div><strong>Payment Terms:</strong> ${data.terms}</div>` : ''}
            ${data.notes ? `<div style="margin-top: 8px;"><strong>Notes:</strong> ${data.notes}</div>` : ''}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
  }

  private renderCustomModernCreative(config: TemplateConfig, data: ProcessedInvoiceData, colors: ColorScheme, logoSection: string, logoAlignment: string): string {
    return `
    <!-- Modern Creative Template with Custom Settings -->
    <div style="max-width: 210mm; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      
      <!-- Modern Header with Custom Gradient -->
      <div style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%); padding: 32px; color: white;">
        ${logoSection}
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="font-size: 28px; font-weight: 300; margin: 0; color: white; letter-spacing: -0.5px;">
              ${data.business.name}
            </h1>
            <div style="margin-top: 12px; font-size: 14px; color: rgba(255,255,255,0.9);">
              ${data.business.email ? `<div>✉ ${data.business.email}</div>` : ''}
              ${data.business.phone ? `<div>📞 ${data.business.phone}</div>` : ''}
              ${data.business.address ? `<div style="white-space: pre-line; margin-top: 8px;">${data.business.address}</div>` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <h2 style="font-size: 16px; font-weight: 500; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px 0;">Invoice</h2>
            <p style="font-size: 28px; font-weight: bold; color: white; margin: 0; letter-spacing: -0.5px;">
              #${data.invoice_number}
            </p>
          </div>
        </div>
      </div>

      <div style="padding: 32px;">
        <!-- Modern Info Cards -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; border-left: 4px solid ${colors.primary};">
            <h3 style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; color: ${colors.primary};">Invoice Details</h3>
            <div style="font-size: 14px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6b7280;">Issue Date:</span>
                <span style="font-weight: 500;">${data.issue_date}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Due Date:</span>
                <span style="font-weight: 500;">${data.due_date}</span>
              </div>
            </div>
          </div>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; border-left: 4px solid ${colors.primary};">
            <h3 style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; color: ${colors.primary};">Bill To</h3>
            <div style="font-size: 14px;">
              <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${data.client.name}</div>
              ${data.client.company_name ? `<div style="color: #374151; margin-bottom: 4px;">${data.client.company_name}</div>` : ''}
              ${data.client.email ? `<div style="color: #6b7280; margin-bottom: 4px;">${data.client.email}</div>` : ''}
              ${data.client.address ? `<div style="color: #6b7280; font-size: 12px; white-space: pre-line; margin-top: 4px;">${data.client.address}</div>` : ''}
            </div>
          </div>
        </div>

        ${data.subject ? `
        <div style="background: linear-gradient(90deg, #dbeafe, #e0e7ff); border-radius: 8px; padding: 16px; border-left: 4px solid ${colors.primary}; margin-bottom: 32px;">
          <h3 style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; color: ${colors.primary};">Subject</h3>
          <p style="font-size: 14px; color: #1f2937; margin: 0;">${data.subject}</p>
        </div>
        ` : ''}
        
        <!-- Modern Table -->
        <div style="margin-bottom: 32px;">
          <div style="border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead style="background: linear-gradient(45deg, #f9fafb, #f3f4f6);">
                <tr>
                  <th style="padding: 16px; text-align: left; font-weight: 600; color: #374151;">Description</th>
                  <th style="padding: 16px; text-align: center; width: 80px; font-weight: 600; color: #374151;">Qty</th>
                  <th style="padding: 16px; text-align: right; width: 96px; font-weight: 600; color: #374151;">Rate</th>
                  <th style="padding: 16px; text-align: right; width: 112px; font-weight: 600; color: #374151;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map((item, index) => `
                <tr style="border-bottom: 1px solid #f1f5f9; ${index % 2 === 1 ? 'background-color: #fafbfc;' : ''}">
                  <td style="padding: 16px; color: #111827; font-weight: 500;">${item.description}</td>
                  <td style="padding: 16px; text-align: center; color: #374151; font-weight: 500;">${item.quantity}</td>
                  <td style="padding: 16px; text-align: right; color: #374151; font-weight: 500;">$${item.rate.toFixed(2)}</td>
                  <td style="padding: 16px; text-align: right; font-weight: 600; color: #111827;">$${item.amount.toFixed(2)}</td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <!-- Modern Totals -->
          <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
            <div style="min-width: 250px; background: #f8fafc; border-radius: 8px; padding: 16px;">
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
                  <span style="color: #6b7280;">Subtotal</span>
                  <span style="font-weight: 500;">$${data.subtotal.toFixed(2)}</span>
                </div>
                ${data.show_tax ? `
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                  <span style="color: #6b7280;">Tax (${(data.tax_rate * 100).toFixed(1)}%)</span>
                  <span style="font-weight: 500;">$${data.tax_amount.toFixed(2)}</span>
                </div>
                ` : ''}
              </div>
              <div style="border-top: 2px solid ${colors.primary}; padding-top: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
                  <span>Total</span>
                  <span style="color: ${colors.primary};">$${data.display_total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        ${(data.notes || data.terms) ? `
        <!-- Modern Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          ${data.notes ? `
          <div>
            <h4 style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; color: ${colors.primary};">Notes</h4>
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0;">${data.notes}</p>
          </div>
          ` : ''}
          ${data.terms ? `
          <div>
            <h4 style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; color: ${colors.primary};">Payment Terms</h4>
            <p style="font-size: 14px; color: #6b7280; margin: 0;">${data.terms}</p>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    </div>
  `;
  }

  private renderCustomMinimalScandinavian(config: TemplateConfig, data: ProcessedInvoiceData, colors: ColorScheme, logoSection: string, logoAlignment: string): string {
    return `
    <!-- Minimal Scandinavian Template with Custom Settings -->
    <div style="max-width: 210mm; margin: 0 auto; background: white; padding: 48px; font-family: 'Inter', sans-serif;">
      
      <!-- Minimal Header -->
      <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 32px; margin-bottom: 48px;">
        ${logoSection}
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="font-size: 24px; font-weight: 400; color: #111827; margin: 0; letter-spacing: -0.025em;">
              ${data.business.name}
            </h1>
            <div style="margin-top: 12px; font-size: 14px; color: #6b7280; line-height: 1.5;">
              ${data.business.email ? `<div>${data.business.email}</div>` : ''}
              ${data.business.phone ? `<div>${data.business.phone}</div>` : ''}
              ${data.business.address ? `<div style="white-space: pre-line; margin-top: 8px;">${data.business.address}</div>` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <h2 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: #9ca3af; margin: 0 0 8px 0; font-weight: 500;">Invoice</h2>
            <p style="font-size: 20px; font-weight: 500; color: #111827; margin: 0;">
              #${data.invoice_number}
            </p>
          </div>
        </div>
      </div>

      <!-- Minimal Info Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; font-size: 14px; margin-bottom: 48px;">
        <div>
          <div style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-size: 12px; font-weight: 500;">Issue Date</div>
          <div style="color: #111827; font-weight: 500;">${data.issue_date}</div>
        </div>
        <div>
          <div style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-size: 12px; font-weight: 500;">Due Date</div>
          <div style="color: #111827; font-weight: 500;">${data.due_date}</div>
        </div>
        <div>
          <div style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-size: 12px; font-weight: 500;">Bill To</div>
          <div style="color: #111827;">
            <div style="font-weight: 500; margin-bottom: 2px;">${data.client.name}</div>
            ${data.client.company_name ? `<div style="font-size: 13px; color: #6b7280;">${data.client.company_name}</div>` : ''}
            ${data.client.email ? `<div style="font-size: 13px; color: #6b7280;">${data.client.email}</div>` : ''}
            ${data.client.address ? `<div style="font-size: 12px; color: #9ca3af; white-space: pre-line; margin-top: 4px;">${data.client.address}</div>` : ''}
          </div>
        </div>
      </div>

      ${data.subject ? `
      <div style="margin-bottom: 48px;">
        <div style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; margin-bottom: 8px; font-weight: 500;">Subject</div>
        <div style="font-size: 16px; color: #111827; font-weight: 500;">${data.subject}</div>
      </div>
      ` : ''}
      
      <!-- Minimal Table -->
      <div style="margin-bottom: 48px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #111827;">
              <th style="text-align: left; padding: 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #111827; font-weight: 500;">Description</th>
              <th style="text-align: center; padding: 12px 0; width: 64px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #111827; font-weight: 500;">Qty</th>
              <th style="text-align: right; padding: 12px 0; width: 80px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #111827; font-weight: 500;">Rate</th>
              <th style="text-align: right; padding: 12px 0; width: 80px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #111827; font-weight: 500;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item, index) => `
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 16px 0; color: #111827; font-weight: 500;">${item.description}</td>
              <td style="padding: 16px 0; text-align: center; color: #6b7280;">${item.quantity}</td>
              <td style="padding: 16px 0; text-align: right; color: #6b7280;">$${item.rate.toFixed(2)}</td>
              <td style="padding: 16px 0; text-align: right; color: #111827; font-weight: 600;">$${item.amount.toFixed(2)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        
        <!-- Minimal Totals -->
        <div style="display: flex; justify-content: flex-end; margin-top: 32px;">
          <div style="min-width: 200px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
              <span style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; font-weight: 500;">Subtotal</span>
              <span style="color: #111827; font-weight: 500;">$${data.subtotal.toFixed(2)}</span>
            </div>
            ${data.show_tax ? `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
              <span style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; font-weight: 500;">Tax</span>
              <span style="color: #111827; font-weight: 500;">$${data.tax_amount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #111827; font-size: 16px;">
              <span style="color: #111827; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; font-size: 14px;">Total</span>
              <span style="color: #111827; font-weight: 700;">$${data.display_total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      ${(data.notes || data.terms) ? `
      <!-- Minimal Footer -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
        ${data.notes ? `
        <div>
          <div style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; margin-bottom: 12px; font-weight: 500;">Notes</div>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0;">${data.notes}</p>
        </div>
        ` : ''}
        ${data.terms ? `
        <div>
          <div style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; margin-bottom: 12px; font-weight: 500;">Payment Terms</div>
          <p style="font-size: 14px; color: #6b7280; margin: 0;">${data.terms}</p>
        </div>
        ` : ''}
      </div>
      ` : ''}
    </div>
  `;
  }

  private renderCustomExecutiveProfessional(config: TemplateConfig, data: ProcessedInvoiceData, colors: ColorScheme, logoSection: string, logoAlignment: string): string {
    return `
    <!-- Executive Professional Template with Custom Settings -->
    <div style="max-width: 210mm; margin: 0 auto; background: white; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;">
      
      <!-- Executive Header with Custom Gradient -->
      <div style="background: linear-gradient(45deg, ${colors.primary}, ${colors.secondary}, ${colors.primary}); color: white; padding: 40px; position: relative; overflow: hidden;">
        
        <!-- Decorative Elements -->
        <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.3;"></div>
        <div style="position: absolute; bottom: -30px; left: -30px; width: 150px; height: 150px; background: rgba(255,255,255,0.08); border-radius: 50%; opacity: 0.4;"></div>
        
        ${logoSection}
        <div style="display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1;">
          <div>
            <h1 style="font-size: 42px; font-weight: 900; color: white; margin: 0 0 12px 0; letter-spacing: -0.025em; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              ${data.business.name}
            </h1>
            <div style="font-size: 16px; color: rgba(255,255,255,0.9); line-height: 1.5;">
              ${data.business.email ? `<div>📧 ${data.business.email}</div>` : ''}
              ${data.business.phone ? `<div>📱 ${data.business.phone}</div>` : ''}
              ${data.business.address ? `<div style="white-space: pre-line; margin-top: 8px;">${data.business.address}</div>` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <h2 style="font-size: 16px; font-weight: bold; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.3em; margin: 0 0 12px 0;">Invoice</h2>
            <p style="font-size: 42px; font-weight: 900; color: white; letter-spacing: -0.025em; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              #${data.invoice_number}
            </p>
          </div>
        </div>
      </div>

      <div style="padding: 40px;">
        <!-- Executive Info Cards -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
          <div style="background: linear-gradient(135deg, #111827, #374151); color: white; border-radius: 12px; padding: 24px;">
            <h3 style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 16px 0; color: #d1d5db;">Invoice Details</h3>
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #d1d5db; font-weight: 500;">Issue Date</span>
                <span style="font-weight: bold;">${data.issue_date}</span>
              </div>
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #d1d5db; font-weight: 500;">Due Date</span>
                <span style="font-weight: bold;">${data.due_date}</span>
              </div>
            </div>
          </div>
          
          <div style="border: 2px solid ${colors.primary}; border-radius: 12px; padding: 24px; background: linear-gradient(135deg, #f8fafc, #f1f5f9);">
            <h3 style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 16px 0; color: ${colors.primary};">Bill To</h3>
            <div>
              <div style="font-weight: 900; font-size: 18px; color: #111827; margin-bottom: 8px;">${data.client.name}</div>
              ${data.client.company_name ? `<div style="font-weight: bold; color: #374151; margin-bottom: 4px;">${data.client.company_name}</div>` : ''}
              ${data.client.email ? `<div style="color: #6b7280; font-weight: 500; margin-bottom: 4px;">${data.client.email}</div>` : ''}
              ${data.client.address ? `<div style="color: #6b7280; font-size: 14px; white-space: pre-line; margin-top: 8px;">${data.client.address}</div>` : ''}
            </div>
          </div>
        </div>

        ${data.subject ? `
        <!-- Executive Subject -->
        <div style="background: linear-gradient(90deg, #fef3c7, #fed7aa); border-left: 6px solid ${colors.primary}; border-radius: 0 12px 12px 0; padding: 24px; margin-bottom: 32px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
          <h3 style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 12px 0; color: ${colors.primary};">Subject</h3>
          <p style="color: #1f2937; font-weight: 600; font-size: 18px; margin: 0; line-height: 1.4;">${data.subject}</p>
        </div>
        ` : ''}
        
        <!-- Executive Items Table -->
        <div style="margin-bottom: 32px;">
          <table style="width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            <thead style="background: linear-gradient(45deg, ${colors.primary}, ${colors.secondary});">
              <tr>
                <th style="padding: 20px; text-align: left; font-weight: 700; color: white; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Description</th>
                <th style="padding: 20px; text-align: center; width: 80px; font-weight: 700; color: white; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Qty</th>
                <th style="padding: 20px; text-align: right; width: 96px; font-weight: 700; color: white; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Rate</th>
                <th style="padding: 20px; text-align: right; width: 112px; font-weight: 700; color: white; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map((item, index) => `
              <tr style="background-color: ${index % 2 === 0 ? '#f9fafb' : 'white'}; border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 20px; font-weight: 600; color: #111827; font-size: 15px;">${item.description}</td>
                <td style="padding: 20px; text-align: center; font-weight: bold; color: #374151;">${item.quantity}</td>
                <td style="padding: 20px; text-align: right; font-weight: bold; color: #374151;">$${item.rate.toFixed(2)}</td>
                <td style="padding: 20px; text-align: right; font-weight: 900; color: #111827; font-size: 16px;">$${item.amount.toFixed(2)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- Executive Totals -->
          <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
            <div style="background: linear-gradient(135deg, #111827, #374151); color: white; border-radius: 12px; padding: 24px; min-width: 300px; box-shadow: 0 8px 16px rgba(0,0,0,0.2);">
              <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
                  <span style="color: #d1d5db; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Subtotal</span>
                  <span style="font-weight: bold;">$${data.subtotal.toFixed(2)}</span>
                </div>
                ${data.show_tax ? `
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                  <span style="color: #d1d5db; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Tax (${(data.tax_rate * 100).toFixed(1)}%)</span>
                  <span style="font-weight: bold;">$${data.tax_amount.toFixed(2)}</span>
                </div>
                ` : ''}
              </div>
              <div style="border-top: 2px solid #374151; padding-top: 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 28px; font-weight: 900;">
                  <span style="text-transform: uppercase; letter-spacing: 0.05em;">Total</span>
                  <span style="color: #fbbf24; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">$${data.display_total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        ${(data.notes || data.terms) ? `
        <!-- Executive Footer -->
        <div style="border-top: 2px solid #e5e7eb; padding-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
          ${data.notes ? `
          <div>
            <h4 style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 16px 0; color: ${colors.primary};">Notes</h4>
            <p style="font-size: 15px; color: #374151; line-height: 1.6; font-weight: 500; margin: 0;">${data.notes}</p>
          </div>
          ` : ''}
          ${data.terms ? `
          <div>
            <h4 style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 16px 0; color: ${colors.primary};">Payment Terms</h4>
            <p style="font-size: 15px; color: #374151; font-weight: 500; margin: 0;">${data.terms}</p>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    </div>
  `;
  }

  private renderExecutiveProfessional(config: TemplateConfig, data: ProcessedInvoiceData, colors: ColorScheme): string {
    return `
    <!-- Executive Professional Template -->
    <div style="${config.styles.html.container}">
      
      <!-- Header Background -->
      <div style="${config.styles.html.header} background: linear-gradient(45deg, ${colors.primary}, ${colors.secondary}, ${colors.primary}); color: white;">
        
        <!-- Decorative Elements -->
        <div style="${config.styles.html.inlineStyles['decorative-bg']}">
          <div style="${config.styles.html.inlineStyles['decorative-circle-1']}"></div>
          <div style="${config.styles.html.inlineStyles['decorative-circle-2']}"></div>
        </div>
        
        <div style="${config.styles.html.headerContent}">
          <div style="display: flex; align-items: center; gap: 24px;">
            ${data.business.logo_url ? `
            <div style="${config.styles.html.logo}">
              <img 
                src="${data.business.logo_url}" 
                alt="Company Logo" 
                style="height: ${this.getLogoHeight(data.business.logo_size)}px; width: auto; object-fit: contain;"
              />
            </div>
            ` : ''}
            <div>
              ${data.business.name ? `
              <h1 style="font-size: 36px; font-weight: 900; color: white; margin: 0 0 8px 0; letter-spacing: -0.025em;">
                ${data.business.name}
              </h1>
              ` : ''}
              <div style="${config.styles.html.companyInfo}">
                ${data.business.email ? `<div>📧 ${data.business.email}</div>` : ''}
                ${data.business.phone ? `<div>📱 ${data.business.phone}</div>` : ''}
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="${config.styles.html.invoiceInfo}">
              <h2 style="font-size: 14px; font-weight: bold; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.3em; margin: 0 0 8px 0;">Invoice</h2>
              <p style="font-size: 36px; font-weight: 900; color: white; letter-spacing: -0.025em; margin: 0;">
                #${data.invoice_number}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style="padding: 40px;">
        <!-- Invoice Details -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
          <div style="background: linear-gradient(135deg, #111827, #374151); color: white; border-radius: 12px; padding: 24px;">
            <h3 style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 16px 0; color: #d1d5db;">Invoice Details</h3>
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #d1d5db; font-weight: 500;">Issue Date</span>
                <span style="font-weight: bold;">${data.issue_date}</span>
              </div>
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #d1d5db; font-weight: 500;">Due Date</span>
                <span style="font-weight: bold;">${data.due_date}</span>
              </div>
            </div>
          </div>
          
          <div style="${config.styles.html.clientSection} border-color: ${colors.primary};">
            <h3 style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 16px 0; color: ${colors.primary};">Bill To</h3>
            <div>
              <div style="font-weight: 900; font-size: 18px; color: #111827; margin-bottom: 8px;">${data.client.name}</div>
              ${data.client.company_name ? `<div style="font-weight: bold; color: #374151; margin-bottom: 4px;">${data.client.company_name}</div>` : ''}
              ${data.client.email ? `<div style="color: #6b7280; font-weight: 500; margin-bottom: 4px;">${data.client.email}</div>` : ''}
              ${data.client.address ? `<div style="color: #6b7280; font-size: 14px; white-space: pre-line; margin-top: 8px;">${data.client.address}</div>` : ''}
            </div>
          </div>
        </div>

        ${data.subject ? `
        <!-- Subject -->
        <div style="background: linear-gradient(90deg, #fef3c7, #fed7aa); border-left: 4px solid ${colors.primary}; border-radius: 0 12px 12px 0; padding: 24px; margin-bottom: 32px;">
          <h3 style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 12px 0; color: ${colors.primary};">Subject</h3>
          <p style="color: #1f2937; font-weight: 500; font-size: 18px; margin: 0;">${data.subject}</p>
        </div>
        ` : ''}
        
        <!-- Items Table -->
        <div style="margin-bottom: 32px;">
          <table style="${config.styles.html.itemsTable.container} border-color: ${colors.primary};">
            <thead style="background-color: ${colors.primary};">
              <tr>
                <th style="${config.styles.html.itemsTable.header}">Description</th>
                <th style="${config.styles.html.itemsTable.header} text-align: center; width: 80px;">Qty</th>
                <th style="${config.styles.html.itemsTable.header} text-align: right; width: 96px;">Rate</th>
                <th style="${config.styles.html.itemsTable.header} text-align: right; width: 112px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map((item, index) => `
              <tr style="${config.styles.html.itemsTable.row} background-color: ${index % 2 === 0 ? '#f9fafb' : 'white'};">
                <td style="${config.styles.html.itemsTable.cell} font-weight: 500; color: #111827;">${item.description}</td>
                <td style="${config.styles.html.itemsTable.cell} text-align: center; font-weight: bold; color: #374151;">${item.quantity}</td>
                <td style="${config.styles.html.itemsTable.cell} text-align: right; font-weight: bold; color: #374151;">$${item.rate.toFixed(2)}</td>
                <td style="${config.styles.html.itemsTable.cell} text-align: right; font-weight: 900; color: #111827;">$${item.amount.toFixed(2)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- Totals -->
          <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
            <div style="${config.styles.html.totals}">
              <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
                  <span style="color: #d1d5db; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Subtotal</span>
                  <span style="font-weight: bold;">$${data.subtotal.toFixed(2)}</span>
                </div>
                ${data.show_tax ? `
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                  <span style="color: #d1d5db; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Tax (${(data.tax_rate * 100).toFixed(1)}%)</span>
                  <span style="font-weight: bold;">$${data.tax_amount.toFixed(2)}</span>
                </div>
                ` : ''}
              </div>
              <div style="border-top: 2px solid #374151; padding-top: 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 24px; font-weight: 900;">
                  <span style="text-transform: uppercase; letter-spacing: 0.05em;">Total</span>
                  <span style="color: #fbbf24;">$${data.display_total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        ${(data.notes || data.terms) ? `
        <!-- Footer -->
        <div style="${config.styles.html.footer}">
          ${data.notes ? `
          <div>
            <h4 style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 16px 0; color: ${colors.primary};">Notes</h4>
            <p style="font-size: 14px; color: #374151; line-height: 1.6; font-weight: 500; margin: 0;">${data.notes}</p>
          </div>
          ` : ''}
          ${data.terms ? `
          <div>
            <h4 style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 16px 0; color: ${colors.primary};">Payment Terms</h4>
            <p style="font-size: 14px; color: #374151; font-weight: 500; margin: 0;">${data.terms}</p>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    </div>
  `;
  }

  private renderModernCreative(config: TemplateConfig, data: ProcessedInvoiceData, colors: ColorScheme): string {
    return `
    <!-- Modern Creative Template -->
    <div style="${config.styles.html.container}">
      
      <!-- Modern Header -->
      <div style="${config.styles.html.header} background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%); color: white;">
        <div style="${config.styles.html.headerContent}">
          <div style="display: flex; align-items: center; gap: 16px;">
            ${data.business.logo_url ? `
            <div style="${config.styles.html.logo}">
              <img 
                src="${data.business.logo_url}" 
                alt="Company Logo" 
                style="height: ${this.getLogoHeight(data.business.logo_size)}px; width: auto; object-fit: contain;"
              />
            </div>
            ` : ''}
            <div>
              ${data.business.name ? `
              <h1 style="font-size: 24px; font-weight: 300; color: white; margin: 0 0 8px 0;">
                ${data.business.name}
              </h1>
              ` : ''}
              <div style="${config.styles.html.companyInfo}">
                ${data.business.email ? `<div>✉ ${data.business.email}</div>` : ''}
                ${data.business.phone ? `<div>📞 ${data.business.phone}</div>` : ''}
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="${config.styles.html.invoiceInfo}">
              <h2 style="font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 4px 0;">Invoice</h2>
              <p style="font-size: 24px; font-weight: bold; color: white; margin: 0;">
                #${data.invoice_number}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style="padding: 32px;">
        <!-- Modern Info Cards -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
          <div style="${config.styles.html.clientSection}">
            <h3 style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; color: ${colors.primary};">Invoice Details</h3>
            <div style="font-size: 14px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6b7280;">Issue Date:</span>
                <span style="font-weight: 500;">${data.issue_date}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Due Date:</span>
                <span style="font-weight: 500;">${data.due_date}</span>
              </div>
            </div>
          </div>
          
          <div style="${config.styles.html.clientSection}">
            <h3 style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; color: ${colors.primary};">Bill To</h3>
            <div style="font-size: 14px;">
              <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${data.client.name}</div>
              ${data.client.company_name ? `<div style="color: #374151; margin-bottom: 4px;">${data.client.company_name}</div>` : ''}
              ${data.client.email ? `<div style="color: #6b7280; margin-bottom: 4px;">${data.client.email}</div>` : ''}
              ${data.client.address ? `<div style="color: #6b7280; font-size: 12px; white-space: pre-line; margin-top: 4px;">${data.client.address}</div>` : ''}
            </div>
          </div>
        </div>

        ${data.subject ? `
        <div style="background: linear-gradient(90deg, #dbeafe, #e0e7ff); border-radius: 8px; padding: 16px; border-left: 4px solid ${colors.primary}; margin-bottom: 32px;">
          <h3 style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; color: ${colors.primary};">Subject</h3>
          <p style="font-size: 14px; color: #1f2937; margin: 0;">${data.subject}</p>
        </div>
        ` : ''}
        
        <!-- Modern Table -->
        <div style="margin-bottom: 32px;">
          <div style="${config.styles.html.itemsTable.container}">
            <table style="width: 100%;">
              <thead style="background: #f9fafb;">
                <tr>
                  <th style="${config.styles.html.itemsTable.header} text-align: left;">Description</th>
                  <th style="${config.styles.html.itemsTable.header} text-align: center; width: 80px;">Qty</th>
                  <th style="${config.styles.html.itemsTable.header} text-align: right; width: 96px;">Rate</th>
                  <th style="${config.styles.html.itemsTable.header} text-align: right; width: 112px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map((item) => `
                <tr style="${config.styles.html.itemsTable.row}">
                  <td style="${config.styles.html.itemsTable.cell} color: #111827;">${item.description}</td>
                  <td style="${config.styles.html.itemsTable.cell} text-align: center; color: #374151;">${item.quantity}</td>
                  <td style="${config.styles.html.itemsTable.cell} text-align: right; color: #374151;">$${item.rate.toFixed(2)}</td>
                  <td style="${config.styles.html.itemsTable.cell} text-align: right; font-weight: 600; color: #111827;">$${item.amount.toFixed(2)}</td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <!-- Modern Totals -->
          <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
            <div style="${config.styles.html.totals}">
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
                  <span style="color: #6b7280;">Subtotal</span>
                  <span style="font-weight: 500;">$${data.subtotal.toFixed(2)}</span>
                </div>
                ${data.show_tax ? `
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                  <span style="color: #6b7280;">Tax (${(data.tax_rate * 100).toFixed(1)}%)</span>
                  <span style="font-weight: 500;">$${data.tax_amount.toFixed(2)}</span>
                </div>
                ` : ''}
              </div>
              <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
                  <span>Total</span>
                  <span style="color: ${colors.primary};">$${data.display_total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        ${(data.notes || data.terms) ? `
        <!-- Modern Footer -->
        <div style="${config.styles.html.footer}">
          ${data.notes ? `
          <div>
            <h4 style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; color: ${colors.primary};">Notes</h4>
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0;">${data.notes}</p>
          </div>
          ` : ''}
          ${data.terms ? `
          <div>
            <h4 style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; color: ${colors.primary};">Payment Terms</h4>
            <p style="font-size: 14px; color: #6b7280; margin: 0;">${data.terms}</p>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    </div>
  `;
  }

  private renderMinimalScandinavian(config: TemplateConfig, data: ProcessedInvoiceData, colors: ColorScheme): string {
    return `
    <!-- Minimal Scandinavian Template -->
    <div style="${config.styles.html.container}">
      
      <!-- Minimal Header -->
      <div style="${config.styles.html.header}">
        <div style="${config.styles.html.headerContent}">
          <div>
            ${data.business.logo_url ? `
            <img 
              src="${data.business.logo_url}" 
              alt="Logo" 
              style="height: ${this.getLogoHeight(data.business.logo_size)}px; width: auto; object-fit: contain; ${config.styles.html.logo}"
            />
            ` : ''}
            ${data.business.name ? `
            <h1 style="font-size: 20px; font-weight: normal; color: #111827; margin: 0 0 8px 0;">
              ${data.business.name}
            </h1>
            ` : ''}
            <div style="${config.styles.html.companyInfo}">
              ${data.business.email ? `<div>${data.business.email}</div>` : ''}
              ${data.business.phone ? `<div>${data.business.phone}</div>` : ''}
              ${data.business.address ? `<div style="white-space: pre-line;">${data.business.address}</div>` : ''}
            </div>
          </div>
          <div style="${config.styles.html.invoiceInfo}">
            <h2 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: #9ca3af; margin: 0 0 8px 0;">Invoice</h2>
            <p style="font-size: 18px; font-weight: normal; color: #111827; margin: 0;">
              #${data.invoice_number}
            </p>
          </div>
        </div>
      </div>

      <div style="padding: 48px;">
        <!-- Minimal Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; font-size: 12px; margin-bottom: 48px;">
          <div>
            <div style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Issue Date</div>
            <div style="color: #111827;">${data.issue_date}</div>
          </div>
          <div>
            <div style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Due Date</div>
            <div style="color: #111827;">${data.due_date}</div>
          </div>
          <div>
            <div style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Bill To</div>
            <div style="color: #111827;">
              <div style="font-weight: 500;">${data.client.name}</div>
              ${data.client.company_name ? `<div>${data.client.company_name}</div>` : ''}
              ${data.client.email ? `<div>${data.client.email}</div>` : ''}
              ${data.client.address ? `<div style="font-size: 11px; white-space: pre-line; margin-top: 4px;">${data.client.address}</div>` : ''}
            </div>
          </div>
        </div>

        ${data.subject ? `
        <div style="margin-bottom: 48px;">
          <div style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; margin-bottom: 8px;">Subject</div>
          <div style="font-size: 14px; color: #111827;">${data.subject}</div>
        </div>
        ` : ''}
        
        <!-- Minimal Table -->
        <div style="margin-bottom: 48px;">
          <table style="${config.styles.html.itemsTable.container}">
            <thead>
              <tr style="${config.styles.html.itemsTable.header}">
                <th style="text-align: left; padding: 8px 0;">Description</th>
                <th style="text-align: center; padding: 8px 0; width: 64px;">Qty</th>
                <th style="text-align: right; padding: 8px 0; width: 80px;">Rate</th>
                <th style="text-align: right; padding: 8px 0; width: 80px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map((item) => `
              <tr style="${config.styles.html.itemsTable.row}">
                <td style="${config.styles.html.itemsTable.cell} color: #111827;">${item.description}</td>
                <td style="${config.styles.html.itemsTable.cell} text-align: center; color: #374151;">${item.quantity}</td>
                <td style="${config.styles.html.itemsTable.cell} text-align: right; color: #374151;">${item.rate.toFixed(2)}</td>
                <td style="${config.styles.html.itemsTable.cell} text-align: right; color: #111827; font-weight: 500;">${item.amount.toFixed(2)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- Minimal Totals -->
          <div style="display: flex; justify-content: flex-end; margin-top: 32px;">
            <div style="${config.styles.html.totals}">
              <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                <span style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em;">Subtotal</span>
                <span style="color: #111827;">${data.subtotal.toFixed(2)}</span>
              </div>
              ${data.show_tax ? `
              <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                <span style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em;">Tax</span>
                <span style="color: #111827;">${data.tax_amount.toFixed(2)}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #111827;">
                <span style="color: #111827; text-transform: uppercase; letter-spacing: 0.1em;">Total</span>
                <span style="color: #111827; font-weight: 500;">${data.display_total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        
        ${(data.notes || data.terms) ? `
        <!-- Minimal Footer -->
        <div style="${config.styles.html.footer}">
          ${data.notes ? `
          <div>
            <div style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; margin-bottom: 8px;">Notes</div>
            <p style="font-size: 12px; color: #6b7280; line-height: 1.6; margin: 0;">${data.notes}</p>
          </div>
          ` : ''}
          ${data.terms ? `
          <div>
            <div style="color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; margin-bottom: 8px;">Payment Terms</div>
            <p style="font-size: 12px; color: #6b7280; margin: 0;">${data.terms}</p>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    </div>
  `;
  }

  private renderTraditionalCorporate(config: TemplateConfig, data: ProcessedInvoiceData, colors: ColorScheme): string {
    // EXACT SAME STRUCTURE AND LOGIC AS REACT RENDERER
    return `
    <!-- Traditional Corporate Template - Matching React Renderer EXACTLY -->
    <div style="max-width: 210mm; margin: 0 auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
      
      <!-- Corporate Header with Integrated Logo -->
      <div style="background: ${colors.primary}; padding: 32px; color: white; position: relative;">
        <!-- Logo integrated into corporate header -->
        ${data.business.logo_url ? `
        <div style="padding-top: 24px; padding-bottom: 16px; margin-left: 32px; margin-right: 32px; ${this.getLogoAlignment(data.business.logo_position)}">
          <div style="display: inline-block; background: white; border-radius: 8px; padding: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <img 
              src="${data.business.logo_url}" 
              alt="Company Logo" 
              style="height: ${this.getLogoHeight(data.business.logo_size)}px; width: auto; max-width: 160px; object-fit: contain;"
            />
          </div>
        </div>
        ` : ''}
        <div style="padding-left: 32px; padding-right: 32px; padding-bottom: 32px; ${!data.business.logo_url ? 'padding-top: 32px;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1;">
              ${data.business.name && data.business.name.trim() ? `
              <h1 style="font-size: 32px; font-weight: bold; color: white; margin: 0 0 16px 0; letter-spacing: 0.5px;">
                ${data.business.name}
              </h1>
              ` : ''}
              <div style="color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.5;">
                ${data.business.email && data.business.email.trim() ? `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="color: rgba(255,255,255,0.7);">Email:</span>
                  <span>${data.business.email}</span>
                </div>
                ` : ''}
                ${data.business.phone && data.business.phone.trim() ? `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="color: rgba(255,255,255,0.7);">Phone:</span>
                  <span>${data.business.phone}</span>
                </div>
                ` : ''}
                ${data.business.address && data.business.address.trim() ? `
                <div style="padding-top: 8px;">
                  <div style="color: rgba(255,255,255,0.7); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Address</div>
                  <div style="white-space: pre-line;">${data.business.address}</div>
                </div>
                ` : ''}
              </div>
            </div>
            
            <div style="text-align: right;">
              <div style="background: white; border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="font-size: 24px; font-weight: bold; color: #111827; margin: 0 0 16px 0;">INVOICE</h2>
                <div style="font-size: 14px; color: #6b7280; line-height: 1.6;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: 500;">Invoice #:</span> 
                    <span style="color: #111827; font-weight: 600;">${data.invoice_number}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: 500;">Date:</span> 
                    <span style="color: #111827;">${data.issue_date}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-weight: 500;">Due:</span> 
                    <span style="color: #111827;">${data.due_date}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="padding: 32px; line-height: 1.5;">
        <!-- Bill To -->
        <div style="margin-bottom: 32px;">
          <h3 style="font-weight: bold; color: #111827; margin: 0 0 8px 0;">BILL TO:</h3>
          <div style="font-size: 14px; color: #374151;">
            <div style="font-weight: 500; font-size: 16px;">${data.client.name}</div>
            ${data.client.company_name && data.client.company_name.trim() ? `<div style="font-weight: 500;">${data.client.company_name}</div>` : ''}
            ${data.client.address && data.client.address.trim() ? `<div style="white-space: pre-line; margin-top: 4px;">${data.client.address}</div>` : ''}
            ${data.client.email && data.client.email.trim() ? `<div style="font-size: 14px; margin-top: 4px; color: #6b7280;">${data.client.email}</div>` : ''}
          </div>
        </div>

        ${data.subject && data.subject.trim() ? `
        <div style="background: #dbeafe; border-left: 4px solid ${colors.primary}; padding: 16px; border-radius: 0 4px 4px 0; margin-bottom: 32px;">
          <h3 style="font-weight: bold; color: #111827; margin: 0 0 8px 0;">Subject:</h3>
          <p style="color: #1f2937; margin: 0;">${data.subject}</p>
        </div>
        ` : ''}

        <!-- Items Table -->
        <div style="margin-bottom: 32px;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background-color: ${colors.primary}; color: white;">
                <th style="padding: 12px; text-align: left; font-weight: 600;">Description</th>
                <th style="padding: 12px; text-align: center; width: 80px; font-weight: 600;">Qty</th>
                <th style="padding: 12px; text-align: right; width: 96px; font-weight: 600;">Rate</th>
                <th style="padding: 12px; text-align: right; width: 96px; font-weight: 600;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map((item, index) => `
              <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 1 ? 'background-color: #f9fafb;' : ''}">
                <td style="padding: 12px; color: #374151; font-size: 14px;">${item.description}</td>
                <td style="padding: 12px; text-align: center; color: #374151; font-size: 14px;">${item.quantity}</td>
                <td style="padding: 12px; text-align: right; color: #374151; font-size: 14px;">$${item.rate.toFixed(2)}</td>
                <td style="padding: 12px; text-align: right; font-weight: 500; color: #374151; font-size: 14px;">$${item.amount.toFixed(2)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- Totals -->
          <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
            <div style="min-width: 200px;">
              <div style="background: #f9fafb; display: flex; justify-content: space-between; padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">
                <span style="font-size: 14px; font-weight: 500; color: #374151;">Subtotal:</span>
                <span style="font-size: 14px; font-weight: 500; color: #111827;">$${data.subtotal.toFixed(2)}</span>
              </div>
              ${data.tax_rate > 0 && data.tax_amount > 0 ? `
              <div style="background: #f9fafb; display: flex; justify-content: space-between; padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">
                <span style="font-size: 14px; font-weight: 500; color: #374151;">Tax (${(data.tax_rate * 100).toFixed(1)}%):</span>
                <span style="font-size: 14px; font-weight: 500; color: #111827;">$${data.tax_amount.toFixed(2)}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 12px 16px; background-color: ${colors.primary}; color: white;">
                <span style="font-weight: bold;">TOTAL:</span>
                <span style="font-weight: bold; font-size: 18px;">$${data.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        ${((data.notes && data.notes.trim()) || (data.terms && data.terms.trim())) ? `
        <!-- Footer -->
        <div style="border-top: 2px solid #d1d5db; padding-top: 24px;">
          <div style="font-size: 14px; color: #374151;">
            ${data.terms && data.terms.trim() ? `<div><strong>Payment Terms:</strong> ${data.terms}</div>` : ''}
            ${data.notes && data.notes.trim() ? `<div style="margin-top: 8px;"><strong>Notes:</strong> ${data.notes}</div>` : ''}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
  }

  // Helper methods
  private processInvoiceData(invoiceData: InvoiceData): ProcessedInvoiceData {
    const { template, business, client, items } = invoiceData;
    
    // Calculate display total based on whether tax should be shown
    const showTax = template.show_tax ?? true;
    const displayTotal = showTax ? invoiceData.total_amount : invoiceData.subtotal;
    
    console.log('HTML Renderer processing invoice with CUSTOM template:', {
      invoiceNumber: invoiceData.invoice_number,
      customTemplateName: template.name || 'No name',
      customCompanyName: template.company_name || 'No company name',
      customColorScheme: template.color_scheme || 'No color',
      templateShowTax: template.show_tax,
      calculatedShowTax: showTax,
      logoUrl: template.logo_url || 'No logo',
      logoPosition: template.logo_position || 'left',
      logoSize: template.logo_size || 'medium'
    });
    
    return {
      ...invoiceData,
      business: {
        name: template.company_name || business.name || "Your Business",
        email: template.company_email || business.email || "",
        phone: template.company_phone || business.phone || "",
        address: template.company_address || this.formatAddress(business),
        logo_url: template.logo_url,
        logo_size: template.logo_size || 'medium',
        logo_position: template.logo_position || 'left'
      },
      client: {
        ...client,
        address: this.formatClientAddress(client)
      },
      issue_date: this.formatDate(invoiceData.issue_date),
      due_date: this.formatDate(invoiceData.due_date),
      items: items || [],
      show_tax: showTax,
      display_total: displayTotal
    };
  }

  private formatAddress(business: InvoiceData['business']): string {
    const addressParts = [
      business.address_line1,
      business.address_line2,
      [business.city, business.state, business.postal_code].filter(Boolean).join(', '),
      business.country !== 'United States' ? business.country : null
    ].filter(Boolean);

    return addressParts.join('\n');
  }

  private formatClientAddress(client: InvoiceData['client']): string {
    const addressParts = [
      client.address_line1,
      client.address_line2,
      [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
      client.country !== 'United States' ? client.country : null
    ].filter(Boolean);

    return addressParts.join('\n');
  }

  private formatDate(dateString: string): string {
    // Parse date string in local timezone to avoid UTC conversion issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private getLogoHeight(size?: string): number {
    switch (size) {
      case 'small': return 40;
      case 'large': return 80;
      default: return 60;
    }
  }

  private getFontFamily(fontClass?: string): string {
    const fontMap: Record<string, string> = {
      'font-sans': 'Inter, system-ui, sans-serif',
      'font-serif': 'ui-serif, serif',
      'font-mono': 'ui-monospace, monospace',
    };
    
    return fontMap[fontClass || 'font-sans'] || 'Inter, system-ui, sans-serif';
  }

  private generateColorScheme(primaryColor: string): ColorScheme {
    const hex = primaryColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const darken = (factor: number) => {
      return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
    };

    const lighten = (factor: number) => {
      const mix = (color: number) => Math.floor(color + (255 - color) * factor);
      return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
    };

    return {
      primary: primaryColor,
      secondary: darken(0.8),
      accent: lighten(0.2),
      text: '#111827',
      textSecondary: '#6b7280',
      background: '#ffffff',
      border: '#e5e7eb'
    };
  }
}

// Helper interface for processed data
interface ProcessedInvoiceData extends Omit<InvoiceData, 'business' | 'client' | 'issue_date' | 'due_date'> {
  business: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    logo_url?: string;
    logo_size?: string;
    logo_position?: string;
  };
  client: InvoiceData['client'] & {
    address?: string;
  };
  issue_date: string;
  due_date: string;
  show_tax: boolean;
  display_total: number;
}