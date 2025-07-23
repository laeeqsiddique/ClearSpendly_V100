# ClearSpendly Database Structure

## Overview
This document defines the complete database schema for ClearSpendly, designed for multi-tenant SaaS architecture with row-level security (RLS) using Supabase/PostgreSQL.

## Database Design Principles

### Multi-Tenancy
- All tables include `tenant_id` for isolation
- Row-Level Security (RLS) policies enforce data separation
- JWT claims carry tenant context
- No cross-tenant data access possible

### Audit & Tracking
- All tables include `created_at` and `updated_at` timestamps
- Soft deletes with `deleted_at` where applicable
- User action tracking with `created_by` and `updated_by`

### Performance
- Strategic indexing on frequently queried columns
- Composite indexes for common query patterns
- Partial indexes for filtered queries
- pgvector indexes for semantic search

## Core Tables

### 1. tenant
Stores tenant (organization) information.

```sql
CREATE TABLE tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  subscription_status VARCHAR(50) DEFAULT 'trial',
  subscription_plan VARCHAR(50) DEFAULT 'free',
  privacy_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tenant_slug ON tenant(slug);
CREATE INDEX idx_tenant_subscription ON tenant(subscription_status, subscription_plan);
```

### 2. user
Stores user account information (extends Supabase auth.users).

```sql
CREATE TABLE user (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(50),
  timezone VARCHAR(100) DEFAULT 'UTC',
  locale VARCHAR(10) DEFAULT 'en',
  metadata JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_user_deleted ON user(deleted_at) WHERE deleted_at IS NULL;
```

### 3. membership
Links users to tenants with roles.

```sql
CREATE TABLE membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES user(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_membership_tenant ON membership(tenant_id);
CREATE INDEX idx_membership_user ON membership(user_id);
CREATE INDEX idx_membership_role ON membership(role);
```

### 4. vendor
Stores vendor/merchant information.

```sql
CREATE TABLE vendor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  tax_category VARCHAR(50),
  address JSONB,
  phone VARCHAR(50),
  website VARCHAR(500),
  email VARCHAR(255),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES user(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_tenant ON vendor(tenant_id);
CREATE INDEX idx_vendor_name ON vendor(tenant_id, normalized_name);
CREATE INDEX idx_vendor_category ON vendor(tenant_id, category);
```

### 5. receipt
Stores receipt header information.

```sql
CREATE TABLE receipt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendor(id),
  receipt_number VARCHAR(100),
  receipt_date DATE NOT NULL,
  receipt_time TIME,
  total_amount DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  subtotal_amount DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  category VARCHAR(100),
  tags TEXT[],
  notes TEXT,
  
  -- File storage
  original_file_url TEXT NOT NULL,
  original_file_name VARCHAR(255),
  file_size_bytes INTEGER,
  mime_type VARCHAR(100),
  
  -- OCR processing
  ocr_status VARCHAR(50) DEFAULT 'pending',
  ocr_processed_at TIMESTAMPTZ,
  ocr_confidence DECIMAL(3,2),
  ocr_provider VARCHAR(50),
  ocr_raw_data JSONB,
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'upload', -- upload, email, api, mobile
  source_metadata JSONB DEFAULT '{}',
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID REFERENCES receipt(id),
  
  created_by UUID REFERENCES user(id),
  updated_by UUID REFERENCES user(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_receipt_tenant ON receipt(tenant_id);
CREATE INDEX idx_receipt_vendor ON receipt(tenant_id, vendor_id);
CREATE INDEX idx_receipt_date ON receipt(tenant_id, receipt_date DESC);
CREATE INDEX idx_receipt_category ON receipt(tenant_id, category);
CREATE INDEX idx_receipt_ocr_status ON receipt(tenant_id, ocr_status) WHERE ocr_status = 'pending';
CREATE INDEX idx_receipt_tags ON receipt USING GIN(tags);
```

### 6. receipt_item
Stores line-item details from receipts.

