/**
 * Default data templates for new tenant setup
 * Contains all the seed data needed for a complete tenant initialization
 */

export interface DefaultTagCategory {
  name: string;
  description: string;
  color: string;
  required: boolean;
  multiple: boolean;
  sort_order: number;
  tags: string[];
}

export interface DefaultEmailTemplate {
  template_type: 'invoice' | 'payment_reminder' | 'payment_received';
  name: string;
  description: string;
  subject_template: string;
  greeting_message: string;
  footer_message: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

export interface DefaultUserPreferences {
  currency: string;
  timezone: string;
  date_format: string;
  time_format: string;
  number_format: string;
  language: string;
  notifications: {
    email_receipts: boolean;
    email_reminders: boolean;
    email_reports: boolean;
    in_app_notifications: boolean;
    mobile_notifications: boolean;
  };
  business_settings: {
    fiscal_year_start: string;
    business_type: string;
    tax_id_required: boolean;
    multi_currency: boolean;
  };
}

export interface DefaultInvoiceTemplate {
  name: string;
  description: string;
  template_data: object;
  is_default: boolean;
}

// Default tag categories with their tags
export const DEFAULT_TAG_CATEGORIES: DefaultTagCategory[] = [
  {
    name: 'Project',
    description: 'Project or initiative this expense belongs to',
    color: '#8b5cf6',
    required: true,
    multiple: false,
    sort_order: 1,
    tags: ['General', 'Q1-2025', 'Q2-2025', 'Website-Redesign', 'Product-Launch', 'Marketing-Campaign']
  },
  {
    name: 'Department',
    description: 'Department responsible for this expense',
    color: '#06b6d4',
    required: true,
    multiple: false,
    sort_order: 2,
    tags: ['General', 'Engineering', 'Marketing', 'Sales', 'Operations', 'Finance', 'HR', 'Legal']
  },
  {
    name: 'Tax Status',
    description: 'Tax deductibility status',
    color: '#10b981',
    required: false,
    multiple: false,
    sort_order: 3,
    tags: ['Fully Deductible', 'Partially Deductible', 'Non-Deductible', 'Personal', 'Mixed Use']
  },
  {
    name: 'Client',
    description: 'Client this expense was incurred for',
    color: '#f59e0b',
    required: false,
    multiple: false,
    sort_order: 4,
    tags: ['Internal', 'Client-A', 'Client-B', 'Prospect-Follow-up', 'General-Business']
  },
  {
    name: 'Expense Type',
    description: 'Type of business expense',
    color: '#ef4444',
    required: false,
    multiple: true,
    sort_order: 5,
    tags: [
      'Travel', 'Meals & Entertainment', 'Office Supplies', 'Equipment', 
      'Software & Subscriptions', 'Marketing & Advertising', 'Professional Services',
      'Utilities', 'Rent & Facilities', 'Insurance', 'Training & Education',
      'Communications', 'Vehicle Expenses', 'Bank Fees', 'Other'
    ]
  }
];

// Default email templates
export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    template_type: 'invoice',
    name: 'Professional Invoice',
    description: 'Clean, professional invoice template',
    subject_template: 'Invoice {{invoice_number}} from {{business_name}}',
    greeting_message: 'Thank you for your business! Please find your invoice details below.',
    footer_message: 'Questions about this invoice? Contact us at {{business_email}} or {{business_phone}}.',
    primary_color: '#667eea',
    secondary_color: '#764ba2',
    accent_color: '#10b981'
  },
  {
    template_type: 'payment_reminder',
    name: 'Friendly Reminder',
    description: 'Professional but friendly payment reminder',
    subject_template: 'Payment Reminder: Invoice {{invoice_number}} ({{days_overdue}} days overdue)',
    greeting_message: 'We hope you\'re doing well! This is a friendly reminder about an outstanding invoice.',
    footer_message: 'If you have any questions or need assistance, please don\'t hesitate to reach out.',
    primary_color: '#f59e0b',
    secondary_color: '#dc2626',
    accent_color: '#10b981'
  },
  {
    template_type: 'payment_received',
    name: 'Payment Confirmation',
    description: 'Professional payment confirmation template',
    subject_template: 'Payment Received: Invoice {{invoice_number}} - Thank You!',
    greeting_message: 'Thank you for your payment! We\'ve successfully received and processed your payment.',
    footer_message: 'We appreciate your business and look forward to serving you again.',
    primary_color: '#10b981',
    secondary_color: '#059669',
    accent_color: '#667eea'
  }
];

