-- PayPal Integration for Multi-Tenant SaaS
-- Adds PayPal as an optional payment provider alongside Stripe

-- 1. Create payment_providers table to track tenant's enabled payment methods
CREATE TABLE IF NOT EXISTS public.payment_provider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  
  -- Provider information
  provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('stripe', 'paypal')),
  is_enabled BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  
  -- Provider-specific configuration (encrypted/tokenized)
  provider_config JSONB DEFAULT '{}', -- Stores non-sensitive config like webhook URLs
  
  -- PayPal specific fields
  paypal_client_id VARCHAR(200), -- Public PayPal client ID
  paypal_webhook_id VARCHAR(200), -- PayPal webhook ID for this tenant
  paypal_merchant_id VARCHAR(200), -- PayPal merchant/payer ID
  
  -- Stripe specific fields (for consistency)
  stripe_account_id VARCHAR(200), -- If using Stripe Connect
  stripe_webhook_endpoint_id VARCHAR(200),
  
  -- Status tracking
  setup_completed_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'suspended')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure only one default provider per tenant
  UNIQUE(tenant_id, provider_type),
  EXCLUDE (tenant_id WITH =) WHERE (is_default = true AND provider_type = 'stripe'),
  EXCLUDE (tenant_id WITH =) WHERE (is_default = true AND provider_type = 'paypal')
);

-- 2. Extend invoice table to support multiple payment providers
ALTER TABLE public.invoice 
ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS paypal_payment_link_url TEXT,
ADD COLUMN IF NOT EXISTS preferred_payment_provider VARCHAR(50) DEFAULT 'stripe' CHECK (preferred_payment_provider IN ('stripe', 'paypal', 'both'));

-- Update existing payment_method column to include PayPal
ALTER TABLE public.invoice 
DROP CONSTRAINT IF EXISTS invoice_payment_method_check;

ALTER TABLE public.invoice 
ADD CONSTRAINT invoice_payment_method_check 
CHECK (payment_method IN ('stripe', 'paypal', 'bank_transfer', 'check', 'cash', 'both'));

-- 3. Extend invoice_payment table for PayPal transactions
ALTER TABLE public.invoice_payment
ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS paypal_capture_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS paypal_payer_id VARCHAR(200);

-- Update payment_method constraint
ALTER TABLE public.invoice_payment 
DROP CONSTRAINT IF EXISTS invoice_payment_payment_method_check;

ALTER TABLE public.invoice_payment 
ADD CONSTRAINT invoice_payment_payment_method_check 
CHECK (payment_method IN ('stripe', 'paypal', 'bank_transfer', 'cash', 'check'));

-- 4. Create PayPal webhook events table for idempotency and audit
CREATE TABLE IF NOT EXISTS public.paypal_webhook_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  
  -- PayPal webhook details
  paypal_event_id VARCHAR(200) NOT NULL, -- PayPal's unique event ID
  event_type VARCHAR(100) NOT NULL, -- PAYMENT.CAPTURE.COMPLETED, etc.
  event_data JSONB NOT NULL, -- Full webhook payload
  
  -- Processing status
  processed_at TIMESTAMPTZ,
  processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed', 'ignored')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Related records
  invoice_id UUID REFERENCES public.invoice(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.invoice_payment(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure we don't process the same event twice
  UNIQUE(tenant_id, paypal_event_id)
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_provider_tenant ON public.payment_provider(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_provider_enabled ON public.payment_provider(tenant_id, provider_type) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_invoice_paypal_order ON public.invoice(paypal_order_id) WHERE paypal_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_payment_paypal ON public.invoice_payment(paypal_order_id) WHERE paypal_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_event_tenant ON public.paypal_webhook_event(tenant_id);
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_processing ON public.paypal_webhook_event(processing_status, created_at);
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_event_id ON public.paypal_webhook_event(paypal_event_id);

-- 6. Enable RLS on new tables
ALTER TABLE public.payment_provider ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paypal_webhook_event ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for payment_provider
CREATE POLICY "Users can manage their tenant's payment providers" ON public.payment_provider
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
  );

-- 8. RLS Policies for paypal_webhook_event
CREATE POLICY "Users can view their tenant's PayPal webhook events" ON public.paypal_webhook_event
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
  );

-- Admin can view all events for debugging
CREATE POLICY "Admin can manage PayPal webhook events" ON public.paypal_webhook_event
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.membership m
      JOIN public.tenant t ON m.tenant_id = t.id
      WHERE m.user_id = auth.uid() AND t.name = 'admin'
    )
  );

