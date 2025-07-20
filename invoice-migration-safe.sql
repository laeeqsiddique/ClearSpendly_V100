-- Invoice system database schema (Safe version)
-- Complete invoicing solution for independent contractors

-- Clients table for invoice recipients
CREATE TABLE IF NOT EXISTS public.client (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Client information
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company_name VARCHAR(200),
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'United States',
  
  -- Contact details
  phone VARCHAR(50),
  website VARCHAR(255),
  
  -- Business details
  tax_id VARCHAR(50),
  notes TEXT,
  
  -- Payment preferences
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  preferred_payment_method VARCHAR(50) DEFAULT 'stripe',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'client_tenant_id_email_key'
  ) THEN
    ALTER TABLE public.client ADD CONSTRAINT client_tenant_id_email_key UNIQUE(tenant_id, email);
  END IF;
END $$;

-- Invoice templates for different types of work
CREATE TABLE IF NOT EXISTS public.invoice_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  
  -- Template styling
  template_type VARCHAR(50) DEFAULT 'modern',
  color_scheme VARCHAR(50) DEFAULT 'blue',
  
  -- Default terms and content
  default_payment_terms VARCHAR(50) DEFAULT 'Net 30',
  default_notes TEXT,
  footer_text TEXT,
  
  -- Template settings
  show_tax BOOLEAN DEFAULT true,
  tax_rate DECIMAL(5,4) DEFAULT 0.0000,
  tax_label VARCHAR(50) DEFAULT 'Tax',
  
  -- Auto-numbering
  next_invoice_number INTEGER DEFAULT 1,
  invoice_prefix VARCHAR(10) DEFAULT 'INV',
  
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'invoice_template_tenant_id_name_key'
  ) THEN
    ALTER TABLE public.invoice_template ADD CONSTRAINT invoice_template_tenant_id_name_key UNIQUE(tenant_id, name);
  END IF;
END $$;

-- Main invoices table
CREATE TABLE IF NOT EXISTS public.invoice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.client(id) ON DELETE RESTRICT,
  template_id UUID REFERENCES public.invoice_template(id) ON DELETE SET NULL,
  
  -- Invoice identification
  invoice_number VARCHAR(50) NOT NULL,
  
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'draft',
  
  -- Financial details
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_rate DECIMAL(5,4) DEFAULT 0.0000,
  tax_amount DECIMAL(12,2) GENERATED ALWAYS AS (subtotal * tax_rate) STORED,
  total_amount DECIMAL(12,2) GENERATED ALWAYS AS (subtotal + (subtotal * tax_rate)) STORED,
  
  -- Payment tracking
  amount_paid DECIMAL(12,2) DEFAULT 0.00,
  balance_due DECIMAL(12,2) GENERATED ALWAYS AS (subtotal + (subtotal * tax_rate) - amount_paid) STORED,
  
  -- Content
  subject VARCHAR(200),
  notes TEXT,
  terms VARCHAR(500),
  footer_text TEXT,
  
  -- Payment integration
  stripe_payment_link_id VARCHAR(200),
  stripe_payment_link_url TEXT,
  payment_method VARCHAR(50) DEFAULT 'stripe',
  
  -- Email tracking
  sent_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  
  -- Metadata
  currency VARCHAR(3) DEFAULT 'USD',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'invoice_tenant_id_invoice_number_key'
  ) THEN
    ALTER TABLE public.invoice ADD CONSTRAINT invoice_tenant_id_invoice_number_key UNIQUE(tenant_id, invoice_number);
  END IF;
END $$;

-- Invoice line items
CREATE TABLE IF NOT EXISTS public.invoice_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
  
  -- Item details
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  rate DECIMAL(12,2) NOT NULL,
  amount DECIMAL(12,2) GENERATED ALWAYS AS (quantity * rate) STORED,
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice payments table
CREATE TABLE IF NOT EXISTS public.invoice_payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
  
  -- Payment details
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) NOT NULL,
  
  -- External references
  stripe_payment_intent_id VARCHAR(200),
  stripe_charge_id VARCHAR(200),
  transaction_id VARCHAR(200),
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice activities/audit log
CREATE TABLE IF NOT EXISTS public.invoice_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
  
  activity_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  
  -- Email tracking
  email_subject VARCHAR(500),
  recipient_email VARCHAR(255),
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurring invoice templates
CREATE TABLE IF NOT EXISTS public.recurring_invoice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.invoice_template(id) ON DELETE SET NULL,
  
  -- Recurrence settings
  frequency VARCHAR(50) NOT NULL,
  interval_count INTEGER DEFAULT 1,
  
  -- Schedule
  start_date DATE NOT NULL,
  end_date DATE,
  next_invoice_date DATE NOT NULL,
  
  -- Invoice template data
  subject VARCHAR(200),
  notes TEXT,
  terms VARCHAR(500),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Tracking
  invoices_created INTEGER DEFAULT 0,
  last_invoice_created_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurring invoice items