```sql
CREATE TABLE receipt_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  receipt_id UUID NOT NULL REFERENCES receipt(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  normalized_description TEXT,
  quantity DECIMAL(12,4) DEFAULT 1,
  unit_price DECIMAL(12,4),
  total_price DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  sku VARCHAR(100),
  barcode VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  
  -- For price tracking
  is_price_anomaly BOOLEAN DEFAULT false,
  expected_price DECIMAL(12,4),
  price_variance_percent DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipt_item_receipt ON receipt_item(receipt_id);
CREATE INDEX idx_receipt_item_tenant ON receipt_item(tenant_id);
CREATE INDEX idx_receipt_item_description ON receipt_item(tenant_id, normalized_description);
CREATE INDEX idx_receipt_item_anomaly ON receipt_item(tenant_id, is_price_anomaly) WHERE is_price_anomaly = true;
```

## Analytics Tables

### 7. price_book
Tracks historical prices for items.

```sql
CREATE TABLE price_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendor(id),
  item_description TEXT NOT NULL,
  normalized_description TEXT NOT NULL,
  unit_price DECIMAL(12,4) NOT NULL,
  quantity DECIMAL(12,4) DEFAULT 1,
  unit_of_measure VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Statistics
  price_count INTEGER DEFAULT 1,
  avg_price DECIMAL(12,4),
  min_price DECIMAL(12,4),
  max_price DECIMAL(12,4),
  std_deviation DECIMAL(12,4),
  
  first_seen_date DATE NOT NULL,
  last_seen_date DATE NOT NULL,
  last_receipt_id UUID REFERENCES receipt(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_book_tenant ON price_book(tenant_id);
CREATE INDEX idx_price_book_vendor ON price_book(tenant_id, vendor_id);
CREATE INDEX idx_price_book_item ON price_book(tenant_id, normalized_description);
CREATE INDEX idx_price_book_dates ON price_book(tenant_id, last_seen_date DESC);
```

### 8. price_alert
Stores price anomaly alerts.

```sql
CREATE TABLE price_alert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  receipt_item_id UUID NOT NULL REFERENCES receipt_item(id),
  price_book_id UUID REFERENCES price_book(id),
  alert_type VARCHAR(50) NOT NULL, -- price_increase, new_high, unusual_quantity
  severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  
  current_price DECIMAL(12,4) NOT NULL,
  expected_price DECIMAL(12,4),
  variance_amount DECIMAL(12,4),
  variance_percent DECIMAL(5,2),
  
  message TEXT,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES user(id),
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_alert_tenant ON price_alert(tenant_id);
CREATE INDEX idx_price_alert_unack ON price_alert(tenant_id, is_acknowledged) WHERE is_acknowledged = false;
CREATE INDEX idx_price_alert_date ON price_alert(tenant_id, created_at DESC);
```

## Subscription Tables

### 9. subscription_mirror
Mirrors Polar subscription data.

```sql
CREATE TABLE subscription_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  polar_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  polar_customer_id VARCHAR(255) NOT NULL,
  plan_id VARCHAR(100) NOT NULL,
  plan_name VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_tenant ON subscription_mirror(tenant_id);
CREATE INDEX idx_subscription_polar ON subscription_mirror(polar_subscription_id);
CREATE INDEX idx_subscription_status ON subscription_mirror(status);
```

### 10. subscription_usage
Tracks usage against subscription limits.

```sql
CREATE TABLE subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  billing_period DATE NOT NULL,
  metric_name VARCHAR(100) NOT NULL, -- receipts_processed, storage_gb, api_calls
  usage_count INTEGER DEFAULT 0,
  limit_count INTEGER,
  overage_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, billing_period, metric_name)
);

CREATE INDEX idx_usage_tenant ON subscription_usage(tenant_id);
CREATE INDEX idx_usage_period ON subscription_usage(billing_period DESC);
```

## User Preference Tables

### 11. user_pref
Stores user-specific preferences.

```sql
CREATE TABLE user_pref (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}',
  
  -- Notification preferences
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  notification_frequency VARCHAR(50) DEFAULT 'daily',
  
  -- UI preferences
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Feature preferences
  default_category VARCHAR(100),
  auto_categorize BOOLEAN DEFAULT true,
  privacy_mode BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_user_pref_user ON user_pref(user_id);
CREATE INDEX idx_user_pref_tenant ON user_pref(tenant_id);
```

## Integration Tables

### 12. email_connector
Stores email integration configurations.

```sql
CREATE TABLE email_connector (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user(id),
  provider VARCHAR(50) NOT NULL, -- gmail, outlook, custom
  email_address VARCHAR(255) NOT NULL,
  forward_address VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email_address)
);

CREATE INDEX idx_email_connector_tenant ON email_connector(tenant_id);
CREATE INDEX idx_email_connector_user ON email_connector(user_id);
CREATE INDEX idx_email_connector_sync ON email_connector(sync_enabled) WHERE sync_enabled = true;
```

