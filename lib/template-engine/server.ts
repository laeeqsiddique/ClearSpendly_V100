// Server-only Template Engine
// Uses DirectHTMLRenderer for 100% visual consistency with React preview

import { TemplateRegistry } from './templates';
import { HTMLRenderer } from './renderers/html-renderer';
import { 
  InvoiceData, 
  TemplateType, 
  LegacyTemplateType,
  ColorScheme
} from './types';

// Import direct HTML renderer (no React SSR dependency)
import { DirectHTMLRenderer } from './renderers/direct-html-renderer';

export class ServerTemplateEngine {
  private htmlRenderer: HTMLRenderer;
  private directRenderer: DirectHTMLRenderer;

  constructor() {
    this.htmlRenderer = new HTMLRenderer();
    this.directRenderer = new DirectHTMLRenderer();
  }

  /**
   * Generate complete HTML document for PDF generation using Direct HTML
   * This ensures 100% visual consistency with the React preview without React SSR
   */
  generatePDFDocument(templateType: TemplateType | LegacyTemplateType, invoiceData: InvoiceData): string {
    // CRITICAL FIX: Use the actual custom template data from the invoice
    // The template registry only has base templates, not user's custom templates
    const baseConfig = TemplateRegistry.getTemplate(templateType);
    
    // Create a config that uses the user's custom template data
    const customConfig = {
      ...baseConfig,
      // Override with actual custom template data
      name: invoiceData.template.name || baseConfig.name,
      type: templateType
    };
    
    console.log('Server Template Engine - Using Direct HTML for PERFECT consistency:', {
      templateName: invoiceData.template.name,
      templateType: invoiceData.template.template_type,
      customSettings: {
        company_name: invoiceData.template.company_name,
        color_scheme: invoiceData.template.color_scheme,
        logo_url: invoiceData.template.logo_url,
        show_tax: invoiceData.template.show_tax
      }
    });
    
    // Use Direct HTML renderer for perfect consistency with preview (no React SSR)
    return this.directRenderer.generateCompleteDocument(customConfig, invoiceData);
  }

  /**
   * Generate HTML content only (without document wrapper)
   */
  generateHTML(templateType: TemplateType | LegacyTemplateType, invoiceData: InvoiceData): string {
    const config = TemplateRegistry.getTemplate(templateType);
    return this.htmlRenderer.render(config, invoiceData);
  }

  /**
   * Get color scheme for template
   */
  getColorScheme(colorHex: string): ColorScheme {
    return this.generateColorScheme(colorHex);
  }

  /**
   * Process business information from template and tenant data
   */
  processBusinessInfo(invoiceData: InvoiceData): {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    logo_url?: string;
    logo_size?: string;
    logo_position?: string;
  } {
    const { template, business } = invoiceData;
    
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

  /**
   * Process client address into formatted string
   */
  processClientAddress(client: InvoiceData['client']): string {
    const addressParts = [
      client.address_line1,
      client.address_line2,
      [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
      client.country !== 'United States' ? client.country : null
    ].filter(Boolean);

    return addressParts.join('\n');
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    // Parse date string in local timezone to avoid UTC conversion issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Get logo dimensions based on size
   */
  getLogoDimensions(size?: string): { width: string; height: string } {
    switch (size) {
      case 'small':
        return { width: 'auto', height: '40px' };
      case 'large':
        return { width: 'auto', height: '80px' };
      default:
        return { width: 'auto', height: '60px' };
    }
  }

  // Private helper methods
  private formatAddress(business: InvoiceData['business']): string {
    const addressParts = [
      business.address_line1,
      business.address_line2,
      [business.city, business.state, business.postal_code].filter(Boolean).join(', '),
      business.country !== 'United States' ? business.country : null
    ].filter(Boolean);

    return addressParts.join('\n');
  }

  private generateColorScheme(primaryColor: string): ColorScheme {
    // Parse hex color and generate complementary colors
    const hex = primaryColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Generate variations
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

// Singleton instance for server-side use
export const serverTemplateEngine = new ServerTemplateEngine();

// Legacy compatibility function for server-side PDF generation
export const generateInvoiceHTML = (templateType: string, invoiceData: InvoiceData): string => {
  return serverTemplateEngine.generatePDFDocument(templateType as TemplateType | LegacyTemplateType, invoiceData);
};