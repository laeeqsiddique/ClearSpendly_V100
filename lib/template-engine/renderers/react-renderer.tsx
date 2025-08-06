import React from 'react';
import { TemplateConfig, InvoiceData, ColorScheme } from '../types';
import { parseLocalDate } from '@/lib/date-utils';

export class ReactRenderer {
  render(config: TemplateConfig, invoiceData: InvoiceData): React.ReactElement {
    const primaryColor = invoiceData.template.color_scheme || '#1e40af';
    const colorScheme = this.generateColorScheme(primaryColor);

    // Process data for consistent rendering
    const processedData = this.processInvoiceData(invoiceData);

    // Create CSS variables for the color scheme
    const cssVariables = {
      '--primary-color': colorScheme.primary,
      '--secondary-color': colorScheme.secondary,
      '--accent-color': colorScheme.accent,
      '--text-color': colorScheme.text,
      '--text-secondary-color': colorScheme.textSecondary,
      '--background-color': colorScheme.background,
      '--border-color': colorScheme.border
    } as React.CSSProperties;

    // Render the template with CSS variables applied
    const templateContent = this.renderTemplate(config, processedData, colorScheme);
    
    return (
      <div style={cssVariables}>
        {templateContent}
      </div>
    );
  }

  private renderTemplate(config: TemplateConfig, data: ProcessedInvoiceData, colors: ColorScheme): React.ReactElement {
    // Render based on template type - support both user-facing styles and legacy types
    const templateType = data.template?.template_type || config.type;
    console.log('ReactRenderer: Rendering template type:', templateType);
    
    switch (templateType) {
      // User-facing template styles
      case 'classic':
        return this.renderTraditionalCorporate(config, data, colors); // Classic Business → Traditional Corporate
      case 'modern':
        return this.renderModernCreative(config, data, colors); // Modern Clean → Modern Creative (original design)
      case 'minimal':
        return this.renderMinimalScandinavian(config, data, colors); // Minimal → Minimal Scandinavian
      case 'bold':
        return this.renderExecutiveProfessional(config, data, colors); // Bold Creative → Executive Professional
      
      // Legacy template types (backward compatibility)
      case 'executive-professional':
        return this.renderExecutiveProfessional(config, data, colors);
      case 'modern-creative':
        return this.renderModernCreative(config, data, colors);
      case 'minimal-scandinavian':
        return this.renderMinimalScandinavian(config, data, colors);
      case 'traditional-corporate':
        return this.renderTraditionalCorporate(config, data, colors);
      
      default:
        console.warn('Unknown template type:', templateType, '- defaulting to Traditional Corporate');
        return this.renderTraditionalCorporate(config, data, colors);
    }
  }

