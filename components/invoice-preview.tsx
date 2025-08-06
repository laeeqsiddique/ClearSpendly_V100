"use client";

import { templateEngine } from '@/lib/template-engine';
import type { InvoiceData } from '@/lib/template-engine/types';

interface InvoicePreviewProps {
  // Template data
  template: {
    company_name?: string;
    company_email?: string;
    company_phone?: string;
    company_address?: string;
    logo_url?: string;
    logo_size?: 'small' | 'medium' | 'large';
    logo_position?: 'left' | 'center' | 'right';
    color_scheme?: string;
    template_type?: string;
    default_payment_terms?: string;
    invoice_prefix?: string;
    show_tax?: boolean;
    tax_rate?: number;
    tax_label?: string;
  };
  
  // Invoice data (optional - for actual invoices)
  invoice?: {
    invoice_number?: string;
    issue_date?: string;
    due_date?: string;
    subject?: string;
    notes?: string;
  };
  
  // Client data (optional - for actual invoices)
  client?: {
    name?: string;
    company_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  
  // Line items (optional - will show sample if not provided)
  items?: Array<{
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

// Helper function to get local date string without UTC conversion
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function InvoicePreview({ template, invoice, client, items }: InvoicePreviewProps) {
  // Use sample data if real data not provided
  const sampleItems = items || [
    { id: '1', description: 'Professional Consulting Services', quantity: 10, rate: 150, amount: 1500 },
    { id: '2', description: 'Project Management', quantity: 5, rate: 120, amount: 600 },
    { id: '3', description: 'Technical Documentation', quantity: 1, rate: 300, amount: 300 }
  ];
  
  const subtotal = sampleItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = template.show_tax ? subtotal * (template.tax_rate || 0) : 0;
  const total = subtotal + taxAmount;

  // Create invoice data structure for template engine
  const invoiceData: InvoiceData = {
    id: 'preview',
    invoice_number: invoice?.invoice_number || `${template.invoice_prefix || 'INV'}-0001`,
    issue_date: invoice?.issue_date || getLocalDateString(new Date()),
    due_date: invoice?.due_date || getLocalDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    status: 'draft',
    subtotal,
    tax_rate: template.tax_rate || 0,
    tax_amount: taxAmount,
    total_amount: total,
    subject: invoice?.subject,
    notes: invoice?.notes,
    terms: template.default_payment_terms,
    currency: 'USD',
    client: {
      id: 'preview-client',
      name: client?.name || 'Client Name',
      company_name: client?.company_name || 'Company Name',
      email: client?.email || 'client@company.com',
      phone: client?.phone || '(555) 123-4567',
      address_line1: client?.address_line1 || client?.address || '123 Client Street',
      address_line2: client?.address_line2,
      city: client?.city || 'City',
      state: client?.state || 'State',
      postal_code: client?.postal_code || '12345',
      country: client?.country || 'United States'
    },
    template: {
      id: 'preview-template',
      name: 'Preview Template',
      template_type: template.template_type || 'traditional-corporate',
      color_scheme: template.color_scheme || '#1e40af',
      font_family: 'font-sans',
      logo_url: template.logo_url,
      logo_size: template.logo_size || 'medium',
      logo_position: template.logo_position || 'left',
      company_name: template.company_name,
      company_email: template.company_email,
      company_phone: template.company_phone,
      company_address: template.company_address,
      default_payment_terms: template.default_payment_terms,
      show_tax: template.show_tax,
      tax_rate: template.tax_rate,
      tax_label: template.tax_label,
      invoice_prefix: template.invoice_prefix
    },
    items: sampleItems,
    business: {
      name: template.company_name || "Your Business",
      email: template.company_email || "business@example.com",
      phone: template.company_phone || "(555) 987-6543",
      website: "www.yourbusiness.com",
      address_line1: "456 Business Ave",
      city: "Business City",
      state: "State",
      postal_code: "54321",
      country: "United States"
    }
  };

  // Use the unified template engine
  return templateEngine.renderReact(template.template_type || 'traditional-corporate', invoiceData);
}