## AI/ML Tables

### 13. training_queue
Queues receipts for model training.

```sql
CREATE TABLE training_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipt(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  training_type VARCHAR(50) NOT NULL, -- ocr, categorization, vendor_matching
  priority INTEGER DEFAULT 5,
  status VARCHAR(50) DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_queue_status ON training_queue(status, priority DESC) WHERE status = 'pending';
CREATE INDEX idx_training_queue_tenant ON training_queue(tenant_id);
```

### 14. model_registry
Tracks ML model versions and performance.

```sql
CREATE TABLE model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  model_type VARCHAR(50) NOT NULL, -- ocr, classification, ner
  provider VARCHAR(50) NOT NULL, -- ollama, openai, custom
  is_active BOOLEAN DEFAULT false,
  performance_metrics JSONB DEFAULT '{}',
  configuration JSONB DEFAULT '{}',
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_name, model_version)
);

CREATE INDEX idx_model_active ON model_registry(is_active) WHERE is_active = true;
```

## Vector Search Tables

### 15. receipt_embeddings
Stores vector embeddings for semantic search.

```sql
CREATE TABLE receipt_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipt(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  embedding vector(768), -- Adjust dimension based on model
  embedding_model VARCHAR(100),
  content_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipt_embeddings_tenant ON receipt_embeddings(tenant_id);
CREATE INDEX idx_receipt_embeddings_vector ON receipt_embeddings USING ivfflat (embedding vector_l2_ops);
```

## Invoice & Payment Management Tables

### 17. client
Stores client information for invoicing.

```sql
CREATE TABLE client (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company_name VARCHAR(255),
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'US',
  tax_id VARCHAR(50),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_tenant ON client(tenant_id);
CREATE INDEX idx_client_name ON client(tenant_id, name);
CREATE INDEX idx_client_email ON client(tenant_id, email);
CREATE INDEX idx_client_active ON client(tenant_id, is_active) WHERE is_active = true;
```

### 18. invoice_template
Stores invoice template configurations.

```sql
CREATE TABLE invoice_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user(id),
  name VARCHAR(255) NOT NULL,
  style VARCHAR(100) NOT NULL, -- modern, bold_creative, classic, etc.
  color_scheme VARCHAR(50) NOT NULL,
  font_family VARCHAR(100) NOT NULL,
  logo_url TEXT,
  company_name VARCHAR(255),
  company_address TEXT,
  company_phone VARCHAR(50),
  company_email VARCHAR(255),
  company_website VARCHAR(255),
  default_payment_terms VARCHAR(100) DEFAULT 'Net 30',
  default_notes TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_template_tenant ON invoice_template(tenant_id);
CREATE INDEX idx_invoice_template_default ON invoice_template(tenant_id, is_default) WHERE is_default = true;
```

### 19. invoice
Stores invoice header information.

```sql
CREATE TABLE invoice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user(id),
  client_id UUID NOT NULL REFERENCES client(id),
  template_id UUID REFERENCES invoice_template(id),
  invoice_number VARCHAR(50) NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subject VARCHAR(500),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, viewed, paid, overdue, cancelled
  payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, partial, paid
  
  -- Financial calculations (generated columns)
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(10,2) GENERATED ALWAYS AS (subtotal * tax_rate) STORED,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (subtotal + tax_amount) STORED,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  
  -- Email tracking
  sent_date TIMESTAMPTZ,
  last_viewed_date TIMESTAMPTZ,
  
  -- Payment integration
  stripe_payment_link_id VARCHAR(255),
  stripe_payment_link_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_tenant ON invoice(tenant_id);
CREATE INDEX idx_invoice_client ON invoice(tenant_id, client_id);
CREATE INDEX idx_invoice_number ON invoice(tenant_id, invoice_number);
CREATE INDEX idx_invoice_status ON invoice(tenant_id, status);
CREATE INDEX idx_invoice_payment_status ON invoice(tenant_id, payment_status);
CREATE INDEX idx_invoice_due_date ON invoice(tenant_id, due_date) WHERE status NOT IN ('paid', 'cancelled');
```

### 20. invoice_item
Stores invoice line items.

