-- MINIMAL POLAR INTEGRATION - Production Safe
-- Only adds Polar fields to existing tables, no new features for missing tables

-- 1. Add Polar fields to existing subscription_plan table
DO $$
BEGIN
  -- Add Polar-specific fields to subscription_plan
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plan' AND column_name = 'polar_product_id') THEN
    ALTER TABLE public.subscription_plan ADD COLUMN polar_product_id VARCHAR(200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plan' AND column_name = 'polar_price_monthly_id') THEN
    ALTER TABLE public.subscription_plan ADD COLUMN polar_price_monthly_id VARCHAR(200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plan' AND column_name = 'polar_price_yearly_id') THEN
    ALTER TABLE public.subscription_plan ADD COLUMN polar_price_yearly_id VARCHAR(200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plan' AND column_name = 'trial_days') THEN
    ALTER TABLE public.subscription_plan ADD COLUMN trial_days INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plan' AND column_name = 'is_trial_enabled') THEN
    ALTER TABLE public.subscription_plan ADD COLUMN is_trial_enabled BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Add Polar fields to existing tenant table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant' AND column_name = 'polar_customer_id') THEN
    ALTER TABLE public.tenant ADD COLUMN polar_customer_id VARCHAR(200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant' AND column_name = 'polar_organization_id') THEN
    ALTER TABLE public.tenant ADD COLUMN polar_organization_id VARCHAR(200);
  END IF;
END $$;

-- 3. Add Polar fields to existing subscription table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription' AND column_name = 'polar_subscription_id') THEN
    ALTER TABLE public.subscription ADD COLUMN polar_subscription_id VARCHAR(200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription' AND column_name = 'polar_customer_id') THEN
    ALTER TABLE public.subscription ADD COLUMN polar_customer_id VARCHAR(200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription' AND column_name = 'polar_price_id') THEN
    ALTER TABLE public.subscription ADD COLUMN polar_price_id VARCHAR(200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription' AND column_name = 'metadata') THEN
    ALTER TABLE public.subscription ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- 4. Update provider constraint to include Polar
DO $$
BEGIN
  -- Check if subscription table exists and has provider column
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription' AND column_name = 'provider') THEN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_provider_check') THEN
      ALTER TABLE public.subscription DROP CONSTRAINT subscription_provider_check;
    END IF;
    
    -- Add new provider constraint including Polar
    ALTER TABLE public.subscription ADD CONSTRAINT subscription_provider_check 
    CHECK (provider IN ('stripe', 'paypal', 'polar'));
  END IF;
END $$;

-- 5. Add unique constraint for Polar subscription ID
DO $$
BEGIN
  -- Only add if polar_subscription_id column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription' AND column_name = 'polar_subscription_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_polar_subscription') THEN
      ALTER TABLE public.subscription ADD CONSTRAINT unique_polar_subscription 
      UNIQUE (polar_subscription_id) DEFERRABLE INITIALLY DEFERRED;
    END IF;
  END IF;
END $$;

-- 6. Add Polar fields to feature_flag table (ONLY if table exists)
DO $$
BEGIN
  -- Check if feature_flag table exists first
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flag') THEN
    -- Add priority field for feature flag precedence
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feature_flag' AND column_name = 'priority') THEN
      ALTER TABLE public.feature_flag ADD COLUMN priority INTEGER DEFAULT 0;
    END IF;
    
    -- Add applied timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feature_flag' AND column_name = 'applied_at') THEN
      ALTER TABLE public.feature_flag ADD COLUMN applied_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add expiration timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feature_flag' AND column_name = 'expires_at') THEN
      ALTER TABLE public.feature_flag ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- 7. Update existing subscription plans to support trials
UPDATE public.subscription_plan SET 
  trial_days = 14,
  is_trial_enabled = true
WHERE slug IN ('pro', 'business', 'enterprise');

-- 8. Create indexes for Polar fields
CREATE INDEX IF NOT EXISTS idx_subscription_plan_polar ON public.subscription_plan(polar_product_id, polar_price_monthly_id, polar_price_yearly_id);
CREATE INDEX IF NOT EXISTS idx_tenant_polar_customer ON public.tenant(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscription_polar ON public.subscription(polar_subscription_id, polar_customer_id);

-- 9. Enhanced function to get subscription with Polar data
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

-- 10. Grant permissions on new function
GRANT EXECUTE ON FUNCTION public.get_tenant_subscription_with_polar(UUID) TO authenticated;

-- 11. Insert Polar test plan (if not exists)
INSERT INTO public.subscription_plan (
  name, slug, description, price_monthly, price_yearly, 
  features, limits, trial_days, is_trial_enabled, is_active, sort_order
) VALUES (
  'Polar Test Plan', 'polar-test',
  'Test plan for Polar integration development',
  9.99, 99.99,
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
    "invoices_per_month": 50,
    "storage_mb": 5000,
    "users_max": 2
  }'::jsonb,
  14, true, true, 5
) ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  trial_days = EXCLUDED.trial_days,
  is_trial_enabled = EXCLUDED.is_trial_enabled,
  updated_at = NOW();

-- Success message
SELECT 'Minimal Polar integration completed successfully!' as result;