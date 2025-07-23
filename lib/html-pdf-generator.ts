import puppeteer from 'puppeteer';

interface InvoiceData {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  subject?: string;
  notes?: string;
  terms?: string;
  footer_text?: string;
  currency: string;
  
  // Client information
  client: {
    name: string;
    email: string;
    company_name?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  
  // Template styling
  template: {
    name: string;
    template_type: string;
    color_scheme: string;
    footer_text?: string;
    company_name?: string;
    company_address?: string;
    company_phone?: string;
    company_email?: string;
    logo_url?: string;
    logo_position?: 'left' | 'center' | 'right';
    logo_size?: 'small' | 'medium' | 'large';
    font_family?: string;
  };
  
  // Line items
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  
  // Business information (from user profile)
  business: {
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
  };
}

export class HTMLInvoicePDFGenerator {
  constructor(private invoiceData: InvoiceData) {}

  private generateHTML(): string {
    const { template, client, items } = this.invoiceData;
    const color = template.color_scheme || '#1e40af';
    const fontClass = this.getFontClass(template.font_family);
    
    // Build client address
    const clientAddress = [
      client.address_line1,
      client.address_line2,
      [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
      client.country !== 'United States' ? client.country : null
    ].filter(Boolean).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice</title>
</head>
<body style="margin:0;padding:20px;font-family:Arial;font-size:12px;">
<h1 style="color:${color};margin-bottom:10px;">INVOICE #${this.invoiceData.invoice_number}</h1>
<p><strong>${template.company_name || 'Company'}</strong></p>
<p>Bill To: ${client.name}</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0;">
<tr style="background:${color};color:white;">
<th style="padding:8px;text-align:left;">Item</th>
<th style="padding:8px;text-align:right;">Qty</th>
<th style="padding:8px;text-align:right;">Rate</th>
<th style="padding:8px;text-align:right;">Total</th>
</tr>
${items.map(item => `<tr><td style="padding:8px;">${item.description}</td><td style="padding:8px;text-align:right;">${item.quantity}</td><td style="padding:8px;text-align:right;">$${item.rate.toFixed(2)}</td><td style="padding:8px;text-align:right;">$${item.amount.toFixed(2)}</td></tr>`).join('')}
</table>
<div style="text-align:right;margin-top:20px;">
<p>Subtotal: $${this.invoiceData.subtotal.toFixed(2)}</p>
<p><strong>Total: $${this.invoiceData.total_amount.toFixed(2)}</strong></p>
</div>
</body>
</html>`;
  }

  private renderUltraSimpleTemplate(): string {
    const { template, client, items } = this.invoiceData;
    
    return `
<div class="h">
  <div>
    <h1>${template.company_name || '[Company]'}</h1>
    <div>${template.company_address || ''}</div>
    <div>${template.company_phone || ''} ${template.company_email || ''}</div>
  </div>
  <div class="r">
    <h2>INVOICE</h2>
    <div>#${this.invoiceData.invoice_number}</div>
    <div>${this.formatDate(this.invoiceData.issue_date)}</div>
    <div>Due: ${this.formatDate(this.invoiceData.due_date)}</div>
  </div>
</div>

<div class="bt">
  <h3>Bill To:</h3>
  <div><strong>${client.name}</strong></div>
  ${client.company_name ? `<div>${client.company_name}</div>` : ''}
  ${client.address_line1 ? `<div>${client.address_line1}</div>` : ''}
  ${client.email ? `<div>${client.email}</div>` : ''}
</div>

<table>
  <tr><th>Description</th><th class="tr">Qty</th><th class="tr">Rate</th><th class="tr">Amount</th></tr>
  ${items.map(item => `<tr><td>${item.description}</td><td class="tr">${item.quantity}</td><td class="tr">$${item.rate.toFixed(2)}</td><td class="tr">$${item.amount.toFixed(2)}</td></tr>`).join('')}
</table>

<div class="tot">
  <div>
    <div class="r"><span>Subtotal:</span><span>$${this.invoiceData.subtotal.toFixed(2)}</span></div>
    ${this.invoiceData.tax_rate > 0 ? `<div class="r"><span>Tax:</span><span>$${this.invoiceData.tax_amount.toFixed(2)}</span></div>` : ''}
    <div class="r tf"><span>Total:</span><span>$${this.invoiceData.total_amount.toFixed(2)}</span></div>
  </div>
</div>

${this.invoiceData.notes ? `<div style="font-size:10px;color:#666;">${this.invoiceData.notes}</div>` : ''}
    `;
  }

  private renderSimpleTemplate(): string {
    const { template, client, items } = this.invoiceData;
    
    // Build client address
    const clientAddress = [
      client.address_line1,
      client.address_line2,
      [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
      client.country !== 'United States' ? client.country : null
    ].filter(Boolean).join('<br>');

    return `
        <div class="header">
            <div class="company-info">
                ${template.company_name ? `<h1>${template.company_name}</h1>` : '<h1>[Company Name]</h1>'}
                ${template.company_address ? `<div>${template.company_address.replace(/\n/g, '<br>')}</div>` : ''}
                ${template.company_phone ? `<div>${template.company_phone}</div>` : ''}
                ${template.company_email ? `<div>${template.company_email}</div>` : ''}
            </div>
            <div class="invoice-info">
                <h2>INVOICE</h2>
                <div><strong>#${this.invoiceData.invoice_number}</strong></div>
                <div>Date: ${this.formatDate(this.invoiceData.issue_date)}</div>
                <div>Due: ${this.formatDate(this.invoiceData.due_date)}</div>
            </div>
        </div>

        <div class="bill-to">
            <h3>Bill To:</h3>
            <div><strong>${client.name}</strong></div>
            ${client.company_name ? `<div>${client.company_name}</div>` : ''}
            ${clientAddress ? `<div>${clientAddress}</div>` : ''}
            ${client.email ? `<div>${client.email}</div>` : ''}
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align: center; width: 60px;">Qty</th>
                    <th style="text-align: right; width: 80px;">Rate</th>
                    <th style="text-align: right; width: 80px;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td>${item.description}</td>
                        <td style="text-align: center;">${item.quantity}</td>
                        <td style="text-align: right;">$${item.rate.toFixed(2)}</td>
                        <td style="text-align: right;"><strong>$${item.amount.toFixed(2)}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-table">
                <div class="totals-row">
                    <span>Subtotal:</span>
                    <span>$${this.invoiceData.subtotal.toFixed(2)}</span>
                </div>
                ${this.invoiceData.tax_rate > 0 ? `
                <div class="totals-row">
                    <span>Tax (${(this.invoiceData.tax_rate * 100).toFixed(1)}%):</span>
                    <span>$${this.invoiceData.tax_amount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="totals-row total">
                    <span>Total:</span>
                    <span>$${this.invoiceData.total_amount.toFixed(2)}</span>
                </div>
            </div>
        </div>

        ${this.invoiceData.terms || this.invoiceData.notes ? `
        <div class="notes">
            ${this.invoiceData.terms ? `<div><strong>Terms:</strong> ${this.invoiceData.terms}</div>` : ''}
            ${this.invoiceData.notes ? `<div><strong>Notes:</strong> ${this.invoiceData.notes}</div>` : ''}
        </div>
        ` : ''}
    `;
  }

  private renderTemplate(): string {
    const { template } = this.invoiceData;
    
    switch (template.template_type) {
      case 'bold':
        return this.renderBoldTemplate();
      case 'classic':
        return this.renderClassicTemplate();
      case 'modern':
        return this.renderModernTemplate();
      case 'minimal':
        return this.renderMinimalTemplate();
      default:
        return this.renderBoldTemplate(); // fallback
    }
  }

  private renderBoldTemplate(): string {
    const { template, client, items } = this.invoiceData;
    const color = template.color_scheme || '#1e40af';
    
    // Build client address
    const clientAddress = [
      client.address_line1,
      client.address_line2,
      [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
      client.country !== 'United States' ? client.country : null
    ].filter(Boolean).join('\n');

    return `
        <!-- Bold Template - Eye-catching with Rich Colors -->
        <div class="bg-white p-4">
          
          <!-- Header Background -->
          <div class="relative p-6 mb-8 rounded-lg" style="background: linear-gradient(135deg, ${color}, ${color}dd);">
            
            <!-- Logo Section for Bold -->
            ${template.logo_url ? `
            <div class="mb-4 ${
              template.logo_position === 'center' ? 'flex justify-center' :
              template.logo_position === 'right' ? 'flex justify-end' : 'flex justify-start'
            }">
              <div class="bg-white rounded-lg p-2 inline-block">
                <img 
                  src="${template.logo_url}" 
                  alt="Company Logo" 
                  style="height: ${this.getLogoHeight(template.logo_size)}px; width: auto; object-fit: contain;"
                  class="max-w-full"
                />
              </div>
            </div>
            ` : ''}
            
            <div class="flex justify-between items-start text-white">
              <div>
                ${template.company_name ? `
                <h1 class="text-4xl font-bold mb-3">${template.company_name}</h1>
                ` : ''}
                ${template.company_address ? `
                <div class="text-sm opacity-90 whitespace-pre-line leading-relaxed">
                  ${template.company_address}
                </div>
                ` : ''}
                ${template.company_phone || template.company_email ? `
                <div class="text-sm opacity-90 mt-2">
                  <div>
                    ${[template.company_phone, template.company_email].filter(Boolean).join(' | ')}
                  </div>
                </div>
                ` : ''}
              </div>
              <div class="text-right">
                <div class="bg-white p-4 rounded-lg shadow-lg">
                  <h2 class="text-3xl font-bold text-gray-900">INVOICE</h2>
                  <div class="text-sm mt-3 space-y-1 text-gray-700">
                    <div><strong>#${this.invoiceData.invoice_number}</strong></div>
                    <div>${this.formatDate(this.invoiceData.issue_date)}</div>
                    <div class="text-gray-600">Due: ${this.formatDate(this.invoiceData.due_date)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bill To -->
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-4 h-4 rounded" style="background-color: ${color};"></div>
              <h3 class="font-bold text-lg text-gray-900">BILL TO</h3>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg border-l-4" style="border-color: ${color};">
              <div class="text-gray-700">
                <div class="font-bold text-lg">${client.name}</div>
                ${client.company_name ? `<div class="font-medium text-gray-600">${client.company_name}</div>` : ''}
                ${clientAddress ? `<div class="whitespace-pre-line mt-2 text-sm">${clientAddress}</div>` : ''}
                ${client.email ? `<div class="text-sm mt-1 text-gray-600">${client.email}</div>` : ''}
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="mb-8">
            <table class="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr style="background: linear-gradient(135deg, ${color}, ${color}dd); color: white;">
                  <th class="text-left py-4 px-6 font-bold">DESCRIPTION</th>
                  <th class="text-center py-4 px-6 font-bold w-20">QTY</th>
                  <th class="text-right py-4 px-6 font-bold w-24">RATE</th>
                  <th class="text-right py-4 px-6 font-bold w-24">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item, index) => `
                <tr class="border-b border-gray-200 ${index % 2 === 1 ? 'bg-gray-50' : ''}">
                  <td class="py-4 px-6 text-gray-800 font-medium">${item.description}</td>
                  <td class="py-4 px-6 text-gray-600 text-center">${item.quantity}</td>
                  <td class="py-4 px-6 text-gray-600 text-right">$${item.rate.toFixed(2)}</td>
                  <td class="py-4 px-6 text-gray-800 text-right font-bold">$${item.amount.toFixed(2)}</td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Totals -->
          <div class="flex justify-end mb-8">
            <div class="w-80">
              <div class="space-y-2">
                <div class="flex justify-between py-2 px-4 bg-gray-50 rounded">
                  <span class="font-medium text-gray-700">Subtotal</span>
                  <span class="font-bold text-gray-900">$${this.invoiceData.subtotal.toFixed(2)}</span>
                </div>
                ${this.invoiceData.tax_rate > 0 ? `
                <div class="flex justify-between py-2 px-4 bg-gray-50 rounded">
                  <span class="font-medium text-gray-700">Tax (${(this.invoiceData.tax_rate * 100).toFixed(1)}%)</span>
                  <span class="font-bold text-gray-900">$${this.invoiceData.tax_amount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="flex justify-between py-4 px-4 rounded text-white font-bold text-xl" style="background-color: ${color};">
                  <span>TOTAL</span>
                  <span>$${this.invoiceData.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Terms -->
          <div class="border-t-2 pt-6" style="border-color: ${color};">
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="text-gray-700">
                <div class="font-bold text-gray-900 mb-2">Payment Information</div>
                ${this.invoiceData.terms ? `<div><strong>Terms:</strong> ${this.invoiceData.terms}</div>` : ''}
                ${this.invoiceData.notes ? `<div class="mt-2"><strong>Notes:</strong> ${this.invoiceData.notes}</div>` : ''}
              </div>
            </div>
          </div>
        </div>
    `;
  }

  private renderClassicTemplate(): string {
    const { template, client, items } = this.invoiceData;
    const color = template.color_scheme || '#1e40af';
    
    // Build client address
    const clientAddress = [
      client.address_line1,
      client.address_line2,
      [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
      client.country !== 'United States' ? client.country : null
    ].filter(Boolean).join('\n');

    return `
        <!-- Classic Template - Clean and Professional -->\n        <div class=\"bg-white p-4\">\n          \n          <!-- Header -->\n          <div class=\"border-b-2 pb-6 mb-8\" style=\"border-color: ${color};\">\n            ${template.logo_url ? `\n            <div class=\"mb-4 ${\n              template.logo_position === 'center' ? 'flex justify-center' :\n              template.logo_position === 'right' ? 'flex justify-end' : 'flex justify-start'\n            }\">\n              <img \n                src=\"${template.logo_url}\" \n                alt=\"Company Logo\" \n                style=\"height: ${this.getLogoHeight(template.logo_size)}px; width: auto; object-fit: contain;\"\n                class=\"max-w-full\"\n              />\n            </div>\n            ` : ''}\n            \n            <div class=\"flex justify-between items-start\">\n              <div>\n                ${template.company_name ? `\n                <h1 class=\"text-2xl font-bold text-gray-900 mb-2\">${template.company_name}</h1>\n                ` : ''}\n                ${template.company_address ? `\n                <div class=\"text-sm text-gray-600 whitespace-pre-line leading-relaxed\">\n                  ${template.company_address}\n                </div>\n                ` : ''}\n                ${template.company_phone || template.company_email ? `\n                <div class=\"text-sm text-gray-600 mt-2\">\n                  <div>\n                    ${[template.company_phone, template.company_email].filter(Boolean).join(' • ')}\n                  </div>\n                </div>\n                ` : ''}\n              </div>\n              <div class=\"text-right\">\n                <h2 class=\"text-2xl font-bold text-gray-900 mb-2\">INVOICE</h2>\n                <div class=\"text-sm space-y-1 text-gray-700\">\n                  <div><strong>#${this.invoiceData.invoice_number}</strong></div>\n                  <div>Date: ${this.formatDate(this.invoiceData.issue_date)}</div>\n                  <div>Due: ${this.formatDate(this.invoiceData.due_date)}</div>\n                </div>\n              </div>\n            </div>\n          </div>\n\n          <!-- Bill To Section -->\n          <div class=\"mb-8\">\n            <h3 class=\"font-bold text-lg text-gray-900 mb-3\" style=\"color: ${color};\">Bill To</h3>\n            <div class=\"text-gray-700\">\n              <div class=\"font-bold text-lg\">${client.name}</div>\n              ${client.company_name ? `<div class=\"font-medium text-gray-600\">${client.company_name}</div>` : ''}\n              ${clientAddress ? `<div class=\"whitespace-pre-line mt-2 text-sm\">${clientAddress}</div>` : ''}\n              ${client.email ? `<div class=\"text-sm mt-1 text-gray-600\">${client.email}</div>` : ''}\n            </div>\n          </div>\n\n          <!-- Items Table -->\n          <div class=\"mb-8\">\n            <table class=\"w-full border-collapse border border-gray-300\">\n              <thead>\n                <tr style=\"background-color: ${color}; color: white;\">\n                  <th class=\"text-left py-3 px-4 font-bold border border-gray-300\">DESCRIPTION</th>\n                  <th class=\"text-center py-3 px-4 font-bold border border-gray-300 w-16\">QTY</th>\n                  <th class=\"text-right py-3 px-4 font-bold border border-gray-300 w-24\">RATE</th>\n                  <th class=\"text-right py-3 px-4 font-bold border border-gray-300 w-24\">AMOUNT</th>\n                </tr>\n              </thead>\n              <tbody>\n                ${items.map((item, index) => `\n                <tr class=\"${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}\">\n                  <td class=\"py-3 px-4 text-gray-800 border border-gray-300\">${item.description}</td>\n                  <td class=\"py-3 px-4 text-gray-600 text-center border border-gray-300\">${item.quantity}</td>\n                  <td class=\"py-3 px-4 text-gray-600 text-right border border-gray-300\">$${item.rate.toFixed(2)}</td>\n                  <td class=\"py-3 px-4 text-gray-800 text-right font-bold border border-gray-300\">$${item.amount.toFixed(2)}</td>\n                </tr>\n                `).join('')}\n              </tbody>\n            </table>\n          </div>\n\n          <!-- Totals -->\n          <div class=\"flex justify-end mb-8\">\n            <div class=\"w-80\">\n              <div class=\"border border-gray-300\">\n                <div class=\"flex justify-between py-2 px-4 border-b border-gray-200\">\n                  <span class=\"font-medium text-gray-700\">Subtotal</span>\n                  <span class=\"font-bold text-gray-900\">$${this.invoiceData.subtotal.toFixed(2)}</span>\n                </div>\n                ${this.invoiceData.tax_rate > 0 ? `\n                <div class=\"flex justify-between py-2 px-4 border-b border-gray-200\">\n                  <span class=\"font-medium text-gray-700\">Tax (${(this.invoiceData.tax_rate * 100).toFixed(1)}%)</span>\n                  <span class=\"font-bold text-gray-900\">$${this.invoiceData.tax_amount.toFixed(2)}</span>\n                </div>\n                ` : ''}\n                <div class=\"flex justify-between py-3 px-4 font-bold text-xl\" style=\"background-color: ${color}; color: white;\">\n                  <span>TOTAL</span>\n                  <span>$${this.invoiceData.total_amount.toFixed(2)}</span>\n                </div>\n              </div>\n            </div>\n          </div>\n\n          <!-- Payment Information -->\n          <div class=\"border-t-2 pt-6\" style=\"border-color: ${color};\">\n            <div class=\"text-gray-700\">\n              ${this.invoiceData.terms ? `<div class=\"mb-3\"><strong>Terms:</strong> ${this.invoiceData.terms}</div>` : ''}\n              ${this.invoiceData.notes ? `<div><strong>Notes:</strong> ${this.invoiceData.notes}</div>` : ''}\n            </div>\n          </div>\n        </div>\n    `;
  }

  private renderModernTemplate(): string {
    const { template, client, items } = this.invoiceData;
    const color = template.color_scheme || '#1e40af';
    
    // Build client address
    const clientAddress = [
      client.address_line1,
      client.address_line2,
      [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
      client.country !== 'United States' ? client.country : null
    ].filter(Boolean).join('\n');

    return `
        <!-- Modern Template - Clean with Accent Lines -->\n        <div class=\"bg-white p-4\">\n          \n          <!-- Header with Side Accent -->\n          <div class=\"relative mb-8\">\n            <div class=\"w-1 h-20 absolute left-0 top-0\" style=\"background-color: ${color};\"></div>\n            \n            ${template.logo_url ? `\n            <div class=\"mb-4 ml-6 ${\n              template.logo_position === 'center' ? 'flex justify-center' :\n              template.logo_position === 'right' ? 'flex justify-end' : 'flex justify-start'\n            }\">\n              <img \n                src=\"${template.logo_url}\" \n                alt=\"Company Logo\" \n                style=\"height: ${this.getLogoHeight(template.logo_size)}px; width: auto; object-fit: contain;\"\n                class=\"max-w-full\"\n              />\n            </div>\n            ` : ''}\n            \n            <div class=\"flex justify-between items-start ml-6\">\n              <div>\n                ${template.company_name ? `\n                <h1 class=\"text-3xl font-light text-gray-900 mb-2\">${template.company_name}</h1>\n                ` : ''}\n                ${template.company_address ? `\n                <div class=\"text-sm text-gray-500 whitespace-pre-line leading-relaxed\">\n                  ${template.company_address}\n                </div>\n                ` : ''}\n                ${template.company_phone || template.company_email ? `\n                <div class=\"text-sm text-gray-500 mt-2\">\n                  <div>\n                    ${[template.company_phone, template.company_email].filter(Boolean).join(' | ')}\n                  </div>\n                </div>\n                ` : ''}\n              </div>\n              <div class=\"text-right\">\n                <div class=\"inline-block px-4 py-2 rounded-lg\" style=\"background-color: ${color}10; border: 1px solid ${color}40;\">\n                  <h2 class=\"text-2xl font-light text-gray-900\">Invoice</h2>\n                  <div class=\"text-sm mt-2 space-y-1\" style=\"color: ${color};\">\n                    <div class=\"font-bold\">#${this.invoiceData.invoice_number}</div>\n                    <div>${this.formatDate(this.invoiceData.issue_date)}</div>\n                    <div class=\"text-xs text-gray-500\">Due ${this.formatDate(this.invoiceData.due_date)}</div>\n                  </div>\n                </div>\n              </div>\n            </div>\n          </div>\n\n          <!-- Bill To with Accent -->\n          <div class=\"mb-8 relative\">\n            <div class=\"w-1 h-full absolute left-0 top-0\" style=\"background-color: ${color}40;\"></div>\n            <div class=\"ml-6\">\n              <h3 class=\"font-light text-lg text-gray-400 mb-3 uppercase tracking-wide\">Bill To</h3>\n              <div class=\"text-gray-700\">\n                <div class=\"font-bold text-xl\">${client.name}</div>\n                ${client.company_name ? `<div class=\"text-gray-500 mt-1\">${client.company_name}</div>` : ''}\n                ${clientAddress ? `<div class=\"whitespace-pre-line mt-3 text-sm text-gray-500\">${clientAddress}</div>` : ''}\n                ${client.email ? `<div class=\"text-sm mt-2 text-gray-500\">${client.email}</div>` : ''}\n              </div>\n            </div>\n          </div>\n\n          <!-- Items Table with Modern Styling -->\n          <div class=\"mb-8\">\n            <table class=\"w-full\">\n              <thead>\n                <tr class=\"border-b-2\" style=\"border-color: ${color};\">\n                  <th class=\"text-left py-4 font-light text-gray-400 uppercase tracking-wide text-xs\">DESCRIPTION</th>\n                  <th class=\"text-center py-4 font-light text-gray-400 uppercase tracking-wide text-xs w-20\">QTY</th>\n                  <th class=\"text-right py-4 font-light text-gray-400 uppercase tracking-wide text-xs w-24\">RATE</th>\n                  <th class=\"text-right py-4 font-light text-gray-400 uppercase tracking-wide text-xs w-24\">AMOUNT</th>\n                </tr>\n              </thead>\n              <tbody>\n                ${items.map((item, index) => `\n                <tr class=\"border-b border-gray-100\">\n                  <td class=\"py-4 text-gray-800\">${item.description}</td>\n                  <td class=\"py-4 text-gray-500 text-center\">${item.quantity}</td>\n                  <td class=\"py-4 text-gray-500 text-right\">$${item.rate.toFixed(2)}</td>\n                  <td class=\"py-4 text-gray-800 text-right font-bold\">$${item.amount.toFixed(2)}</td>\n                </tr>\n                `).join('')}\n              </tbody>\n            </table>\n          </div>\n\n          <!-- Totals with Modern Layout -->\n          <div class=\"flex justify-end mb-8\">\n            <div class=\"w-80\">\n              <div class=\"space-y-3\">\n                <div class=\"flex justify-between py-2\">\n                  <span class=\"text-gray-500\">Subtotal</span>\n                  <span class=\"text-gray-900\">$${this.invoiceData.subtotal.toFixed(2)}</span>\n                </div>\n                ${this.invoiceData.tax_rate > 0 ? `\n                <div class=\"flex justify-between py-2\">\n                  <span class=\"text-gray-500\">Tax (${(this.invoiceData.tax_rate * 100).toFixed(1)}%)</span>\n                  <span class=\"text-gray-900\">$${this.invoiceData.tax_amount.toFixed(2)}</span>\n                </div>\n                ` : ''}\n                <div class=\"border-t border-gray-200 pt-3\">\n                  <div class=\"flex justify-between py-2\">\n                    <span class=\"text-xl font-light text-gray-900\">Total</span>\n                    <span class=\"text-2xl font-light\" style=\"color: ${color};\">$${this.invoiceData.total_amount.toFixed(2)}</span>\n                  </div>\n                </div>\n              </div>\n            </div>\n          </div>\n\n          <!-- Footer Information -->\n          <div class=\"relative\">\n            <div class=\"w-1 h-full absolute left-0 top-0\" style=\"background-color: ${color}40;\"></div>\n            <div class=\"ml-6 text-gray-600 text-sm leading-relaxed\">\n              ${this.invoiceData.terms ? `<div class=\"mb-3\"><span class=\"text-gray-400 uppercase tracking-wide text-xs\">Terms:</span><br>${this.invoiceData.terms}</div>` : ''}\n              ${this.invoiceData.notes ? `<div><span class=\"text-gray-400 uppercase tracking-wide text-xs\">Notes:</span><br>${this.invoiceData.notes}</div>` : ''}\n            </div>\n          </div>\n        </div>\n    `;
  }

  private renderMinimalTemplate(): string {
    const { template, client, items } = this.invoiceData;
    const color = template.color_scheme || '#1e40af';
    
    // Build client address
    const clientAddress = [
      client.address_line1,
      client.address_line2,
      [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
      client.country !== 'United States' ? client.country : null
    ].filter(Boolean).join('\n');

    return `
        <!-- Minimal Template - Simple and Clean -->\n        <div class=\"bg-white p-4\">\n          \n          <!-- Simple Header -->\n          <div class=\"mb-12\">\n            ${template.logo_url ? `\n            <div class=\"mb-6 ${\n              template.logo_position === 'center' ? 'flex justify-center' :\n              template.logo_position === 'right' ? 'flex justify-end' : 'flex justify-start'\n            }\">\n              <img \n                src=\"${template.logo_url}\" \n                alt=\"Company Logo\" \n                style=\"height: ${this.getLogoHeight(template.logo_size)}px; width: auto; object-fit: contain;\"\n                class=\"max-w-full\"\n              />\n            </div>\n            ` : ''}\n            \n            <div class=\"flex justify-between items-start\">\n              <div>\n                ${template.company_name ? `\n                <h1 class=\"text-xl font-medium text-gray-900 mb-1\">${template.company_name}</h1>\n                ` : ''}\n                ${template.company_address ? `\n                <div class=\"text-xs text-gray-500 whitespace-pre-line leading-relaxed\">\n                  ${template.company_address}\n                </div>\n                ` : ''}\n                ${template.company_phone || template.company_email ? `\n                <div class=\"text-xs text-gray-500 mt-1\">\n                  <div>\n                    ${[template.company_phone, template.company_email].filter(Boolean).join(' • ')}\n                  </div>\n                </div>\n                ` : ''}\n              </div>\n              <div class=\"text-right\">\n                <h2 class=\"text-lg font-medium text-gray-900 mb-1\">Invoice</h2>\n                <div class=\"text-xs space-y-1 text-gray-500\">\n                  <div>#${this.invoiceData.invoice_number}</div>\n                  <div>${this.formatDate(this.invoiceData.issue_date)}</div>\n                  <div>Due ${this.formatDate(this.invoiceData.due_date)}</div>\n                </div>\n              </div>\n            </div>\n          </div>\n\n          <!-- Bill To Section -->\n          <div class=\"mb-8\">\n            <div class=\"text-xs text-gray-400 uppercase tracking-wider mb-2\">Bill To</div>\n            <div class=\"text-gray-700 text-sm\">\n              <div class=\"font-medium\">${client.name}</div>\n              ${client.company_name ? `<div class=\"text-gray-500\">${client.company_name}</div>` : ''}\n              ${clientAddress ? `<div class=\"whitespace-pre-line mt-1 text-xs text-gray-500\">${clientAddress}</div>` : ''}\n              ${client.email ? `<div class=\"text-xs mt-1 text-gray-500\">${client.email}</div>` : ''}\n            </div>\n          </div>\n\n          <!-- Minimal Items Table -->\n          <div class=\"mb-8\">\n            <table class=\"w-full\">\n              <thead>\n                <tr class=\"border-b border-gray-200\">\n                  <th class=\"text-left py-2 text-xs text-gray-400 uppercase tracking-wider font-medium\">Description</th>\n                  <th class=\"text-center py-2 text-xs text-gray-400 uppercase tracking-wider font-medium w-16\">Qty</th>\n                  <th class=\"text-right py-2 text-xs text-gray-400 uppercase tracking-wider font-medium w-20\">Rate</th>\n                  <th class=\"text-right py-2 text-xs text-gray-400 uppercase tracking-wider font-medium w-24\">Amount</th>\n                </tr>\n              </thead>\n              <tbody>\n                ${items.map((item, index) => `\n                <tr class=\"${index < items.length - 1 ? 'border-b border-gray-100' : ''}\">\n                  <td class=\"py-3 text-sm text-gray-800\">${item.description}</td>\n                  <td class=\"py-3 text-sm text-gray-600 text-center\">${item.quantity}</td>\n                  <td class=\"py-3 text-sm text-gray-600 text-right\">$${item.rate.toFixed(2)}</td>\n                  <td class=\"py-3 text-sm text-gray-800 text-right font-medium\">$${item.amount.toFixed(2)}</td>\n                </tr>\n                `).join('')}\n              </tbody>\n            </table>\n          </div>\n\n          <!-- Simple Totals -->\n          <div class=\"flex justify-end mb-8\">\n            <div class=\"w-64 text-sm\">\n              <div class=\"space-y-2\">\n                <div class=\"flex justify-between\">\n                  <span class=\"text-gray-500\">Subtotal</span>\n                  <span class=\"text-gray-700\">$${this.invoiceData.subtotal.toFixed(2)}</span>\n                </div>\n                ${this.invoiceData.tax_rate > 0 ? `\n                <div class=\"flex justify-between\">\n                  <span class=\"text-gray-500\">Tax (${(this.invoiceData.tax_rate * 100).toFixed(1)}%)</span>\n                  <span class=\"text-gray-700\">$${this.invoiceData.tax_amount.toFixed(2)}</span>\n                </div>\n                ` : ''}\n                <div class=\"border-t border-gray-200 pt-2 mt-3\">\n                  <div class=\"flex justify-between\">\n                    <span class=\"font-medium text-gray-900\">Total</span>\n                    <span class=\"font-medium text-lg\" style=\"color: ${color};\">$${this.invoiceData.total_amount.toFixed(2)}</span>\n                  </div>\n                </div>\n              </div>\n            </div>\n          </div>\n\n          <!-- Simple Footer -->\n          <div class=\"text-xs text-gray-500 leading-relaxed\">\n            ${this.invoiceData.terms ? `<div class=\"mb-2\"><span class=\"font-medium text-gray-600\">Terms:</span> ${this.invoiceData.terms}</div>` : ''}\n            ${this.invoiceData.notes ? `<div><span class=\"font-medium text-gray-600\">Notes:</span> ${this.invoiceData.notes}</div>` : ''}\n          </div>\n        </div>\n    `;
  }

  private getFontClass(fontFamily?: string): string {
    if (!fontFamily) return 'font-sans';
    return fontFamily;
  }

  private getFontFamily(fontFamily?: string): string {
    const fontMap: Record<string, string> = {
      'font-sans': 'Inter, system-ui, sans-serif',
      'font-serif': 'ui-serif, serif',
      'font-mono': 'ui-monospace, monospace',
      'font-["Inter"]': 'Inter, sans-serif',
      'font-["Open_Sans"]': 'Open Sans, sans-serif',
      'font-["Roboto"]': 'Roboto, sans-serif',
      'font-["Poppins"]': 'Poppins, sans-serif',
    };
    
    return fontMap[fontFamily || 'font-sans'] || 'Inter, system-ui, sans-serif';
  }

  private getLogoHeight(size?: string): number {
    switch (size) {
      case 'small': return 40;
      case 'medium': return 60;
      case 'large': return 80;
      default: return 60;
    }
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  public async generate(): Promise<Blob> {
    // SIMPLE TEST HTML - hardcoded to see if blank page issue is HTML/CSS or Puppeteer
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial;margin:0;padding:20px;">
<h1 style="color:#1e40af;margin-bottom:10px;">INVOICE #${this.invoiceData.invoice_number}</h1>
<p><strong>${this.invoiceData.template?.company_name || 'Test Company'}</strong></p>
<p>Bill To: <strong>${this.invoiceData.client.name}</strong></p>
<table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #ccc;">
<thead>
<tr style="background:#1e40af;color:white;">
<th style="padding:10px;text-align:left;">Description</th>
<th style="padding:10px;text-align:right;">Qty</th>
<th style="padding:10px;text-align:right;">Rate</th>
<th style="padding:10px;text-align:right;">Amount</th>
</tr>
</thead>
<tbody>
${this.invoiceData.items.map(item => `
<tr>
<td style="padding:8px;border-bottom:1px solid #eee;">${item.description}</td>
<td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.quantity}</td>
<td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${item.rate.toFixed(2)}</td>
<td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">$${item.amount.toFixed(2)}</td>
</tr>
`).join('')}
</tbody>
</table>
<div style="text-align:right;margin-top:30px;">
<p style="margin:5px 0;">Subtotal: $${this.invoiceData.subtotal.toFixed(2)}</p>
<p style="margin:5px 0;font-size:18px;font-weight:bold;color:#1e40af;">Total: $${this.invoiceData.total_amount.toFixed(2)}</p>
</div>
<div style="margin-top:30px;font-size:12px;color:#666;">
${this.invoiceData.notes ? `<p><strong>Notes:</strong> ${this.invoiceData.notes}</p>` : ''}
</div>
</body>
</html>`;
    
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      await page.setContent(html);
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
      });
      
      await browser.close();
      return new Blob([pdfBuffer], { type: 'application/pdf' });
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      throw error;
    }
  }

  public async download(filename?: string): Promise<void> {
    const blob = await this.generate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Invoice-${this.invoiceData.invoice_number}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Utility functions to match the existing API
export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Blob> {
  const generator = new HTMLInvoicePDFGenerator(invoiceData);
  return generator.generate();
}

export async function downloadInvoicePDF(invoiceData: InvoiceData, filename?: string): Promise<void> {
  const generator = new HTMLInvoicePDFGenerator(invoiceData);
  return generator.download(filename);
}