```sql
CREATE TABLE invoice_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_item_invoice ON invoice_item(invoice_id);
CREATE INDEX idx_invoice_item_tenant ON invoice_item(tenant_id);
```

### 21. payment
Stores payment records.

```sql
CREATE TABLE payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL, -- bank_transfer, check, cash, credit_card, paypal, other
  reference_number VARCHAR(255),
  description TEXT,
  notes TEXT,
  category VARCHAR(50) DEFAULT 'revenue',
  client_id UUID REFERENCES client(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_tenant ON payment(tenant_id);
CREATE INDEX idx_payment_client ON payment(tenant_id, client_id);
CREATE INDEX idx_payment_date ON payment(tenant_id, payment_date DESC);
CREATE INDEX idx_payment_method ON payment(tenant_id, payment_method);
```

### 22. payment_allocation
Tracks how payments are allocated to specific invoices.

```sql
CREATE TABLE payment_allocation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payment(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(10,2) NOT NULL CHECK (allocated_amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payment_id, invoice_id)
);

CREATE INDEX idx_payment_allocation_payment ON payment_allocation(payment_id);
CREATE INDEX idx_payment_allocation_invoice ON payment_allocation(invoice_id);
CREATE INDEX idx_payment_allocation_tenant ON payment_allocation(tenant_id);
```

### 23. payment_summary (View)
Materialized view for payment dashboard analytics.

```sql
CREATE VIEW payment_summary AS
SELECT 
  p.id,
  p.tenant_id,
  p.payment_date,
  p.amount,
  p.payment_method,
  p.reference_number,
  p.description,
  p.category,
  c.name as client_name,
  c.email as client_email,
  c.company_name as client_company,
  CASE 
    WHEN COUNT(pa.id) = 0 THEN 'Unallocated'
    ELSE STRING_AGG(
      CONCAT(i.invoice_number, ' ($', pa.allocated_amount, ')'), 
      ', ' ORDER BY pa.created_at
    )
  END as allocated_to
FROM payment p
LEFT JOIN client c ON p.client_id = c.id
LEFT JOIN payment_allocation pa ON p.id = pa.payment_id
LEFT JOIN invoice i ON pa.invoice_id = i.id
GROUP BY p.id, p.tenant_id, p.payment_date, p.amount, p.payment_method, 
         p.reference_number, p.description, p.category, c.name, c.email, c.company_name;
```

## Email Template System Tables

### 24. email_templates
Stores customizable email templates for each tenant.

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  
  -- Template identification
  template_type TEXT NOT NULL CHECK (template_type IN ('invoice', 'payment_reminder', 'payment_received')),
  name TEXT NOT NULL DEFAULT 'Default Template',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Branding configuration
  primary_color TEXT NOT NULL DEFAULT '#667eea',
  secondary_color TEXT NOT NULL DEFAULT '#764ba2',
  accent_color TEXT NOT NULL DEFAULT '#10b981',
  text_color TEXT NOT NULL DEFAULT '#1a1a1a',
  background_color TEXT NOT NULL DEFAULT '#f5f5f5',
  
  -- Logo and branding assets
  logo_url TEXT,
  logo_width INTEGER DEFAULT 60,
  logo_height INTEGER DEFAULT 60,
  company_name TEXT,
  
  -- Email content customization
  subject_template TEXT,
  greeting_message TEXT,
  footer_message TEXT,
  
  -- Template structure
  header_style JSONB DEFAULT '{"gradient": true, "centerAlign": true}'::jsonb,
  body_style JSONB DEFAULT '{"padding": "48px 40px", "backgroundColor": "#ffffff"}'::jsonb,
  button_style JSONB DEFAULT '{"borderRadius": "50px", "padding": "18px 48px"}'::jsonb,
  
  -- Custom CSS (for advanced users)
  custom_css TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(tenant_id, template_type, name)
);

CREATE INDEX idx_email_templates_tenant_type ON email_templates(tenant_id, template_type);
CREATE INDEX idx_email_templates_active ON email_templates(tenant_id, template_type, is_active);
```

### 25. email_template_variables
Stores dynamic content variables for email templates.

```sql
CREATE TABLE email_template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  
  -- Variable definition
  variable_name TEXT NOT NULL,
  variable_type TEXT NOT NULL CHECK (variable_type IN ('text', 'number', 'currency', 'date', 'boolean', 'url')),
  display_name TEXT NOT NULL,
  description TEXT,
  default_value TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  
  -- Validation rules
  validation_rules JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(template_id, variable_name)
);