-- 9. Functions for PayPal integration

-- Function to get enabled payment providers for a tenant
CREATE OR REPLACE FUNCTION public.get_enabled_payment_providers(tenant_uuid UUID)
RETURNS TABLE(provider_type VARCHAR, is_default BOOLEAN, config JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT pp.provider_type, pp.is_default, pp.provider_config
  FROM public.payment_provider pp
  WHERE pp.tenant_id = tenant_uuid 
    AND pp.is_enabled = true 
    AND pp.verification_status = 'verified'
  ORDER BY pp.is_default DESC, pp.provider_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure only one default provider per type
CREATE OR REPLACE FUNCTION public.ensure_single_default_provider()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this provider as default, unset others of the same type
  IF NEW.is_default = true THEN
    UPDATE public.payment_provider
    SET is_default = false
    WHERE tenant_id = NEW.tenant_id 
      AND provider_type = NEW.provider_type 
      AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log payment provider changes
CREATE OR REPLACE FUNCTION public.log_payment_provider_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when providers are enabled/disabled
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_enabled != NEW.is_enabled THEN
      INSERT INTO public.tenant_activity_log (tenant_id, activity_type, description, metadata)
      VALUES (
        NEW.tenant_id,
        CASE WHEN NEW.is_enabled THEN 'payment_provider_enabled' ELSE 'payment_provider_disabled' END,
        'Payment provider ' || NEW.provider_type || ' was ' || 
        CASE WHEN NEW.is_enabled THEN 'enabled' ELSE 'disabled' END,
        jsonb_build_object('provider_type', NEW.provider_type, 'provider_id', NEW.id)
      );
    END IF;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.tenant_activity_log (tenant_id, activity_type, description, metadata)
    VALUES (
      NEW.tenant_id,
      'payment_provider_added',
      'Payment provider ' || NEW.provider_type || ' was added',
      jsonb_build_object('provider_type', NEW.provider_type, 'provider_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers
CREATE TRIGGER ensure_single_default_provider_trigger
  BEFORE INSERT OR UPDATE ON public.payment_provider
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_provider();

-- Only create the activity log trigger if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_activity_log') THEN
    CREATE TRIGGER log_payment_provider_changes_trigger
      AFTER INSERT OR UPDATE ON public.payment_provider
      FOR EACH ROW EXECUTE FUNCTION public.log_payment_provider_changes();
  END IF;
END $$;

-- 11. Insert default Stripe provider for existing tenants
INSERT INTO public.payment_provider (tenant_id, provider_type, is_enabled, is_default, verification_status)
SELECT 
  t.id,
  'stripe',
  true, -- Enable Stripe by default for existing tenants
  true, -- Set as default
  'verified' -- Assume existing Stripe setup is verified
FROM public.tenant t
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_provider pp 
  WHERE pp.tenant_id = t.id AND pp.provider_type = 'stripe'
);

-- 12. Grants
GRANT ALL ON public.payment_provider TO authenticated;
GRANT ALL ON public.paypal_webhook_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_enabled_payment_providers(UUID) TO authenticated;

-- 13. Update existing invoice payment methods
UPDATE public.invoice 
SET preferred_payment_provider = 'stripe' 
WHERE preferred_payment_provider IS NULL;

-- 14. Comments for documentation
COMMENT ON TABLE public.payment_provider IS 'Stores tenant payment provider configurations and credentials';
COMMENT ON TABLE public.paypal_webhook_event IS 'Logs PayPal webhook events for processing and audit trail';
COMMENT ON FUNCTION public.get_enabled_payment_providers(UUID) IS 'Returns enabled and verified payment providers for a tenant';