  private renderExecutiveProfessional(
    config: TemplateConfig, 
    data: ProcessedInvoiceData, 
    colors: ColorScheme
  ): React.ReactElement {
    return (
      <div className={config.styles.react.container}>
        {/* Executive Header with Integrated Logo */}
        <div className="relative" style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)` }}>
          {/* Logo at top of gradient header */}
          {data.business.logo_url && (
            <div className={`pt-8 pb-4 mx-12 ${this.getLogoAlignment(data.business.logo_position)}`}>
              <div className="inline-block bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-xl">
                <img 
                  src={data.business.logo_url} 
                  alt="Company Logo" 
                  style={{ height: this.getLogoHeight(data.business.logo_size), width: 'auto', maxWidth: '150px' }}
                  className="object-contain"
                />
              </div>
            </div>
          )}
          <div className={`px-12 pb-12 ${!data.business.logo_url ? 'pt-8' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {data.business.name && data.business.name.trim() && (
                  <h1 className="text-3xl font-bold mb-4 text-white tracking-wide">
                    {data.business.name}
                  </h1>
                )}
                <div className="text-white/90 space-y-2">
                  {data.business.address && data.business.address.trim() && (
                    <div className="whitespace-pre-line leading-relaxed">{data.business.address}</div>
                  )}
                  <div className="flex flex-wrap gap-6 text-sm pt-2">
                    {data.business.email && data.business.email.trim() && (
                      <div className="flex items-center gap-2">
                        <span>✉</span>
                        <span>{data.business.email}</span>
                      </div>
                    )}
                    {data.business.phone && data.business.phone.trim() && (
                      <div className="flex items-center gap-2">
                        <span>☎</span>
                        <span>{data.business.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-right">
                  <div className="text-3xl font-light mb-3 text-white tracking-widest">INVOICE</div>
                  <div className="text-xl font-bold text-white">#{data.invoice_number}</div>
                  <div className="text-sm mt-4 space-y-2 text-white/80">
                    <div>Issued: {data.issue_date}</div>
                    <div>Due: {data.due_date}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Client Information */}
        <div className="bg-white rounded-lg shadow-lg border-l-4 p-8 mx-12 -mt-6 relative z-10" style={{ borderLeftColor: colors.primary }}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-6 text-gray-500">Bill To</h3>
              <div className="space-y-3">
                <div className="text-xl font-bold text-gray-900">{data.client.name}</div>
                {data.client.company_name && data.client.company_name.trim() && <div className="text-lg font-semibold text-gray-700">{data.client.company_name}</div>}
                {data.client.email && data.client.email.trim() && <div className="text-gray-600">{data.client.email}</div>}
                {data.client.address && data.client.address.trim() && (
                  <div className="text-gray-600 text-sm whitespace-pre-line">{data.client.address}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Executive Subject Section */}
        {data.subject && data.subject.trim() && (
          <div className="bg-white rounded-lg shadow-lg border-l-4 p-8 mx-12 mt-8" style={{ borderLeftColor: colors.primary }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-500">Project Description</h3>
            <p className="text-gray-800 text-lg leading-relaxed font-medium">{data.subject}</p>
          </div>
        )}
        
        {/* Executive Items Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mx-12 mt-8">
          <table className="w-full">
            <thead>
              <tr className="text-white text-sm font-semibold" style={{ backgroundColor: colors.primary }}>
                <th className="text-left py-4 px-6">Description</th>
                <th className="text-center py-4 px-4 w-20">Qty</th>
                <th className="text-right py-4 px-4 w-24">Rate</th>
                <th className="text-right py-4 px-6 w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-4 px-6 text-gray-800">
                    {item.description}
                  </td>
                  <td className="py-4 px-4 text-center text-gray-700">
                    {item.quantity}
                  </td>
                  <td className="py-4 px-4 text-right text-gray-700">
                    ${item.rate.toFixed(2)}
                  </td>
                  <td className="py-4 px-6 text-right font-semibold text-gray-900">
                    ${item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Totals Section */}
        <div className="flex justify-end">
          <div className="bg-gray-50 border-t-2 p-6 m-8 min-w-80" style={{ borderTopColor: colors.primary }}>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900 font-semibold">${data.subtotal.toFixed(2)}</span>
              </div>
              {data.tax_rate > 0 && data.tax_amount > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">
                    Tax ({(data.tax_rate * 100).toFixed(1)}%)
                  </span>
                  <span className="text-gray-900 font-semibold">${data.tax_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t-2" style={{ borderTopColor: colors.primary }}>
                <span className="text-lg font-semibold" style={{ color: colors.primary }}>Total Due</span>
                <span className="text-xl font-bold" style={{ color: colors.primary }}>
                  ${data.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
          
        {/* Footer */}
        {((data.notes && data.notes.trim()) || (data.terms && data.terms.trim())) && (
          <div className="border-t p-6 mx-8 mt-8" style={{ borderTopColor: colors.primary }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {data.terms && data.terms.trim() && (
                <div>
                  <h4 className="text-sm font-semibold mb-2" style={{ color: colors.primary }}>Payment Terms</h4>
                  <p className="text-sm text-gray-700">{data.terms}</p>
                </div>
              )}
              {data.notes && data.notes.trim() && (
                <div>
                  <h4 className="text-sm font-semibold mb-2" style={{ color: colors.primary }}>Notes</h4>
                  <p className="text-sm text-gray-700">{data.notes}</p>
                </div>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                Thank you for your business.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  private renderModernCreative(
    config: TemplateConfig, 
    data: ProcessedInvoiceData, 
    colors: ColorScheme
  ): React.ReactElement {
    return (
      <div className={config.styles.react.container}>
        {/* Modern Header with Integrated Logo */}
        <div className="bg-white relative">
          {/* Logo integrated into modern design */}
          {data.business.logo_url && (
            <div className={`pt-8 pb-4 mx-10 ${this.getLogoAlignment(data.business.logo_position)}`}>
              <div className="inline-block p-4 rounded-2xl border-2 shadow-lg" style={{ borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}08` }}>
                <img 
                  src={data.business.logo_url} 
                  alt="Company Logo" 
                  style={{ height: this.getLogoHeight(data.business.logo_size), width: 'auto', maxWidth: '160px' }}
                  className="object-contain"
                />
              </div>
            </div>
          )}
          <div className={`px-10 pb-10 ${!data.business.logo_url ? 'pt-8' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {data.business.name && data.business.name.trim() && (
                  <h1 className="text-3xl font-semibold mb-4 tracking-tight" style={{ color: colors.primary }}>
                    {data.business.name}
                  </h1>
                )}
                <div className="text-sm text-gray-600 space-y-2">
                  {data.business.address && data.business.address.trim() && (
                    <div className="whitespace-pre-line leading-relaxed">{data.business.address}</div>
                  )}
                  <div className="flex flex-wrap gap-4 pt-1">
                    {data.business.email && data.business.email.trim() && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">@</span>
                        <span>{data.business.email}</span>
                      </div>
                    )}
                    {data.business.phone && data.business.phone.trim() && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">✆</span>  
                        <span>{data.business.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-4xl font-light mb-2 tracking-wider" style={{ color: colors.primary }}>INVOICE</div>
                <div className="text-xl font-bold text-gray-900 mb-6">
                  #{data.invoice_number}
                </div>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border-l-4 text-left" style={{ backgroundColor: `${colors.primary}05`, borderLeftColor: colors.primary }}>
                    <div className="text-xs font-medium text-gray-500 mb-1">Issue Date</div>
                    <div className="font-semibold text-gray-900">{data.issue_date}</div>
                  </div>
                  <div className="p-4 rounded-xl border-l-4 text-left" style={{ backgroundColor: `${colors.primary}05`, borderLeftColor: colors.primary }}>
                    <div className="text-xs font-medium text-gray-500 mb-1">Due Date</div>
                    <div className="font-semibold text-gray-900">{data.due_date}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Client Information */}
        <div className="bg-white rounded-2xl shadow-sm border-2 p-8 mx-10 mt-8" style={{ borderColor: `${colors.primary}20` }}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-base font-semibold mb-5" style={{ color: colors.primary }}>Bill To</h3>
              <div className="space-y-4">
                <div className="text-lg font-semibold text-gray-900">
                  {data.client.name}
                </div>
                {data.client.company_name && (
                  <div className="text-base text-gray-700">{data.client.company_name}</div>
                )}
                <div className="space-y-1 text-gray-600">
                  {data.client.email && data.client.email.trim() && <div>{data.client.email}</div>}
                  {data.client.address && data.client.address.trim() && (
                    <div className="text-sm whitespace-pre-line">{data.client.address}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="p-6 rounded-2xl" style={{ backgroundColor: `${colors.primary}08` }}>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                  <div className="text-2xl font-bold" style={{ color: colors.primary }}>${data.total_amount.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Project Description */}
        {data.subject && data.subject.trim() && (
          <div className="bg-white rounded-2xl shadow-sm border-l-4 p-8 mx-10 mt-8" style={{ borderLeftColor: colors.primary }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: colors.primary }}>Project Overview</h3>
            <p className="text-gray-800 text-lg leading-relaxed">{data.subject}</p>
          </div>
        )}
        
        {/* Items Table */}
        <div className="bg-white border overflow-hidden mx-8 mt-8" style={{ borderColor: colors.primary }}>
          <table className="w-full">
            <thead>
              <tr className="text-white text-sm font-semibold" style={{ backgroundColor: colors.primary }}>
                <th className="text-left py-4 px-6">Description</th>
                <th className="text-center py-4 px-4 w-20">Qty</th>
                <th className="text-right py-4 px-4 w-24">Rate</th>
                <th className="text-right py-4 px-6 w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-4 px-6 text-gray-800">
                    {item.description}
                  </td>
                  <td className="py-4 px-4 text-center text-gray-700">
                    {item.quantity}
                  </td>
                  <td className="py-4 px-4 text-right text-gray-700">
                    ${item.rate.toFixed(2)}
                  </td>
                  <td className="py-4 px-6 text-right font-semibold text-gray-900">
                    ${item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Totals */}
        <div className="flex justify-end">
          <div className="bg-gray-50 border-t-2 p-6 m-8 min-w-80" style={{ borderTopColor: colors.primary }}>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900 font-semibold">${data.subtotal.toFixed(2)}</span>
              </div>
              {data.tax_rate > 0 && data.tax_amount > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">
                    Tax ({(data.tax_rate * 100).toFixed(1)}%)
                  </span>
                  <span className="text-gray-900 font-semibold">${data.tax_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t-2" style={{ borderTopColor: colors.primary }}>
                <span className="text-lg font-semibold" style={{ color: colors.primary }}>Total Due</span>
                <span className="text-xl font-bold" style={{ color: colors.primary }}>
                  ${data.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
          
        {/* Footer */}
        {(data.notes || data.terms) && (
          <div className="border-t p-6 mx-8 mt-8" style={{ borderTopColor: colors.primary }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {data.terms && (
                <div>
                  <h4 className="text-sm font-semibold mb-2" style={{ color: colors.primary }}>Payment Terms</h4>
                  <p className="text-sm text-gray-700">{data.terms}</p>
                </div>
              )}
              {data.notes && (
                <div>
                  <h4 className="text-sm font-semibold mb-2" style={{ color: colors.primary }}>Notes</h4>
                  <p className="text-sm text-gray-700">{data.notes}</p>
                </div>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                Thank you for your business.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  private renderMinimalScandinavian(
    config: TemplateConfig, 
    data: ProcessedInvoiceData, 
    colors: ColorScheme
  ): React.ReactElement {
    return (
      <div className={config.styles.react.container}>
        {/* Minimal Header with Integrated Logo */}
        <div className="border-b-2" style={{ borderBottomColor: colors.primary }}>
          {/* Logo integrated into minimal design */}
          {data.business.logo_url && (
            <div className={`pt-6 pb-4 mx-8 ${this.getLogoAlignment(data.business.logo_position)}`}>
              <div className="inline-block p-3 bg-gray-50 rounded-lg border border-gray-200">
                <img 
                  src={data.business.logo_url} 
                  alt="Company Logo" 
                  style={{ height: this.getLogoHeight(data.business.logo_size), width: 'auto', maxWidth: '130px' }}
                  className="object-contain"
                />
              </div>
            </div>
          )}
          <div className={`px-8 pb-8 ${!data.business.logo_url ? 'pt-6' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {data.business.name && data.business.name.trim() && (
                  <h1 className="text-lg font-medium mb-3" style={{ color: colors.primary }}>
                    {data.business.name}
                  </h1>
                )}
                <div className="text-xs text-gray-500 space-y-1 leading-relaxed">
                  {data.business.email && data.business.email.trim() && (
                    <div className="flex items-center gap-2">
                      <span>{data.business.email}</span>
                    </div>
                  )}
                  {data.business.phone && data.business.phone.trim() && (
                    <div className="flex items-center gap-2">
                      <span>{data.business.phone}</span>
                    </div>
                  )}
                  {data.business.address && data.business.address.trim() && (
                    <div className="whitespace-pre-line pt-1">{data.business.address}</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <h2 className="text-xs uppercase tracking-wider mb-2" style={{ color: colors.primary }}>Invoice</h2>
              <p className="text-lg font-normal text-gray-900 mb-4">
                #{data.invoice_number}
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>
                  <span className="uppercase tracking-wider" style={{ color: colors.primary }}>Issued</span>
                  <div className="text-gray-900 mt-1">{data.issue_date}</div>
                </div>
                <div className="pt-2">
                  <span className="uppercase tracking-wider" style={{ color: colors.primary }}>Due</span>
                  <div className="text-gray-900 mt-1">{data.due_date}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Client Information */}
          <div>
            <div className="uppercase tracking-wider text-xs mb-3" style={{ color: colors.primary }}>Bill To</div>
            <div className="text-gray-900">
              <div className="font-medium text-sm mb-1">{data.client.name}</div>
              {data.client.company_name && data.client.company_name.trim() && (
                <div className="text-sm text-gray-700 mb-1">{data.client.company_name}</div>
              )}
              {data.client.email && data.client.email.trim() && (
                <div className="text-xs text-gray-600 mb-1">{data.client.email}</div>
              )}
              {data.client.address && data.client.address.trim() && (
                <div className="text-xs text-gray-600 whitespace-pre-line">{data.client.address}</div>
              )}
            </div>
          </div>

          {data.subject && data.subject.trim() && (
            <div>
              <div className="text-gray-400 uppercase tracking-wider text-xs mb-2">Subject</div>
              <div className="text-sm text-gray-900">{data.subject}</div>
            </div>
          )}
          
          {/* Minimal Table */}
          <div className="space-y-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderBottomColor: colors.primary }}>
                  <th className="text-left py-2 uppercase tracking-wider" style={{ color: colors.primary }}>Description</th>
                  <th className="text-center py-2 uppercase tracking-wider w-16" style={{ color: colors.primary }}>Qty</th>
                  <th className="text-right py-2 uppercase tracking-wider w-20" style={{ color: colors.primary }}>Rate</th>
                  <th className="text-right py-2 uppercase tracking-wider w-20" style={{ color: colors.primary }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 text-gray-900">{item.description}</td>
                    <td className="py-3 text-center text-gray-700">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-700">{item.rate.toFixed(2)}</td>
                    <td className="py-3 text-right text-gray-900 font-medium">{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Minimal Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{data.subtotal.toFixed(2)}</span>
                </div>
                {data.tax_rate > 0 && data.tax_amount > 0 && (
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900">{data.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t-2" style={{ borderTopColor: colors.primary }}>
                  <span className="font-medium" style={{ color: colors.primary }}>Total</span>
                  <span className="font-semibold" style={{ color: colors.primary }}>${data.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Minimal Footer */}
          {((data.notes && data.notes.trim()) || (data.terms && data.terms.trim())) && (
            <div className="pt-6 border-t space-y-4" style={{ borderTopColor: colors.primary }}>
              {data.notes && data.notes.trim() && (
                <div>
                  <div className="uppercase tracking-wider text-xs mb-2" style={{ color: colors.primary }}>Notes</div>
                  <p className="text-xs text-gray-600 leading-relaxed">{data.notes}</p>
                </div>
              )}
              {data.terms && data.terms.trim() && (
                <div>
                  <div className="uppercase tracking-wider text-xs mb-2" style={{ color: colors.primary }}>Payment Terms</div>
                  <p className="text-xs text-gray-600">{data.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  private renderTraditionalCorporate(
    config: TemplateConfig, 
    data: ProcessedInvoiceData, 
    colors: ColorScheme
  ): React.ReactElement {
    return (
      <div className={config.styles.react.container}>
        {/* Corporate Header with Integrated Logo */}
        <div className="relative" style={{ backgroundColor: colors.primary }}>
          {/* Logo integrated into corporate header */}
          {data.business.logo_url && (
            <div className={`pt-6 pb-4 mx-8 ${this.getLogoAlignment(data.business.logo_position)}`}>
              <div className="inline-block bg-white rounded-lg p-4 shadow-lg">
                <img 
                  src={data.business.logo_url} 
                  alt="Company Logo" 
                  style={{ height: this.getLogoHeight(data.business.logo_size), width: 'auto', maxWidth: '160px' }}
                  className="object-contain"
                />
              </div>
            </div>
          )}
          <div className={`px-8 pb-8 ${!data.business.logo_url ? 'pt-8' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {data.business.name && data.business.name.trim() && (
                  <h1 className="text-4xl font-bold text-white mb-4 tracking-wide">
                    {data.business.name}
                  </h1>
                )}
                <div className="text-white/90 text-sm space-y-2 leading-relaxed">
                  {data.business.email && data.business.email.trim() && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/70">Email:</span>
                      <span>{data.business.email}</span>
                    </div>
                  )}
                  {data.business.phone && data.business.phone.trim() && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/70">Phone:</span>
                      <span>{data.business.phone}</span>
                    </div>
                  )}
                  {data.business.address && data.business.address.trim() && (
                    <div className="pt-2">
                      <div className="text-white/70 text-xs uppercase tracking-wider mb-1">Address</div>
                      <div className="whitespace-pre-line">{data.business.address}</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="bg-white rounded-lg p-6 shadow-lg">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">INVOICE</h2>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Invoice #:</span> 
                      <span className="text-gray-900 font-semibold">{data.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Date:</span> 
                      <span className="text-gray-900">{data.issue_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Due:</span> 
                      <span className="text-gray-900">{data.due_date}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Bill To */}
          <div className={config.styles.react.clientSection}>
            <h3 className="font-bold text-gray-900 mb-2">BILL TO:</h3>
            <div className="text-sm text-gray-700">
              <div className="font-medium text-base">{data.client.name}</div>
              {data.client.company_name && data.client.company_name.trim() && <div className="font-medium">{data.client.company_name}</div>}
              {data.client.address && data.client.address.trim() && <div className="whitespace-pre-line mt-1">{data.client.address}</div>}
              {data.client.email && data.client.email.trim() && <div className="text-sm mt-1 text-gray-600">{data.client.email}</div>}
            </div>
          </div>

          {data.subject && data.subject.trim() && (
            <div className="bg-blue-50 border-l-4 p-4 rounded-r" style={{ borderColor: colors.primary }}>
              <h3 className="font-bold text-gray-900 mb-2">Subject:</h3>
              <p className="text-gray-800">{data.subject}</p>
            </div>
          )}

          {/* Items Table */}
          <div className="space-y-4">
            <table className={config.styles.react.itemsTable.container}>
              <thead>
                <tr style={{ backgroundColor: colors.primary, color: 'white' }}>
                  <th className="text-left py-3 px-4 font-semibold">Description</th>
                  <th className="text-center py-3 px-4 font-semibold w-20">Qty</th>
                  <th className="text-right py-3 px-4 font-semibold w-24">Rate</th>
                  <th className="text-right py-3 px-4 font-semibold w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={item.id} className={`${config.styles.react.itemsTable.row} ${index % 2 === 1 ? 'bg-gray-50' : ''}`}>
                    <td className="py-3 px-4 text-sm text-gray-700">{item.description}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-center">{item.quantity}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-right">${item.rate.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-right font-medium">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Totals */}
            <div className="flex justify-end">
              <div className={config.styles.react.totals}>
                <div className="bg-gray-50 flex justify-between py-2 px-4 border-b">
                  <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                  <span className="text-sm font-medium text-gray-900">${data.subtotal.toFixed(2)}</span>
                </div>
                {data.tax_rate > 0 && data.tax_amount > 0 && (
                  <div className="bg-gray-50 flex justify-between py-2 px-4 border-b">
                    <span className="text-sm font-medium text-gray-700">Tax ({(data.tax_rate * 100).toFixed(1)}%):</span>
                    <span className="text-sm font-medium text-gray-900">${data.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 px-4" style={{ backgroundColor: colors.primary, color: 'white' }}>
                  <span className="font-bold">TOTAL:</span>
                  <span className="font-bold text-lg">${data.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          {((data.notes && data.notes.trim()) || (data.terms && data.terms.trim())) && (
            <div className="border-t-2 border-gray-300 pt-6">
              <div className="text-sm text-gray-700">
                {data.terms && data.terms.trim() && <div><strong>Payment Terms:</strong> {data.terms}</div>}
                {data.notes && data.notes.trim() && <div className="mt-2"><strong>Notes:</strong> {data.notes}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Helper methods
  private processInvoiceData(invoiceData: InvoiceData): ProcessedInvoiceData {
    const { template, business, client, items } = invoiceData;
    
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
      items: items || []
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
    // Use centralized date parsing to avoid UTC conversion issues
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private getLogoHeight(size?: string): string {
    switch (size) {
      case 'small': return '32px';
      case 'medium': return '48px';
      case 'large': return '64px';
      case 'extra-large': return '80px';
      default: return '48px';
    }
  }

  private getLogoAlignment(position: string = 'left'): string {
    switch (position) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      case 'left':
      default: return 'text-left';
    }
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
}