// Default user preferences
export const DEFAULT_USER_PREFERENCES: DefaultUserPreferences = {
  currency: 'USD',
  timezone: 'America/New_York',
  date_format: 'MM/DD/YYYY',
  time_format: '12h',
  number_format: 'en-US',
  language: 'en',
  notifications: {
    email_receipts: true,
    email_reminders: true,
    email_reports: false,
    in_app_notifications: true,
    mobile_notifications: false
  },
  business_settings: {
    fiscal_year_start: '01-01',
    business_type: 'sole_proprietorship',
    tax_id_required: false,
    multi_currency: false
  }
};

// Default invoice template
export const DEFAULT_INVOICE_TEMPLATE: DefaultInvoiceTemplate = {
  name: 'Modern Professional',
  description: 'Clean, modern invoice template with professional styling',
  template_data: {
    layout: 'modern',
    theme: 'professional',
    colors: {
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#10b981',
      text: '#1a1a1a',
      background: '#ffffff'
    },
    typography: {
      font_family: 'Inter, system-ui, sans-serif',
      header_size: 'xl',
      body_size: 'base'
    },
    sections: {
      header: {
        show_logo: true,
        show_business_info: true,
        layout: 'split'
      },
      billing: {
        show_billing_address: true,
        show_shipping_address: false,
        layout: 'side_by_side'
      },
      items: {
        show_description: true,
        show_quantity: true,
        show_rate: true,
        show_amount: true
      },
      totals: {
        show_subtotal: true,
        show_tax: true,
        show_discount: false,
        show_shipping: false
      },
      footer: {
        show_payment_terms: true,
        show_notes: true,
        show_thank_you: true
      }
    },
    branding: {
      show_watermark: false,
      custom_footer: false
    }
  },
  is_default: true
};

// IRS mileage rates for current and recent years
export const IRS_MILEAGE_RATES = [
  { year: 2025, rate: 0.6550, effective_date: '2025-01-01', notes: 'Standard mileage rate for 2025' },
  { year: 2024, rate: 0.6550, effective_date: '2024-01-01', notes: 'Standard mileage rate for 2024' },
  { year: 2023, rate: 0.6550, effective_date: '2023-01-01', notes: 'Standard mileage rate for 2023' },
  { year: 2022, rate: 0.5850, effective_date: '2022-01-01', notes: 'Standard mileage rate for 2022' },
  { year: 2021, rate: 0.5600, effective_date: '2021-01-01', notes: 'Standard mileage rate for 2021' }
];

// Usage tracking initialization
export const DEFAULT_USAGE_LIMITS = {
  free: {
    receipts_per_month: 50,
    invoices_per_month: 10,
    team_members: 1,
    storage_mb: 100,
    api_calls_per_day: 100
  },
  starter: {
    receipts_per_month: 200,
    invoices_per_month: 50,
    team_members: 3,
    storage_mb: 1000,
    api_calls_per_day: 1000
  },
  professional: {
    receipts_per_month: 1000,
    invoices_per_month: 200,
    team_members: 10,
    storage_mb: 5000,
    api_calls_per_day: 5000
  },
  enterprise: {
    receipts_per_month: -1, // unlimited
    invoices_per_month: -1, // unlimited
    team_members: -1, // unlimited
    storage_mb: -1, // unlimited
    api_calls_per_day: -1 // unlimited
  }
};