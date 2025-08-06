/**
 * Base renderer class with common utilities and data processing
 */

import { TemplateConfig, InvoiceData, TemplateSettings, ClientInfo, LineItem, LEGACY_TEMPLATE_MAPPING, TemplateType } from '../types';

export abstract class BaseRenderer {
  
  /**
   * Process and normalize invoice data for rendering
   */
  protected processInvoiceData(data: InvoiceData): ProcessedInvoiceData {
    // Map legacy template type to new template type
    const templateType = this.mapTemplateType(data.template.template_type);
    
    // Process client address
    const clientAddress = this.buildAddress(data.client);
    
    // Process business address from template or business info
    const businessAddress = data.business 
      ? this.buildAddress({
          address_line1: data.business.address_line1,
          address_line2: data.business.address_line2,
          city: data.business.city,
          state: data.business.state,
          postal_code: data.business.postal_code,
          country: data.business.country
        } as ClientInfo)
      : data.template.company_address || '';
    
    // Get company information with fallbacks
    const companyName = data.template.company_name || data.business?.name || 'Your Business';
    const companyEmail = data.template.company_email || data.business?.email || '';
    const companyPhone = data.template.company_phone || data.business?.phone || '';
    
    // Calculate totals (with validation)
    const subtotal = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const taxRate = data.tax_rate || 0;
    const taxAmount = data.tax_amount || (subtotal * taxRate);
    const total = data.total_amount || (subtotal + taxAmount);
    
    return {
      ...data,
      templateType,
      clientAddress,
      businessAddress,
      companyName,
      companyEmail,
      companyPhone,
      calculatedTotals: {
        subtotal,
        taxRate,
        taxAmount,
        total
      }
    };
  }
  
  /**
   * Map legacy template type to new template type
   */
  protected mapTemplateType(legacyType: string): TemplateType {
    return LEGACY_TEMPLATE_MAPPING[legacyType] || 'executive-professional';
  }
  
  /**
   * Build formatted address string from client/business info
   */
  protected buildAddress(info: Partial<ClientInfo>): string {
    if (!info) return '';
    
    const addressParts = [
      info.address_line1,
      info.address_line2,
      [info.city, info.state, info.postal_code].filter(Boolean).join(', '),
      info.country !== 'United States' ? info.country : null
    ].filter(Boolean);
    
    return addressParts.join('\n');
  }
  
  /**
   * Format date for display
   */
  protected formatDate(dateString: string): string {
    try {
      // Parse date string in local timezone to avoid UTC conversion issues
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString; // fallback to original string if date parsing fails
    }
  }
  
  /**
   * Get logo dimensions based on size setting
   */
  protected getLogoDimensions(size?: string): { width: string; height: string } {
    switch (size) {
      case 'small': return { width: 'auto', height: '48px' };
      case 'large': return { width: 'auto', height: '80px' };
      default: return { width: 'auto', height: '64px' };
    }
  }
  
  /**
   * Get alignment class/style based on position setting
   */
  protected getAlignment(position?: string, mode: 'class' | 'style' = 'class'): string {
    const alignments = {
      class: {
        center: 'justify-center text-center',
        right: 'justify-end text-right',
        left: 'justify-start text-left'
      },
      style: {
        center: 'text-align: center; justify-content: center;',
        right: 'text-align: right; justify-content: flex-end;',
        left: 'text-align: left; justify-content: flex-start;'
      }
    };
    
    return alignments[mode][position as keyof typeof alignments.class] || alignments[mode].left;
  }
  
  /**
   * Generate sample data for preview mode
   */
  protected generateSampleData(templateData: TemplateSettings): LineItem[] {
    return [
      { id: '1', description: 'Professional Consulting Services', quantity: 10, rate: 150, amount: 1500 },
      { id: '2', description: 'Project Management', quantity: 5, rate: 120, amount: 600 },
      { id: '3', description: 'Technical Documentation', quantity: 1, rate: 300, amount: 300 }
    ];
  }
  
  /**
   * Generate sample client data for preview mode
   */
  protected generateSampleClient(): ClientInfo {
    return {
      name: 'John Smith',
      company_name: 'Acme Corporation',
      email: 'john.smith@acme.com',
      phone: '(555) 123-4567',
      address_line1: '123 Business Street',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      country: 'United States'
    };
  }
}

export interface ProcessedInvoiceData extends InvoiceData {
  templateType: TemplateType;
  clientAddress: string;
  businessAddress: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  calculatedTotals: {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
  };
}