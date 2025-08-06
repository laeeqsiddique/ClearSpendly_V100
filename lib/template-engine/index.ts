// Unified Template Engine
// Single source of truth for invoice template rendering

import { TemplateRegistry } from './templates';
import { ReactRenderer } from './renderers/react-renderer';
import { HTMLRenderer } from './renderers/html-renderer';
import { 
  InvoiceData, 
  TemplateType, 
  LegacyTemplateType,
  ColorScheme
} from './types';

export class TemplateEngine {
  private reactRenderer: ReactRenderer | null = null;
  private htmlRenderer: HTMLRenderer;

  constructor() {
    // Only instantiate HTMLRenderer immediately - ReactRenderer is loaded lazily
    this.htmlRenderer = new HTMLRenderer();
  }

  private getReactRenderer(): ReactRenderer {
    if (!this.reactRenderer) {
      this.reactRenderer = new ReactRenderer();
    }
    return this.reactRenderer;
  }

  /**
   * Render template as React component for preview
   */
  renderReact(templateType: TemplateType | LegacyTemplateType, invoiceData: InvoiceData) {
    const config = TemplateRegistry.getTemplate(templateType);
    return this.getReactRenderer().render(config, invoiceData);
  }

  /**
   * Generate complete HTML document for PDF generation
   */
  generatePDFDocument(templateType: TemplateType | LegacyTemplateType, invoiceData: InvoiceData): string {
    const config = TemplateRegistry.getTemplate(templateType);
    return this.htmlRenderer.generateCompleteDocument(config, invoiceData);
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
    return new Date(dateString).toLocaleDateString('en-US', {
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

// Singleton instance for global use
export const templateEngine = new TemplateEngine();

// Export utilities and types
export { TemplateRegistry } from './templates';
export type { 
  TemplateType, 
  LegacyTemplateType, 
  TemplateConfig, 
  InvoiceData,
  ColorScheme 
} from './types';

// Legacy compatibility - export functions that match old API
export const renderInvoiceTemplate = (templateType: string, invoiceData: InvoiceData) => {
  return templateEngine.renderReact(templateType as TemplateType | LegacyTemplateType, invoiceData);
};

export const generateInvoiceHTML = (templateType: string, invoiceData: InvoiceData): string => {
  return templateEngine.generatePDFDocument(templateType as TemplateType | LegacyTemplateType, invoiceData);
};