CREATE INDEX idx_email_template_variables_template ON email_template_variables(template_id);
```

### 26. email_send_log
Tracks email sending history and analytics.

```sql
CREATE TABLE email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  
  -- Email details
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  
  -- Send status
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')) DEFAULT 'pending',
  provider_message_id TEXT,
  error_message TEXT,
  
  -- Template snapshot (for audit trail)
  template_snapshot JSONB,
  
  -- Metadata
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by UUID REFERENCES auth.users(id),
  
  -- Related records
  invoice_id UUID, -- Could reference invoice table
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('sent', 'failed', 'pending'))
);

CREATE INDEX idx_email_send_log_tenant_date ON email_send_log(tenant_id, created_at DESC);
CREATE INDEX idx_email_send_log_status ON email_send_log(tenant_id, status);
CREATE INDEX idx_email_send_log_template ON email_send_log(template_id) WHERE template_id IS NOT NULL;
```

## Support Tables

### 27. support_ticket
Tracks user support requests.

```sql
CREATE TABLE support_ticket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user(id),
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  subject VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',
  assigned_to UUID REFERENCES user(id),
  resolved_at TIMESTAMPTZ,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_ticket_tenant ON support_ticket(tenant_id);
CREATE INDEX idx_support_ticket_user ON support_ticket(user_id);
CREATE INDEX idx_support_ticket_status ON support_ticket(status) WHERE status != 'closed';
```

## Row-Level Security Policies

### Example RLS Policy Structure

```sql
-- Enable RLS on all tables
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE user ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership ENABLE ROW LEVEL SECURITY;
-- ... (enable for all tables)

-- Tenant table policies
CREATE POLICY tenant_select ON tenant
  FOR SELECT USING (
    id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member', 'viewer')
    )
  );

CREATE POLICY tenant_insert ON tenant
  FOR INSERT WITH CHECK (false); -- Only system can create tenants

CREATE POLICY tenant_update ON tenant
  FOR UPDATE USING (
    id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Receipt table policies
CREATE POLICY receipt_select ON receipt
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY receipt_insert ON receipt
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY receipt_update ON receipt
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY receipt_delete ON receipt
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );
```

## Database Functions & Triggers

### Auto-update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_tenant_updated_at BEFORE UPDATE ON tenant
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ... (create for all tables)
```

### Tenant isolation function

```sql
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### Price anomaly detection

```sql
CREATE OR REPLACE FUNCTION check_price_anomaly()
RETURNS TRIGGER AS $$
DECLARE
  avg_price DECIMAL(12,4);
  std_dev DECIMAL(12,4);
BEGIN
  -- Get historical price data
  SELECT 
    AVG(unit_price),
    STDDEV(unit_price)
  INTO avg_price, std_dev
  FROM receipt_item
  WHERE tenant_id = NEW.tenant_id
    AND normalized_description = NEW.normalized_description
    AND created_at > NOW() - INTERVAL '90 days';
  
  -- Check if price is anomalous (> 2 std deviations)
  IF avg_price IS NOT NULL AND std_dev > 0 THEN
    IF ABS(NEW.unit_price - avg_price) > (2 * std_dev) THEN
      NEW.is_price_anomaly = true;
      NEW.expected_price = avg_price;
      NEW.price_variance_percent = ((NEW.unit_price - avg_price) / avg_price * 100);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_receipt_item_price_anomaly
  BEFORE INSERT OR UPDATE ON receipt_item
  FOR EACH ROW EXECUTE FUNCTION check_price_anomaly();
```

### Payment status update trigger

```sql
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(10,2);
    v_invoice_total DECIMAL(10,2);
    v_new_payment_status VARCHAR(20);
    v_new_invoice_status VARCHAR(20);
    v_invoice_id UUID;
