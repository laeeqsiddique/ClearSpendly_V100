-- Polar Integration Migration for ClearSpendly - CORRECTED VERSION
-- Run this in Supabase SQL Editor

-- 1. Add Polar-specific fields to subscription_plan table
ALTER TABLE public.subscription_plan 
ADD COLUMN IF NOT EXISTS polar_product_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS polar_price_monthly_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS polar_price_yearly_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_trial_enabled BOOLEAN DEFAULT false;

-- Update existing plans with Polar integration support
UPDATE public.subscription_plan SET 
  trial_days = 14,
  is_trial_enabled = true
WHERE slug IN ('pro', 'business', 'enterprise');

-- 2. Add Polar-specific fields to tenant table
ALTER TABLE public.tenant 
ADD COLUMN IF NOT EXISTS polar_customer_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS polar_organization_id VARCHAR(200);

-- 3. Update subscription table for better Polar integration
ALTER TABLE public.subscription 
ADD COLUMN IF NOT EXISTS polar_subscription_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS polar_customer_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS polar_price_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Drop existing constraint if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_provider_check') THEN
        ALTER TABLE public.subscription DROP CONSTRAINT subscription_provider_check;
    END IF;
END $$;

-- Add new provider constraint
ALTER TABLE public.subscription 
ADD CONSTRAINT subscription_provider_check CHECK (provider IN ('stripe', 'paypal', 'polar'));

-- Add unique constraint for Polar subscription ID (with proper error handling)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_polar_subscription') THEN
        ALTER TABLE public.subscription 
        ADD CONSTRAINT unique_polar_subscription 
        UNIQUE (polar_subscription_id) DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

-- 4. Create subscription_event table for audit trail
CREATE TABLE IF NOT EXISTS public.subscription_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscription(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(100) NOT NULL, -- 'created', 'updated', 'cancelled', 'reactivated', 'trial_started', 'trial_ended'
  event_source VARCHAR(50) NOT NULL DEFAULT 'api', -- 'api', 'webhook', 'admin', 'system'
  
  -- Event data
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  previous_plan_id UUID REFERENCES public.subscription_plan(id),
  new_plan_id UUID REFERENCES public.subscription_plan(id),
  
  -- Provider event details
  provider_event_id VARCHAR(200),
  provider_event_type VARCHAR(100),
  
  -- Metadata
  event_data JSONB DEFAULT '{}',
  triggered_by UUID REFERENCES auth.users(id), -- Who triggered this event
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create subscription_billing_history for payment tracking
CREATE TABLE IF NOT EXISTS public.subscription_billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscription(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  
  -- Billing details
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Status and dates
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'disputed')),
  invoice_date TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,
  
  -- Provider details
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('stripe', 'paypal', 'polar')),
  provider_invoice_id VARCHAR(200),
  provider_payment_id VARCHAR(200),
  provider_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Failure handling
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint for billing history (with error handling)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_provider_invoice') THEN
        ALTER TABLE public.subscription_billing_history
        ADD CONSTRAINT unique_provider_invoice UNIQUE(provider, provider_invoice_id);
    END IF;
END $$;

-- 6. Update feature_flag table with better structure
ALTER TABLE public.feature_flag 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0, -- Higher priority overrides take precedence
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 7. Create usage_quota table for more granular usage tracking
CREATE TABLE IF NOT EXISTS public.usage_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscription(id) ON DELETE CASCADE,
  
  -- Quota details
  quota_type VARCHAR(100) NOT NULL, -- 'receipts_monthly', 'storage_gb', 'api_calls_daily'
  quota_limit INTEGER NOT NULL, -- -1 for unlimited
  quota_used INTEGER DEFAULT 0,
  quota_period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'daily', 'monthly', 'yearly'
  
  -- Period tracking
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_end TIMESTAMPTZ NOT NULL,
  reset_frequency VARCHAR(20) DEFAULT 'monthly', -- How often quota resets
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint for usage quota (with error handling)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_tenant_quota_period') THEN
        ALTER TABLE public.usage_quota
        ADD CONSTRAINT unique_tenant_quota_period UNIQUE(tenant_id, quota_type, period_start);
    END IF;