CREATE TABLE IF NOT EXISTS public.recurring_invoice_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_invoice_id UUID NOT NULL REFERENCES public.recurring_invoice(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  rate DECIMAL(12,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_tenant ON public.client(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_email ON public.client(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_invoice_template_tenant ON public.invoice_template(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tenant_status ON public.invoice(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_client ON public.invoice(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_due_date ON public.invoice(due_date) WHERE status IN ('sent', 'viewed');
CREATE INDEX IF NOT EXISTS idx_invoice_number ON public.invoice(tenant_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_item_invoice ON public.invoice_item(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_invoice ON public.invoice_payment(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_activity_invoice ON public.invoice_activity(invoice_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoice_tenant ON public.recurring_invoice(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoice_next_date ON public.recurring_invoice(next_invoice_date) WHERE is_active = true;

-- Enable RLS on all tables
ALTER TABLE public.client ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_invoice_item ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Drop existing first, then create)
DROP POLICY IF EXISTS "Users can manage their tenant's clients" ON public.client;
CREATE POLICY "Users can manage their tenant's clients" ON public.client
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage their tenant's invoice templates" ON public.invoice_template;
CREATE POLICY "Users can manage their tenant's invoice templates" ON public.invoice_template
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage their tenant's invoices" ON public.invoice;
CREATE POLICY "Users can manage their tenant's invoices" ON public.invoice
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage invoice items for their invoices" ON public.invoice_item;
CREATE POLICY "Users can manage invoice items for their invoices" ON public.invoice_item
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM public.invoice 
      WHERE tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage payments for their invoices" ON public.invoice_payment;
CREATE POLICY "Users can manage payments for their invoices" ON public.invoice_payment
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM public.invoice 
      WHERE tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view activities for their invoices" ON public.invoice_activity;
CREATE POLICY "Users can view activities for their invoices" ON public.invoice_activity
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM public.invoice 
      WHERE tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage their tenant's recurring invoices" ON public.recurring_invoice;
CREATE POLICY "Users can manage their tenant's recurring invoices" ON public.recurring_invoice
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage recurring invoice items" ON public.recurring_invoice_item;
CREATE POLICY "Users can manage recurring invoice items" ON public.recurring_invoice_item
  FOR ALL USING (
    recurring_invoice_id IN (
      SELECT id FROM public.recurring_invoice 
      WHERE tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
    )
  );

-- Functions for invoice management
CREATE OR REPLACE FUNCTION public.update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.invoice
  SET subtotal = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.invoice_item
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
  )
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.generate_invoice_number(template_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  -- Get prefix and next number from template
  SELECT invoice_prefix, next_invoice_number
  INTO prefix, next_num
  FROM public.invoice_template
  WHERE id = template_uuid;
  
  -- Update the next number
  UPDATE public.invoice_template
  SET next_invoice_number = next_invoice_number + 1
  WHERE id = template_uuid;
  
  -- Format the invoice number
  result := prefix || '-' || LPAD(next_num::TEXT, 4, '0');
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.log_invoice_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.invoice_activity (invoice_id, activity_type, description)
    VALUES (
      NEW.id,
      CASE NEW.status
        WHEN 'sent' THEN 'sent'
        WHEN 'paid' THEN 'paid'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'updated'
      END,
      'Invoice status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;
  
  -- Log creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.invoice_activity (invoice_id, activity_type, description)
    VALUES (NEW.id, 'created', 'Invoice created');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers (drop first if exists)
DROP TRIGGER IF EXISTS update_invoice_totals_trigger ON public.invoice_item;
CREATE TRIGGER update_invoice_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_item
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_totals();

DROP TRIGGER IF EXISTS log_invoice_activity_trigger ON public.invoice;
CREATE TRIGGER log_invoice_activity_trigger
  AFTER INSERT OR UPDATE ON public.invoice
  FOR EACH ROW EXECUTE FUNCTION public.log_invoice_activity();

-- Insert default invoice template
INSERT INTO public.invoice_template (
  tenant_id, user_id, name, template_type, color_scheme, 
  default_payment_terms, is_default, next_invoice_number, invoice_prefix
) 
SELECT 
  t.id, 
  m.user_id, 
  'Default Template', 
  'modern', 
  'blue', 
  'Net 30', 
  true, 
  1, 
  'INV'
FROM public.tenant t
JOIN public.membership m ON t.id = m.tenant_id
WHERE m.role = 'owner'
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Grants
GRANT ALL ON public.client TO authenticated;
GRANT ALL ON public.invoice_template TO authenticated;
GRANT ALL ON public.invoice TO authenticated;
GRANT ALL ON public.invoice_item TO authenticated;
GRANT ALL ON public.invoice_payment TO authenticated;
GRANT ALL ON public.invoice_activity TO authenticated;
GRANT ALL ON public.recurring_invoice TO authenticated;
GRANT ALL ON public.recurring_invoice_item TO authenticated;