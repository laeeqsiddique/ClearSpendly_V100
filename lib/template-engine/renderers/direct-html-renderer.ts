// Direct HTML Renderer - No React SSR, Perfect PDF Consistency
// Generates HTML that matches React components exactly

import { TemplateConfig, InvoiceData, ColorScheme } from '../types';
import { parseLocalDate } from '@/lib/date-utils';

export class DirectHTMLRenderer {
  /**
   * Generate complete HTML document for PDF generation
   * This ensures 100% visual consistency with React preview
   */
  generateCompleteDocument(config: TemplateConfig, invoiceData: InvoiceData): string {
    console.log('DirectHTMLRenderer: Generating PDF HTML with perfect consistency');
    
    // Generate the invoice content HTML
    const htmlContent = this.generateTemplateHTML(config, invoiceData);
    
    // Get color scheme for styling
    const colorScheme = this.generateColorScheme(invoiceData.template.color_scheme || '#1e40af');
    
    // Generate complete HTML document
    return this.generateDocumentHTML(htmlContent, invoiceData, colorScheme);
  }

  /**
   * Generate template-specific HTML content
   */
  private generateTemplateHTML(config: TemplateConfig, invoiceData: InvoiceData): string {
    const templateType = invoiceData.template.template_type || 'traditional-corporate';
    console.log('DirectHTMLRenderer: Rendering template type:', templateType);
    
    // Map template styles to their corresponding implementations
    switch (templateType) {
      // User-facing template styles
      case 'classic':
        return this.generateClassicBusinessHTML(invoiceData);
      case 'modern':
        return this.generateModernCreativeHTML(invoiceData); // Modern Clean uses existing Modern Creative template
      case 'minimal':
        return this.generateMinimalHTML(invoiceData);
      case 'bold':
        return this.generateBoldCreativeHTML(invoiceData);
      
      // Legacy template types (backward compatibility)
      case 'executive-professional':
        return this.generateExecutiveProfessionalHTML(invoiceData);
      case 'traditional-corporate':
        return this.generateTraditionalCorporateHTML(invoiceData);
      case 'modern-creative':
        return this.generateModernCreativeHTML(invoiceData);
      case 'minimal-scandinavian':
        return this.generateMinimalScandinavianHTML(invoiceData);
      
      default:
        console.warn('Unknown template type:', templateType, '- defaulting to Classic Business');
        return this.generateClassicBusinessHTML(invoiceData);
    }
  }