END $$;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_plan_polar ON public.subscription_plan(polar_product_id, polar_price_monthly_id, polar_price_yearly_id);
CREATE INDEX IF NOT EXISTS idx_tenant_polar_customer ON public.tenant(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscription_polar ON public.subscription(polar_subscription_id, polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscription_event_tenant_date ON public.subscription_event(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_billing_tenant_date ON public.subscription_billing_history(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_billing_status ON public.subscription_billing_history(status, due_date);
CREATE INDEX IF NOT EXISTS idx_usage_quota_tenant_type ON public.usage_quota(tenant_id, quota_type);
CREATE INDEX IF NOT EXISTS idx_usage_quota_period ON public.usage_quota(period_start, period_end);

-- 9. Enable RLS on new tables
ALTER TABLE public.subscription_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_quota ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for new tables
CREATE POLICY "Users can view their tenant subscription events" ON public.subscription_event
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.membership 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their tenant billing history" ON public.subscription_billing_history
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.membership 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their tenant usage quotas" ON public.usage_quota
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.membership 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their tenant usage quotas" ON public.usage_quota
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.membership 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 11. Enhanced function to get current subscription with Polar data
CREATE OR REPLACE FUNCTION public.get_tenant_subscription_with_polar(tenant_uuid UUID)
RETURNS TABLE(
  subscription_id UUID,
  plan_name VARCHAR,
  plan_slug VARCHAR,
  billing_cycle VARCHAR,
  status VARCHAR,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  amount DECIMAL,
  currency VARCHAR,
  features JSONB,
  limits JSONB,
  usage_counts JSONB,
  polar_subscription_id VARCHAR,
  polar_customer_id VARCHAR,
  is_trial BOOLEAN
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    sp.name,
    sp.slug,
    s.billing_cycle,
    s.status,
    s.current_period_end,
    s.trial_end,
    s.amount,
    s.currency,
    sp.features,
    sp.limits,
    s.usage_counts,
    s.polar_subscription_id,
    s.polar_customer_id,
    (s.trial_end IS NOT NULL AND s.trial_end > NOW()) AS is_trial
  FROM public.subscription s
  JOIN public.subscription_plan sp ON s.plan_id = sp.id
  WHERE s.tenant_id = tenant_uuid
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 12. Enhanced function to check usage with quota support
CREATE OR REPLACE FUNCTION public.check_usage_limit(
  tenant_uuid UUID, 
  usage_type VARCHAR,
  increment_by INTEGER DEFAULT 1
)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
DECLARE
  quota_limit INTEGER;
  quota_used INTEGER;
  subscription_limits JSONB;
BEGIN
  -- First check usage_quota table for granular quotas
  SELECT uq.quota_limit, uq.quota_used INTO quota_limit, quota_used
  FROM public.usage_quota uq
  WHERE uq.tenant_id = tenant_uuid 
    AND uq.quota_type = usage_type
    AND uq.period_end > NOW()
  ORDER BY uq.created_at DESC
  LIMIT 1;
  
  IF quota_limit IS NOT NULL THEN
    -- Use granular quota if available
    IF quota_limit = -1 THEN
      RETURN false; -- Unlimited
    END IF;
    RETURN (quota_used + increment_by) > quota_limit;
  END IF;
  
  -- Fallback to subscription plan limits
  SELECT sp.limits INTO subscription_limits
  FROM public.subscription s
  JOIN public.subscription_plan sp ON s.plan_id = sp.id
  WHERE s.tenant_id = tenant_uuid
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  IF subscription_limits IS NULL THEN
    RETURN true; -- No subscription = limit exceeded
  END IF;
  
  quota_limit := (subscription_limits->>usage_type)::integer;
  
  IF quota_limit = -1 THEN
    RETURN false; -- Unlimited
  END IF;
  
  -- Get current usage from subscription
  SELECT COALESCE((s.usage_counts->>usage_type)::integer, 0) INTO quota_used
  FROM public.subscription s
  WHERE s.tenant_id = tenant_uuid
    AND s.status IN ('active', 'trialing');
  
  RETURN (quota_used + increment_by) > quota_limit;
END;
$$ LANGUAGE plpgsql;

-- 13. Function to log subscription events
CREATE OR REPLACE FUNCTION public.log_subscription_event(
  subscription_uuid UUID,
  event_type_param VARCHAR,
  event_data_param JSONB DEFAULT '{}',
  triggered_by_param UUID DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
  event_id UUID;
  tenant_uuid UUID;
BEGIN
  -- Get tenant_id from subscription
  SELECT tenant_id INTO tenant_uuid
  FROM public.subscription
  WHERE id = subscription_uuid;
  
  IF tenant_uuid IS NULL THEN
    RAISE EXCEPTION 'Subscription not found: %', subscription_uuid;
  END IF;
  
  -- Insert event
  INSERT INTO public.subscription_event (
    subscription_id,
    tenant_id,
    event_type,
    event_data,
    triggered_by
  ) VALUES (
    subscription_uuid,
    tenant_uuid,
    event_type_param,
    event_data_param,
    triggered_by_param
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- 14. Create triggers for automatic event logging
CREATE OR REPLACE FUNCTION log_subscription_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_subscription_event(
      NEW.id,
      'created',
      jsonb_build_object(
        'plan_id', NEW.plan_id,
        'billing_cycle', NEW.billing_cycle,
        'status', NEW.status,
        'amount', NEW.amount
      )
    );
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status != NEW.status THEN
      PERFORM public.log_subscription_event(
        NEW.id,
        'status_changed',
        jsonb_build_object(
          'previous_status', OLD.status,
          'new_status', NEW.status,
          'changed_at', NOW()
        )
      );
    END IF;
    
    -- Log plan changes
    IF OLD.plan_id != NEW.plan_id THEN
      PERFORM public.log_subscription_event(
        NEW.id,
        'plan_changed',
        jsonb_build_object(
          'previous_plan_id', OLD.plan_id,
          'new_plan_id', NEW.plan_id,
          'changed_at', NOW()
        )
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS subscription_change_logger ON public.subscription;

-- Create trigger
CREATE TRIGGER subscription_change_logger
  AFTER INSERT OR UPDATE ON public.subscription
  FOR EACH ROW EXECUTE FUNCTION log_subscription_changes();

-- 15. Create automatic billing history updates
CREATE OR REPLACE FUNCTION update_billing_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_subscription_billing_history_updated_at ON public.subscription_billing_history;
DROP TRIGGER IF EXISTS update_usage_quota_updated_at ON public.usage_quota;

-- Create triggers
CREATE TRIGGER update_subscription_billing_history_updated_at 
  BEFORE UPDATE ON public.subscription_billing_history
  FOR EACH ROW EXECUTE FUNCTION update_billing_history_updated_at();

CREATE TRIGGER update_usage_quota_updated_at 
  BEFORE UPDATE ON public.usage_quota
  FOR EACH ROW EXECUTE FUNCTION update_billing_history_updated_at();

-- 16. Grant permissions on new tables and functions
GRANT ALL ON public.subscription_event TO authenticated;
GRANT ALL ON public.subscription_billing_history TO authenticated;
GRANT ALL ON public.usage_quota TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_tenant_subscription_with_polar(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_usage_limit(UUID, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_subscription_event(UUID, VARCHAR, JSONB, UUID) TO authenticated;

-- 17. Insert sample Polar configuration for testing
INSERT INTO public.subscription_plan (
  name, slug, description, price_monthly, price_yearly, 
  features, limits, trial_days, is_trial_enabled, is_active, sort_order
) VALUES (
  'Polar Pro Test', 'polar-pro-test',
  'Test plan for Polar integration',
  19.99, 199.99,
  '{
    "ocr_processing": "enhanced",
    "email_templates": true,
    "analytics": "advanced",
    "api_access": true,
    "priority_support": true,
    "custom_branding": true
  }'::jsonb,
  '{
    "receipts_per_month": -1,
    "invoices_per_month": 100,
    "storage_mb": 10000,
    "users_max": 3
  }'::jsonb,
  14, true, true, 10
) ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  trial_days = EXCLUDED.trial_days,
  is_trial_enabled = EXCLUDED.is_trial_enabled,
  updated_at = NOW();

-- 18. Comments for documentation
COMMENT ON TABLE public.subscription_event IS 'Audit trail for all subscription-related events and changes';
COMMENT ON TABLE public.subscription_billing_history IS 'Detailed billing and payment history for subscriptions';
COMMENT ON TABLE public.usage_quota IS 'Granular usage quotas and tracking per tenant';

COMMENT ON FUNCTION public.get_tenant_subscription_with_polar(UUID) IS 'Enhanced subscription details including Polar integration data';
COMMENT ON FUNCTION public.check_usage_limit(UUID, VARCHAR, INTEGER) IS 'Check usage limits with support for granular quotas';
COMMENT ON FUNCTION public.log_subscription_event(UUID, VARCHAR, JSONB, UUID) IS 'Log subscription events for audit trail';

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Polar integration migration completed successfully!';
END $$;