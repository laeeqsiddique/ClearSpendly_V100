// Template Engine Types
// Unified type system for invoice template rendering

export interface InvoiceData {
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
  client: ClientData;
  template: TemplateData;
  items: InvoiceItem[];
  business: BusinessData;
}

export interface ClientData {
  id: string;
  name: string;
  company_name?: string;
  email: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface TemplateData {
  id: string;
  name: string;
  template_type: string;
  color_scheme: string;
  font_family?: string;
  logo_url?: string;
  logo_size?: 'small' | 'medium' | 'large';
  logo_position?: 'left' | 'center' | 'right';
  company_name?: string;
  company_email?: string;
  company_phone?: string;
  company_address?: string;
  default_payment_terms?: string;
  show_tax?: boolean;
  tax_rate?: number;
  tax_label?: string;
  invoice_prefix?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface BusinessData {
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
}

// Template Configuration Types
export interface TemplateConfig {
  type: TemplateType;
  name: string;
  description: string;
  category: 'professional' | 'creative' | 'minimal' | 'corporate';
  
  // Typography
  primaryFont: string;
  secondaryFont?: string;
  fontSizeBase: string;
  
  // Layout
  headerStyle: 'solid' | 'gradient' | 'minimal' | 'bordered';
  tableStyle: 'modern' | 'classic' | 'minimal' | 'bold';
  
  // Styling configuration for both React and HTML
  styles: {
    react: ReactStyleConfig;
    html: HTMLStyleConfig;
  };
}

export interface ReactStyleConfig {
  container: string;
  header: string;
  headerContent: string;
  logo: string;
  companyInfo: string;
  invoiceInfo: string;
  clientSection: string;
  itemsTable: {
    container: string;
    header: string;
    row: string;
    cell: string;
  };
  totals: string;
  footer: string;
}

export interface HTMLStyleConfig {
  container: string;
  header: string;
  headerContent: string;
  logo: string;
  companyInfo: string;
  invoiceInfo: string;
  clientSection: string;
  itemsTable: {
    container: string;
    header: string;
    row: string;
    cell: string;
  };
  totals: string;
  footer: string;
  // Additional inline styles for PDF
  inlineStyles: Record<string, string>;
}

export type TemplateType = 
  | 'executive-professional'
  | 'modern-creative'
  | 'minimal-scandinavian'
  | 'traditional-corporate';

// Legacy template type mapping for backward compatibility
export const LEGACY_TEMPLATE_MAPPING = {
  'bold': 'executive-professional',
  'modern': 'modern-creative',
  'minimal': 'minimal-scandinavian',
  'classic': 'traditional-corporate'
} as const;

export type LegacyTemplateType = keyof typeof LEGACY_TEMPLATE_MAPPING;

// Utility types
export interface TemplateRenderContext {
  invoiceData: InvoiceData;
  config: TemplateConfig;
  renderMode: 'react' | 'html';
}

export interface LogoConfig {
  url?: string;
  size: 'small' | 'medium' | 'large';
  position: 'left' | 'center' | 'right';
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
  background: string;
  border: string;
}

// Template rendering result types
export interface ReactRenderResult {
  component: React.ComponentType<any>;
  props: Record<string, any>;
}

export interface HTMLRenderResult {
  html: string;
  styles: string;
  fonts: string[];
}