  /**
   * Executive Professional Template - Premium gradient design
   */
  private generateExecutiveProfessionalHTML(invoiceData: InvoiceData): string {
    const colorScheme = this.generateColorScheme(invoiceData.template.color_scheme || '#1e40af');
    const business = this.processBusinessInfo(invoiceData);
    const clientAddress = this.processClientAddress(invoiceData.client);
    
    const logoHtml = business.logo_url ? `
      <img src="${business.logo_url}" 
           alt="${business.name}" 
           class="h-12 w-auto object-contain"
           style="max-height: 48px; width: auto;" />
    ` : '';

    const itemsHTML = invoiceData.items.map(item => `
      <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
        <td class="py-4 pr-4">
          <div class="font-medium text-gray-900">${this.escapeHtml(item.description)}</div>
        </td>
        <td class="py-4 px-4 text-center text-gray-600 font-medium">${item.quantity}</td>
        <td class="py-4 px-4 text-right text-gray-900 font-medium">$${item.rate.toFixed(2)}</td>
        <td class="py-4 pl-4 text-right font-semibold text-gray-900">$${item.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    const taxAmount = invoiceData.template.show_tax ? invoiceData.tax_amount || (invoiceData.subtotal * (invoiceData.template.tax_rate || 0)) : 0;
    const total = invoiceData.template.show_tax ? invoiceData.subtotal + taxAmount : invoiceData.subtotal;

    return `
      <div class="max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden invoice-container">
        <!-- Premium Header with Gradient -->
        <div class="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 px-8 py-12 invoice-header invoice-section">
          <div class="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div class="relative z-10">
            <div class="flex items-start justify-between">
              <div class="text-white">
                ${logoHtml}
                <h1 class="text-4xl font-bold text-white mt-4 mb-2" style="color: white;">INVOICE</h1>
                <p class="text-blue-100 text-lg font-medium">#${invoiceData.invoice_number}</p>
              </div>
              <div class="text-right text-white/90">
                <div class="bg-white/15 backdrop-blur-md rounded-lg p-4 border border-white/20">
                  <div class="text-sm font-medium text-white/80 mb-1">Issue Date</div>
                  <div class="font-semibold text-white">${this.formatDate(invoiceData.issue_date)}</div>
                  <div class="text-sm font-medium text-white/80 mb-1 mt-3">Due Date</div>
                  <div class="font-semibold text-white">${this.formatDate(invoiceData.due_date)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Business & Client Information -->
        <div class="px-8 py-8 bg-gray-50/50">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">From</h3>
              <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <div class="font-bold text-lg text-gray-900 mb-2">${this.escapeHtml(business.name)}</div>
                <div class="space-y-1 text-gray-600">
                  <div>${this.escapeHtml(business.email)}</div>
                  ${business.phone ? `<div>${this.escapeHtml(business.phone)}</div>` : ''}
                  ${business.address ? `<div class="whitespace-pre-line">${this.escapeHtml(business.address)}</div>` : ''}
                </div>
              </div>
            </div>
            
            <div>
              <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Bill To</h3>
              <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <div class="font-bold text-lg text-gray-900 mb-2">${this.escapeHtml(invoiceData.client.name)}</div>
                ${invoiceData.client.company_name ? `<div class="text-lg text-gray-800 mb-2">${this.escapeHtml(invoiceData.client.company_name)}</div>` : ''}
                <div class="space-y-1 text-gray-600">
                  <div>${this.escapeHtml(invoiceData.client.email)}</div>
                  ${invoiceData.client.phone ? `<div>${this.escapeHtml(invoiceData.client.phone)}</div>` : ''}
                  <div class="whitespace-pre-line">${this.escapeHtml(clientAddress)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Invoice Items -->
        <div class="px-8 pb-8">
          <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <table class="w-full">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="text-left py-4 px-4 font-semibold text-gray-900">Description</th>
                  <th class="text-center py-4 px-4 font-semibold text-gray-900">Qty</th>
                  <th class="text-right py-4 px-4 font-semibold text-gray-900">Rate</th>
                  <th class="text-right py-4 px-4 font-semibold text-gray-900">Amount</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                ${itemsHTML}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Totals Section -->
        <div class="px-8 pb-8">
          <div class="flex justify-end">
            <div class="w-full max-w-sm bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div class="space-y-3">
                <div class="flex justify-between text-gray-700">
                  <span class="font-medium">Subtotal</span>
                  <span class="font-semibold">$${invoiceData.subtotal.toFixed(2)}</span>
                </div>
                ${invoiceData.template.show_tax ? `
                  <div class="flex justify-between text-gray-700">
                    <span class="font-medium">${invoiceData.template.tax_label || 'Tax'} (${((invoiceData.template.tax_rate || 0) * 100).toFixed(1)}%)</span>
                    <span class="font-semibold">$${taxAmount.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="border-t border-gray-200 pt-3">
                  <div class="flex justify-between text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span style="color: ${colorScheme.primary};">$${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        ${invoiceData.notes || invoiceData.terms ? `
          <!-- Notes & Terms -->
          <div class="px-8 pb-8 space-y-6">
            ${invoiceData.notes ? `
              <div class="bg-blue-50/50 rounded-lg p-6 border border-blue-100">
                <h4 class="font-semibold text-gray-900 mb-3">Notes</h4>
                <p class="text-gray-700 whitespace-pre-line">${this.escapeHtml(invoiceData.notes)}</p>
              </div>
            ` : ''}
            ${invoiceData.terms ? `
              <div class="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h4 class="font-semibold text-gray-900 mb-3">Payment Terms</h4>
                <p class="text-gray-700 whitespace-pre-line">${this.escapeHtml(invoiceData.terms)}</p>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Traditional Corporate Template - Clean professional design
   */
  private generateTraditionalCorporateHTML(invoiceData: InvoiceData): string {
    // EXACT MATCH to React renderTraditionalCorporate() lines 579-729
    const colorScheme = this.generateColorScheme(invoiceData.template.color_scheme || '#1e40af');
    const business = this.processBusinessInfo(invoiceData);
    const clientAddress = this.processClientAddress(invoiceData.client);
    
    // Logo in corporate header (integrated like React lines 588-600)
    const logoHtml = business.logo_url ? `
      <div class="pt-6 pb-4 mx-8 text-left">
        <div class="inline-block bg-white rounded-lg p-4 shadow-lg">
          <img src="${business.logo_url}" 
               alt="Company Logo" 
               style="height: 48px; width: auto; max-width: 160px; object-fit: contain;" 
               class="object-contain" />
        </div>
      </div>
    ` : '';

    // Items table rows (matching React lines 685-693)
    const itemsHTML = invoiceData.items.map((item, index) => `
      <tr class="border-b border-gray-300 ${index % 2 === 1 ? 'bg-gray-50' : ''}">
        <td class="py-3 px-4 text-sm text-gray-700">${this.escapeHtml(item.description)}</td>
        <td class="py-3 px-4 text-sm text-gray-700 text-center">${item.quantity}</td>
        <td class="py-3 px-4 text-sm text-gray-700 text-right">$${item.rate.toFixed(2)}</td>
        <td class="py-3 px-4 text-sm text-gray-700 text-right font-medium">$${item.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    const taxAmount = invoiceData.template.show_tax ? invoiceData.tax_amount || (invoiceData.subtotal * (invoiceData.template.tax_rate || 0)) : 0;
    const total = invoiceData.template.show_tax ? invoiceData.subtotal + taxAmount : invoiceData.subtotal;

    // Subject section (matching React lines 666-671)
    const subjectSection = invoiceData.subject?.trim() ? `
      <div class="bg-blue-50 border-l-4 p-4 rounded-r" style="border-color: ${colorScheme.primary};">
        <h3 class="font-bold text-gray-900 mb-2">Subject:</h3>
        <p class="text-gray-800">${this.escapeHtml(invoiceData.subject)}</p>
      </div>
    ` : '';

    return `
      <div class="bg-white border rounded-lg shadow-sm overflow-hidden font-serif invoice-container">
        <!-- Corporate Header with Integrated Logo (React lines 587-652) -->
        <div class="relative invoice-header invoice-section" style="background-color: ${colorScheme.primary};">
          ${logoHtml}
          <div class="${!business.logo_url ? 'pt-8' : ''} px-8 pb-8">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                ${business.name?.trim() ? `
                  <h1 class="text-4xl font-bold text-white mb-4 tracking-wide">${this.escapeHtml(business.name)}</h1>
                ` : ''}
                <div class="text-white/90 text-sm space-y-2 leading-relaxed">
                  ${business.email?.trim() ? `
                    <div class="flex items-center gap-2">
                      <span class="text-white/70">Email:</span>
                      <span>${this.escapeHtml(business.email)}</span>
                    </div>
                  ` : ''}
                  ${business.phone?.trim() ? `
                    <div class="flex items-center gap-2">
                      <span class="text-white/70">Phone:</span>
                      <span>${this.escapeHtml(business.phone)}</span>
                    </div>
                  ` : ''}
                  ${business.address?.trim() ? `
                    <div class="pt-2">
                      <div class="text-white/70 text-xs uppercase tracking-wider mb-1">Address</div>
                      <div class="whitespace-pre-line">${this.escapeHtml(business.address)}</div>
                    </div>
                  ` : ''}
                </div>
              </div>
              
              <div class="text-right">
                <div class="bg-white rounded-lg p-6 shadow-lg">
                  <h2 class="text-2xl font-bold text-gray-900 mb-4">INVOICE</h2>
                  <div class="text-sm text-gray-600 space-y-2">
                    <div class="flex justify-between">
                      <span class="font-medium">Invoice #:</span> 
                      <span class="text-gray-900 font-semibold">${invoiceData.invoice_number}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="font-medium">Date:</span> 
                      <span class="text-gray-900">${this.formatDate(invoiceData.issue_date)}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="font-medium">Due:</span> 
                      <span class="text-gray-900">${this.formatDate(invoiceData.due_date)}</span>
                    </div>
                  </div>     
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-8 space-y-8">
          <!-- Bill To Section (React lines 655-664) -->
          <div class="bg-gray-50 p-4 rounded">
            <h3 class="font-bold text-gray-900 mb-2">BILL TO:</h3>
            <div class="text-sm text-gray-700">
              <div class="font-medium text-base">${this.escapeHtml(invoiceData.client.name)}</div>
              ${invoiceData.client.company_name?.trim() ? `<div class="font-medium">${this.escapeHtml(invoiceData.client.company_name)}</div>` : ''}
              ${clientAddress?.trim() ? `<div class="whitespace-pre-line mt-1">${this.escapeHtml(clientAddress)}</div>` : ''}
              ${invoiceData.client.email?.trim() ? `<div class="text-sm mt-1 text-gray-600">${this.escapeHtml(invoiceData.client.email)}</div>` : ''}
            </div>
          </div>

          ${subjectSection}

          <!-- Items Table (React lines 674-714) -->
          <div class="space-y-4">
            <table class="w-full border border-gray-300">
              <thead>
                <tr style="background-color: ${colorScheme.primary}; color: white;">
                  <th class="text-left py-3 px-4 font-semibold">Description</th>
                  <th class="text-center py-3 px-4 font-semibold w-20">Qty</th>
                  <th class="text-right py-3 px-4 font-semibold w-24">Rate</th>
                  <th class="text-right py-3 px-4 font-semibold w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
            
            <!-- Totals (React lines 697-714) -->
            <div class="flex justify-end">
              <div class="w-72 border border-gray-300">
                <div class="bg-gray-50 flex justify-between py-2 px-4 border-b">
                  <span class="text-sm font-medium text-gray-700">Subtotal:</span>
                  <span class="text-sm font-medium text-gray-900">$${invoiceData.subtotal.toFixed(2)}</span>
                </div>
                ${invoiceData.template.show_tax ? `
                  <div class="bg-gray-50 flex justify-between py-2 px-4 border-b">
                    <span class="text-sm font-medium text-gray-700">Tax (${((invoiceData.template.tax_rate || 0) * 100).toFixed(1)}%):</span>
                    <span class="text-sm font-medium text-gray-900">$${taxAmount.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="flex justify-between py-3 px-4" style="background-color: ${colorScheme.primary}; color: white;">
                  <span class="font-bold">TOTAL:</span>
                  <span class="font-bold text-lg">$${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          ${(invoiceData.notes?.trim()) || (invoiceData.terms?.trim()) ? `
            <!-- Footer (React lines 718-725) -->
            <div class="border-t-2 border-gray-300 pt-6">
              <div class="text-sm text-gray-700">
                ${invoiceData.terms?.trim() ? `<div><strong>Payment Terms:</strong> ${this.escapeHtml(invoiceData.terms)}</div>` : ''}
                ${invoiceData.notes?.trim() ? `<div class="mt-2"><strong>Notes:</strong> ${this.escapeHtml(invoiceData.notes)}</div>` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Classic Business Template - Clean professional design (maps to Traditional Corporate)
   */
  private generateClassicBusinessHTML(invoiceData: InvoiceData): string {
    return this.generateTraditionalCorporateHTML(invoiceData);
  }


  /**
   * Minimal Template - Simple clean design
   */
  private generateMinimalHTML(invoiceData: InvoiceData): string {
    // For now, fallback to modern clean
    return this.generateModernCleanHTML(invoiceData);
  }

  /**
   * Bold Creative Template - Bold design with creative elements
   */
  private generateBoldCreativeHTML(invoiceData: InvoiceData): string {
    // For now, fallback to executive professional
    return this.generateExecutiveProfessionalHTML(invoiceData);
  }

  /**
   * Modern Creative Template - Modern Clean design (user-facing "Modern Clean" style)
   */
  private generateModernCreativeHTML(invoiceData: InvoiceData): string {
    const colorScheme = this.generateColorScheme(invoiceData.template.color_scheme || '#1e40af');
    const business = this.processBusinessInfo(invoiceData);
    const clientAddress = this.processClientAddress(invoiceData.client);
    
    // Logo integrated into modern design
    const logoHtml = business.logo_url ? `
      <div class="pt-8 pb-4 mx-10 text-left">
        <div class="inline-block p-4 rounded-2xl border-2 shadow-lg" style="border-color: ${colorScheme.primary}40; background-color: ${colorScheme.primary}08;">
          <img src="${business.logo_url}" 
               alt="Company Logo" 
               style="height: 48px; width: auto; max-width: 160px; object-fit: contain;" 
               class="object-contain" />
        </div>
      </div>
    ` : '';

    const itemsHTML = invoiceData.items.map((item, index) => `
      <tr class="border-b border-gray-100">
        <td class="py-4 px-6 text-gray-800">${this.escapeHtml(item.description)}</td>
        <td class="py-4 px-4 text-center text-gray-700">${item.quantity}</td>
        <td class="py-4 px-4 text-right text-gray-700">$${item.rate.toFixed(2)}</td>
        <td class="py-4 px-6 text-right font-semibold text-gray-900">$${item.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    const taxAmount = invoiceData.template.show_tax ? invoiceData.tax_amount || (invoiceData.subtotal * (invoiceData.template.tax_rate || 0)) : 0;
    const total = invoiceData.template.show_tax ? invoiceData.subtotal + taxAmount : invoiceData.subtotal;

    return `
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden invoice-container">
        <!-- Modern Header with Integrated Logo -->
        <div class="bg-white relative invoice-header invoice-section">
          ${logoHtml}
          <div class="px-10 pb-10 ${!business.logo_url ? 'pt-8' : ''}">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                ${business.name?.trim() ? `
                  <h1 class="text-3xl font-semibold mb-4 tracking-tight" style="color: ${colorScheme.primary};">
                    ${this.escapeHtml(business.name)}
                  </h1>
                ` : ''}
                <div class="text-sm text-gray-600 space-y-2">
                  ${business.address?.trim() ? `
                    <div class="whitespace-pre-line leading-relaxed">${this.escapeHtml(business.address)}</div>
                  ` : ''}
                  <div class="flex flex-wrap gap-4 pt-1">
                    ${business.email?.trim() ? `
                      <div class="flex items-center gap-1">
                        <span class="text-gray-400">@</span>
                        <span>${this.escapeHtml(business.email)}</span>
                      </div>
                    ` : ''}
                    ${business.phone?.trim() ? `
                      <div class="flex items-center gap-1">
                        <span class="text-gray-400">✆</span>
                        <span>${this.escapeHtml(business.phone)}</span>
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>
              
              <div class="text-right">
                <div class="text-4xl font-light mb-2 tracking-wider" style="color: ${colorScheme.primary};">INVOICE</div>
                <div class="text-xl font-bold text-gray-900 mb-6">#${invoiceData.invoice_number}</div>
                <div class="space-y-3">
                  <div class="p-4 rounded-xl border-l-4 text-left" style="background-color: ${colorScheme.primary}05; border-left-color: ${colorScheme.primary};">
                    <div class="text-xs font-medium text-gray-500 mb-1">Issue Date</div>
                    <div class="font-semibold text-gray-900">${this.formatDate(invoiceData.issue_date)}</div>
                  </div>
                  <div class="p-4 rounded-xl border-l-4 text-left" style="background-color: ${colorScheme.primary}05; border-left-color: ${colorScheme.primary};">
                    <div class="text-xs font-medium text-gray-500 mb-1">Due Date</div>
                    <div class="font-semibold text-gray-900">${this.formatDate(invoiceData.due_date)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modern Client Information -->
        <div class="bg-white rounded-2xl shadow-sm border-2 p-8 mx-10 mt-8 invoice-client-info invoice-section" style="border-color: ${colorScheme.primary}20;">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="text-base font-semibold mb-5" style="color: ${colorScheme.primary};">Bill To</h3>
              <div class="space-y-4">
                <div class="text-lg font-semibold text-gray-900">${this.escapeHtml(invoiceData.client.name)}</div>
                ${invoiceData.client.company_name?.trim() ? `
                  <div class="text-base text-gray-700">${this.escapeHtml(invoiceData.client.company_name)}</div>
                ` : ''}
                <div class="space-y-1 text-gray-600">
                  ${invoiceData.client.email?.trim() ? `<div>${this.escapeHtml(invoiceData.client.email)}</div>` : ''}
                  ${clientAddress?.trim() ? `
                    <div class="text-sm whitespace-pre-line">${this.escapeHtml(clientAddress)}</div>
                  ` : ''}
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="p-6 rounded-2xl" style="background-color: ${colorScheme.primary}08;">
                <div class="bg-white rounded-xl p-4 shadow-sm">
                  <div class="text-sm text-gray-600 mb-1">Total Amount</div>
                  <div class="text-2xl font-bold" style="color: ${colorScheme.primary};">$${total.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        ${invoiceData.subject?.trim() ? `
          <!-- Modern Project Description -->
          <div class="bg-white rounded-2xl shadow-sm border-l-4 p-8 mx-10 mt-8" style="border-left-color: ${colorScheme.primary};">
            <h3 class="text-base font-semibold mb-4" style="color: ${colorScheme.primary};">Project Overview</h3>
            <p class="text-gray-800 text-lg leading-relaxed">${this.escapeHtml(invoiceData.subject)}</p>
          </div>
        ` : ''}
        
        <!-- Items Table -->
        <div class="bg-white border overflow-hidden mx-8 mt-8 invoice-items-section" style="border-color: ${colorScheme.primary};">
          <table class="w-full">
            <thead class="table-header">
              <tr class="text-white text-sm font-semibold" style="background-color: ${colorScheme.primary};">
                <th class="text-left py-4 px-6">Description</th>
                <th class="text-center py-4 px-4 w-20">Qty</th>
                <th class="text-right py-4 px-4 w-24">Rate</th>
                <th class="text-right py-4 px-6 w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
        </div>
        
        <!-- Totals -->
        <div class="flex justify-end totals-section invoice-totals">
          <div class="bg-gray-50 border-t-2 p-6 m-8 min-w-80" style="border-top-color: ${colorScheme.primary};">
            <div class="space-y-3">
              <div class="flex justify-between items-center py-2 border-b border-gray-200">
                <span class="text-gray-600">Subtotal</span>
                <span class="text-gray-900 font-semibold">$${invoiceData.subtotal.toFixed(2)}</span>
              </div>
              ${invoiceData.template.show_tax ? `
                <div class="flex justify-between items-center py-2 border-b border-gray-200">
                  <span class="text-gray-600">Tax (${((invoiceData.template.tax_rate || 0) * 100).toFixed(1)}%)</span>
                  <span class="text-gray-900 font-semibold">$${taxAmount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="flex justify-between items-center pt-3 border-t-2" style="border-top-color: ${colorScheme.primary};">
                <span class="text-lg font-semibold" style="color: ${colorScheme.primary};">Total Due</span>
                <span class="text-xl font-bold" style="color: ${colorScheme.primary};">$${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
          
        ${(invoiceData.notes?.trim()) || (invoiceData.terms?.trim()) ? `
          <!-- Footer -->
          <div class="border-t p-6 mx-8 mt-8 invoice-footer" style="border-top-color: ${colorScheme.primary};">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
              ${invoiceData.terms?.trim() ? `
                <div>
                  <h4 class="text-sm font-semibold mb-2" style="color: ${colorScheme.primary};">Payment Terms</h4>
                  <p class="text-sm text-gray-700">${this.escapeHtml(invoiceData.terms)}</p>
                </div>
              ` : ''}
              ${invoiceData.notes?.trim() ? `
                <div>
                  <h4 class="text-sm font-semibold mb-2" style="color: ${colorScheme.primary};">Notes</h4>
                  <p class="text-sm text-gray-700">${this.escapeHtml(invoiceData.notes)}</p>
                </div>
              ` : ''}
            </div>
            <div class="mt-6 pt-4 border-t border-gray-200 text-center">
              <p class="text-sm text-gray-500">Thank you for your business.</p>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Minimal Scandinavian Template - Coming soon (legacy)
   */
  private generateMinimalScandinavianHTML(invoiceData: InvoiceData): string {
    // For now, fallback to minimal
    return this.generateMinimalHTML(invoiceData);
  }

  /**
   * Generate complete HTML document wrapper with enhanced CSS
   */
  private generateDocumentHTML(content: string, invoiceData: InvoiceData, colorScheme: ColorScheme): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Invoice ${invoiceData.invoice_number}</title>
    
    <!-- Tailwind CSS CDN - CRITICAL for matching React preview exactly -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Google Fonts for consistency -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=block" rel="stylesheet">
    
    <style>
        /* CSS Variables for consistent theming */
        :root {
            --primary-color: ${colorScheme.primary};
            --secondary-color: ${colorScheme.secondary};
            --accent-color: ${colorScheme.accent};
            --text-color: ${colorScheme.text};
            --text-secondary: ${colorScheme.textSecondary};
            --background-color: ${colorScheme.background};
            --border-color: ${colorScheme.border};
        }
        
        /* PDF-specific styles */
        body { 
            margin: 0; 
            padding: 20px; 
            background: white;
            font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            print-color-adjust: exact;
            font-feature-settings: "liga" 1, "kern" 1;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        /* Ensure all backgrounds and colors are preserved in PDF */
        * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        
        /* Enhanced opacity class support for PDF rendering */
        .bg-white\\/10 { background-color: rgba(255, 255, 255, 0.1) !important; }
        .bg-white\\/15 { background-color: rgba(255, 255, 255, 0.15) !important; }
        .bg-white\\/20 { background-color: rgba(255, 255, 255, 0.2) !important; }
        .bg-white\\/90 { background-color: rgba(255, 255, 255, 0.9) !important; }
        .text-white\\/80 { color: rgba(255, 255, 255, 0.8) !important; }
        .text-white\\/90 { color: rgba(255, 255, 255, 0.9) !important; }
        .text-blue-100 { color: #dbeafe !important; }
        .border-white\\/20 { border-color: rgba(255, 255, 255, 0.2) !important; }
        
        /* Enhanced backdrop blur with fallbacks */
        .backdrop-blur-md {
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            /* Solid fallback for PDF rendering */
            background-color: rgba(255, 255, 255, 0.15) !important;
        }
        
        /* Gradient support for PDFs */
        [style*="background: linear-gradient"],
        [style*="background-image: linear-gradient"],
        .bg-gradient-to-br,
        .bg-gradient-to-r {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        
        /* Enhanced shadow definitions */
        .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important; }
        .shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important; }
        .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important; }
        .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important; }
        .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important; }
        
        /* Image loading and error handling */
        img {
            max-width: 100%;
            height: auto;
            display: block;
        }
        
        img[src=""], img:not([src]) {
            display: none;
        }
        
        /* Table styling for consistent borders */
        table {
            border-collapse: collapse;
            width: 100%;
        }
        
        th, td {
            border-color: inherit;
        }
        
        /* Page break control for PDF generation */
        .invoice-container {
            page-break-inside: avoid;
        }
        
        /* Prevent page breaks within critical sections */
        .invoice-header,
        .invoice-business-info,
        .invoice-client-info,
        .invoice-totals,
        .table-header {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        /* Allow page breaks before these sections if needed */
        .invoice-items-section {
            page-break-inside: auto;
        }
        
        /* Keep table headers with content */
        thead {
            display: table-header-group;
        }
        
        /* Prevent orphaned table headers */
        thead tr {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        /* Keep table rows together when possible */
        tbody tr {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        /* Allow page breaks between table rows if necessary */
        tbody {
            page-break-inside: auto;
        }
        
        /* Prevent page breaks within cards and rounded sections */
        .bg-white.rounded-lg,
        .bg-white.rounded-2xl,
        .bg-gray-50.rounded-lg {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        /* Keep totals section together */
        .totals-section {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        /* Keep footer sections together */
        .invoice-footer {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        /* Ensure adequate spacing between sections on page breaks */
        .invoice-section {
            margin-bottom: 20pt;
        }
        
        /* Prevent widow/orphan lines */
        p, div {
            orphans: 3;
            widows: 3;
        }
        
        /* Print media queries for PDF optimization */
        @media print {
            body { 
                margin: 0; 
                padding: 0; 
                font-size: 12pt;
                line-height: 1.4;
            }
            
            .invoice-container { 
                margin: 0; 
                max-width: none; 
                box-shadow: none !important;
            }
            
            /* Enhanced color preservation */
            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            /* Optimize spacing for print */
            .px-8 { padding-left: 20pt !important; padding-right: 20pt !important; }
            .py-8 { padding-top: 20pt !important; padding-bottom: 20pt !important; }
            .mb-8 { margin-bottom: 20pt !important; }
            
            /* Ensure table borders are visible */
            table, th, td {
                border-color: #e5e7eb !important;
            }
        }
    </style>
    
    <!-- Enhanced Tailwind configuration -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'white/10': 'rgba(255, 255, 255, 0.1)',
                        'white/15': 'rgba(255, 255, 255, 0.15)',
                        'white/20': 'rgba(255, 255, 255, 0.2)',
                        'white/80': 'rgba(255, 255, 255, 0.8)',
                        'white/90': 'rgba(255, 255, 255, 0.9)',
                        'blue-100': '#dbeafe',
                    },
                    backdropBlur: {
                        'md': '12px'
                    },
                    fontFamily: {
                        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
                    }
                }
            }
        }
    </script>
</head>
<body>
    <div class="invoice-container">
        ${content}
    </div>
    
    <!-- Enhanced image loading detection -->
    <script>
        // Wait for all images to load or fail
        const images = document.querySelectorAll('img');
        let loadedImages = 0;
        const totalImages = images.length;
        
        function checkAllImagesLoaded() {
            loadedImages++;
            if (loadedImages >= totalImages) {
                document.body.classList.add('images-loaded');
            }
        }
        
        images.forEach(img => {
            if (img.complete) {
                checkAllImagesLoaded();
            } else {
                img.addEventListener('load', checkAllImagesLoaded);
                img.addEventListener('error', checkAllImagesLoaded);
            }
        });
        
        // Fallback if no images
        if (totalImages === 0) {
            document.body.classList.add('images-loaded');
        }
    </script>
</body>
</html>`;
  }

  // Helper methods
  private processBusinessInfo(invoiceData: InvoiceData) {
    const { template, business } = invoiceData;
    
    // Merge business data with template data to match preview behavior
    // Template company fields take precedence over business fields
    return {
      name: template.company_name || business.name || "Your Business",
      email: template.company_email || business.email || "",
      phone: template.company_phone || business.phone || "",
      address: template.company_address || this.formatAddress(business),
      logo_url: template.logo_url,
      logo_size: template.logo_size || 'medium',
      logo_position: template.logo_position || 'left'
    };
  }

  private processClientAddress(client: InvoiceData['client']): string {
    const addressParts = [
      client.address_line1,
      client.address_line2,
      [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
      client.country !== 'United States' ? client.country : null
    ].filter(Boolean);

    return addressParts.join('\n');
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

  private formatDate(dateString: string): string {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Export singleton instance
export const directHTMLRenderer = new DirectHTMLRenderer();