BEGIN
    -- Get the invoice ID from the trigger context
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Skip if no invoice_id
    IF v_invoice_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calculate total paid for the invoice
    SELECT COALESCE(SUM(pa.allocated_amount), 0)
    INTO v_total_paid
    FROM payment_allocation pa
    WHERE pa.invoice_id = v_invoice_id;
    
    -- Get invoice total amount
    SELECT total_amount
    INTO v_invoice_total
    FROM invoice
    WHERE id = v_invoice_id;
    
    -- Skip if invoice not found
    IF v_invoice_total IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Determine payment status
    IF v_total_paid = 0 THEN
        v_new_payment_status := 'unpaid';
        SELECT status INTO v_new_invoice_status FROM invoice WHERE id = v_invoice_id;
    ELSIF v_total_paid >= v_invoice_total THEN
        v_new_payment_status := 'paid';
        v_new_invoice_status := 'paid';
    ELSE
        v_new_payment_status := 'partial';
        SELECT status INTO v_new_invoice_status FROM invoice WHERE id = v_invoice_id;
    END IF;
    
    -- Update invoice with calculated values
    UPDATE invoice
    SET 
        amount_paid = v_total_paid,
        payment_status = v_new_payment_status,
        status = v_new_invoice_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_invoice_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_on_payment_allocation
    AFTER INSERT OR UPDATE OR DELETE ON payment_allocation
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();
```

### Over-allocation prevention trigger

```sql
CREATE OR REPLACE FUNCTION check_payment_allocation()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_total DECIMAL(10,2);
    v_existing_paid DECIMAL(10,2);
    v_remaining_balance DECIMAL(10,2);
BEGIN
    -- Get invoice total
    SELECT total_amount INTO v_invoice_total
    FROM invoice
    WHERE id = NEW.invoice_id;
    
    -- Get existing payments for this invoice (excluding current allocation if updating)
    SELECT COALESCE(SUM(allocated_amount), 0) INTO v_existing_paid
    FROM payment_allocation
    WHERE invoice_id = NEW.invoice_id
    AND (TG_OP = 'INSERT' OR id != NEW.id);
    
    -- Calculate remaining balance
    v_remaining_balance := v_invoice_total - v_existing_paid;
    
    -- Check if new allocation exceeds remaining balance
    IF NEW.allocated_amount > v_remaining_balance THEN
        RAISE EXCEPTION 'Payment allocation ($%) exceeds remaining invoice balance ($%)', 
                       NEW.allocated_amount, v_remaining_balance;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_payment_allocation_trigger
    BEFORE INSERT OR UPDATE ON payment_allocation
    FOR EACH ROW
    EXECUTE FUNCTION check_payment_allocation();
```

## Indexes Summary

### Performance-Critical Indexes
1. **Tenant isolation**: All tables indexed on tenant_id
2. **User lookups**: Indexed on user_id where applicable
3. **Date-based queries**: Receipt date, created_at indexes
4. **Search operations**: GIN indexes on JSONB, arrays
5. **Vector search**: IVFFlat index on embeddings
6. **Status filtering**: Partial indexes on status columns

### Composite Indexes
- (tenant_id, receipt_date) for date-range queries
- (tenant_id, vendor_id) for vendor reports
- (tenant_id, category) for category analytics
- (tenant_id, normalized_description) for item lookups

## Data Migration Considerations

### Initial Setup
1. Run migrations in order
2. Create all tables before enabling RLS
3. Set up initial tenant and admin user
4. Configure Supabase Auth integration

### Production Deployment
1. Use migration tools (Supabase CLI, Flyway)
2. Test RLS policies thoroughly
3. Verify index performance
4. Monitor query performance

## Backup & Recovery

### Backup Strategy
- Daily automated backups via Supabase
- Point-in-time recovery enabled
- Regular backup testing
- Off-site backup storage

### Recovery Procedures
1. Document RTO/RPO requirements
2. Test recovery procedures quarterly
3. Maintain runbooks for common scenarios
4. Monitor backup success rates

## Performance Optimization

### Query Optimization
- Use EXPLAIN ANALYZE for slow queries
- Implement query result caching
- Use materialized views for analytics
- Partition large tables by date

### Connection Pooling
- Configure PgBouncer settings
- Monitor connection usage
- Implement connection retry logic
- Use read replicas for analytics

## Security Considerations

### Data Encryption
- Enable encryption at rest
- Use SSL/TLS for connections
- Encrypt sensitive fields (tokens)
- Implement field-level encryption for PII

### Access Control
- Principle of least privilege
- Regular permission audits
- API rate limiting
- Session management

## Monitoring & Maintenance

### Key Metrics
- Query performance (p95, p99)
- Table sizes and growth rates
- Index usage statistics
- RLS policy execution time

### Maintenance Tasks
- Weekly VACUUM ANALYZE
- Monthly index rebuild
- Quarterly schema review
- Annual capacity planning