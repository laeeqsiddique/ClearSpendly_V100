-- Comprehensive Subscription & Billing System for Flowvya SaaS
-- Supports multi-tenant architecture with Stripe and PayPal integrations

-- 1. Create subscription_plan table - defines available plans
CREATE TABLE IF NOT EXISTS public.subscription_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan details
  name VARCHAR(100) NOT NULL, -- 'Free', 'Pro', 'Business', 'Enterprise'
  slug VARCHAR(50) UNIQUE NOT NULL, -- 'free', 'pro', 'business', 'enterprise'
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Plan limits and features
  features JSONB NOT NULL DEFAULT '{}', -- Feature configuration
  limits JSONB NOT NULL DEFAULT '{}', -- Usage limits
  
  -- Stripe integration
  stripe_price_id_monthly VARCHAR(200), -- Stripe recurring price ID for monthly
  stripe_price_id_yearly VARCHAR(200), -- Stripe recurring price ID for yearly
  stripe_product_id VARCHAR(200), -- Stripe product ID
  
  -- PayPal integration
  paypal_plan_id_monthly VARCHAR(200), -- PayPal billing plan ID for monthly
  paypal_plan_id_yearly VARCHAR(200), -- PayPal billing plan ID for yearly
  
  -- Plan status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique plan names
  UNIQUE(name),
  UNIQUE(slug)
);

-- 2. Create subscription table - tracks tenant subscriptions
CREATE TABLE IF NOT EXISTS public.subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  
  -- Subscription details
  plan_id UUID NOT NULL REFERENCES public.subscription_plan(id),
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due', 'unpaid', 'trialing')),
  
  -- Billing dates
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ, -- When trial ends (if applicable)
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Pricing
  amount DECIMAL(10,2) NOT NULL, -- Amount being charged
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Provider integration
  stripe_subscription_id VARCHAR(200), -- Stripe subscription ID
  stripe_customer_id VARCHAR(200), -- Stripe customer ID
  paypal_subscription_id VARCHAR(200), -- PayPal subscription ID
  paypal_subscriber_id VARCHAR(200), -- PayPal subscriber ID
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('stripe', 'paypal')),
  
  -- Usage tracking
  usage_reset_at TIMESTAMPTZ DEFAULT NOW(),
  usage_counts JSONB DEFAULT '{}', -- Current usage counts
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active subscription per tenant
  UNIQUE(tenant_id) DEFERRABLE INITIALLY DEFERRED
);

-- 3. Create subscription_usage table - tracks usage over time
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscription(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  
  -- Usage period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Usage metrics
  receipts_processed INTEGER DEFAULT 0,
  invoices_created INTEGER DEFAULT 0,
  storage_used_mb DECIMAL(12,2) DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  ocr_pages_processed INTEGER DEFAULT 0,
  users_active INTEGER DEFAULT 0,
  
  -- Additional usage data
  usage_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique usage periods per subscription
  UNIQUE(subscription_id, period_start, period_end)
);

-- 4. Create subscription_transaction table - payment history
CREATE TABLE IF NOT EXISTS public.subscription_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscription(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('charge', 'refund', 'dispute', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  
  -- Provider details
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('stripe', 'paypal')),
  provider_transaction_id VARCHAR(200) NOT NULL, -- Stripe charge ID or PayPal transaction ID
  provider_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Billing period this transaction covers
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  
  -- Metadata
  description TEXT,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique provider transactions
  UNIQUE(provider, provider_transaction_id)
);

-- 5. Create feature_flag table - feature toggles per tenant
CREATE TABLE IF NOT EXISTS public.feature_flag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  
  -- Feature details
  feature_key VARCHAR(100) NOT NULL, -- 'advanced_analytics', 'multi_user', etc.
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}', -- Feature-specific configuration
  
  -- Override settings (can override plan defaults)
  override_reason TEXT,
  enabled_by UUID REFERENCES auth.users(id), -- Who enabled this override
  enabled_until TIMESTAMPTZ, -- Temporary feature access
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, feature_key)
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_plan_active ON public.subscription_plan(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_subscription_tenant ON public.subscription(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON public.subscription(status);
CREATE INDEX IF NOT EXISTS idx_subscription_period ON public.subscription(current_period_start, current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscription_provider ON public.subscription(provider, stripe_subscription_id, paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_period ON public.subscription_usage(subscription_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_transaction_tenant ON public.subscription_transaction(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_flag_tenant ON public.feature_flag(tenant_id, feature_key);

-- 7. Insert default subscription plans
INSERT INTO public.subscription_plan (name, slug, description, price_monthly, price_yearly, features, limits, sort_order) VALUES
(
  'Free', 'free', 
  'Perfect for getting started with basic expense tracking',
  0.00, 0.00,
  '{
    "ocr_processing": "basic",
    "email_templates": false,
    "analytics": "basic",
    "multi_user": false,
    "api_access": false,
    "priority_support": false,
    "custom_branding": false
  }'::jsonb,
  '{
    "receipts_per_month": 10,
    "invoices_per_month": 2,
    "storage_mb": 100,
    "users_max": 1
  }'::jsonb,
  1
),
(
  'Pro', 'pro',
  'Enhanced features for small businesses and freelancers',
  19.99, 199.99,
  '{
    "ocr_processing": "enhanced",
    "email_templates": true,
    "analytics": "advanced",
    "multi_user": false,
    "api_access": "basic",
    "priority_support": true,
    "custom_branding": true
  }'::jsonb,
  '{
    "receipts_per_month": 500,
    "invoices_per_month": 50,
    "storage_mb": 5000,
    "users_max": 1
  }'::jsonb,
  2
),
(
  'Business', 'business',
  'Complete solution for growing businesses',
  49.99, 499.99,
  '{
    "ocr_processing": "premium",
    "email_templates": true,
    "analytics": "premium",
    "multi_user": true,
    "api_access": "full",
    "priority_support": true,
    "custom_branding": true,
    "advanced_reporting": true,
    "integrations": true
  }'::jsonb,
  '{
    "receipts_per_month": -1,
    "invoices_per_month": -1,
    "storage_mb": 25000,
    "users_max": 10
  }'::jsonb,
  3
),
(
  'Enterprise', 'enterprise',
  'Unlimited everything with dedicated support',
  99.99, 999.99,
  '{
    "ocr_processing": "premium",
    "email_templates": true,
    "analytics": "premium",
    "multi_user": true,
    "api_access": "full",
    "priority_support": true,
    "custom_branding": true,
    "advanced_reporting": true,
    "integrations": true,
    "dedicated_support": true,
    "sla_guarantee": true,
    "custom_features": true
  }'::jsonb,
  '{
    "receipts_per_month": -1,
    "invoices_per_month": -1,
    "storage_mb": -1,
    "users_max": -1
  }'::jsonb,
  4
);

-- 8. Update existing tenant table to reference subscriptions
ALTER TABLE public.tenant 
DROP COLUMN IF EXISTS subscription_status,
DROP COLUMN IF EXISTS subscription_plan;

-- Add new subscription tracking columns
ALTER TABLE public.tenant 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
ADD COLUMN IF NOT EXISTS is_trial_expired BOOLEAN DEFAULT false;

-- 9. Enable Row Level Security on new tables
ALTER TABLE public.subscription_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS Policies

-- subscription_plan - Public read access
CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plan
  FOR SELECT USING (is_active = true);

-- subscription - Tenant-specific access
CREATE POLICY "Users can view their tenant subscription" ON public.subscription
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.membership 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their tenant subscription" ON public.subscription
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.membership 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- subscription_usage - Tenant-specific access
CREATE POLICY "Users can view their tenant usage" ON public.subscription_usage
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.membership 
      WHERE user_id = auth.uid()
    )
  );

-- subscription_transaction - Tenant-specific access
CREATE POLICY "Users can view their tenant transactions" ON public.subscription_transaction
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.membership 
      WHERE user_id = auth.uid()
    )
  );

-- feature_flag - Tenant-specific access
CREATE POLICY "Users can view their tenant features" ON public.feature_flag
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.membership 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their tenant features" ON public.feature_flag
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.membership 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 11. Create helper functions

-- Function to get current subscription for a tenant
CREATE OR REPLACE FUNCTION public.get_tenant_subscription(tenant_uuid UUID)
RETURNS TABLE(
  subscription_id UUID,
  plan_name VARCHAR,
  plan_slug VARCHAR,
  billing_cycle VARCHAR,
  status VARCHAR,
  current_period_end TIMESTAMPTZ,
  amount DECIMAL,
  currency VARCHAR,
  features JSONB,
  limits JSONB
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
    s.amount,
    s.currency,
    sp.features,
    sp.limits
  FROM public.subscription s
  JOIN public.subscription_plan sp ON s.plan_id = sp.id
  WHERE s.tenant_id = tenant_uuid
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if feature is enabled for tenant
CREATE OR REPLACE FUNCTION public.is_feature_enabled(tenant_uuid UUID, feature_name VARCHAR)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
DECLARE
  subscription_features JSONB;
  feature_override BOOLEAN;
BEGIN
  -- Check for explicit feature flag override
  SELECT is_enabled INTO feature_override
  FROM public.feature_flag
  WHERE tenant_id = tenant_uuid 
    AND feature_key = feature_name
    AND (enabled_until IS NULL OR enabled_until > NOW());
  
  IF feature_override IS NOT NULL THEN
    RETURN feature_override;
  END IF;
  
  -- Check subscription plan features
  SELECT sp.features INTO subscription_features
  FROM public.subscription s
  JOIN public.subscription_plan sp ON s.plan_id = sp.id
  WHERE s.tenant_id = tenant_uuid
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  IF subscription_features IS NULL THEN
    RETURN false; -- No active subscription
  END IF;
  
  RETURN COALESCE((subscription_features->feature_name)::boolean, false);
END;
$$ LANGUAGE plpgsql;

-- Function to get usage limits for tenant
CREATE OR REPLACE FUNCTION public.get_tenant_limits(tenant_uuid UUID)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  limits JSONB;
BEGIN
  SELECT sp.limits INTO limits
  FROM public.subscription s
  JOIN public.subscription_plan sp ON s.plan_id = sp.id
  WHERE s.tenant_id = tenant_uuid
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(limits, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to update usage counts
CREATE OR REPLACE FUNCTION public.increment_usage(
  tenant_uuid UUID, 
  usage_type VARCHAR, 
  increment_by INTEGER DEFAULT 1
)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
DECLARE
  current_usage JSONB;
  new_count INTEGER;
  limit_value INTEGER;
  limits JSONB;
BEGIN
  -- Get current limits
  limits := public.get_tenant_limits(tenant_uuid);
  limit_value := (limits->>usage_type)::integer;
  
  -- If limit is -1, it's unlimited
  IF limit_value = -1 THEN
    RETURN true;
  END IF;
  
  -- Get current usage
  SELECT usage_counts INTO current_usage
  FROM public.subscription
  WHERE tenant_id = tenant_uuid
    AND status IN ('active', 'trialing');
  
  IF current_usage IS NULL THEN
    current_usage := '{}'::jsonb;
  END IF;
  
  new_count := COALESCE((current_usage->>usage_type)::integer, 0) + increment_by;
  
  -- Check if within limits
  IF limit_value > 0 AND new_count > limit_value THEN
    RETURN false; -- Usage limit exceeded
  END IF;
  
  -- Update usage
  UPDATE public.subscription
  SET usage_counts = jsonb_set(usage_counts, ARRAY[usage_type], to_jsonb(new_count))
  WHERE tenant_id = tenant_uuid
    AND status IN ('active', 'trialing');
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly usage
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  -- Reset usage for subscriptions where period has ended
  UPDATE public.subscription
  SET 
    usage_counts = '{}',
    usage_reset_at = NOW(),
    current_period_start = current_period_end,
    current_period_end = CASE 
      WHEN billing_cycle = 'monthly' THEN current_period_end + INTERVAL '1 month'
      WHEN billing_cycle = 'yearly' THEN current_period_end + INTERVAL '1 year'
    END
  WHERE current_period_end <= NOW()
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- 12. Create default subscriptions for existing tenants
INSERT INTO public.subscription (tenant_id, plan_id, billing_cycle, status, current_period_start, current_period_end, amount, currency, provider)
SELECT 
  t.id,
  sp.id,
  'monthly',
  'trialing',
  NOW(),
  COALESCE(t.trial_ends_at, NOW() + INTERVAL '14 days'),
  0.00,
  'USD',
  'stripe'
FROM public.tenant t
CROSS JOIN public.subscription_plan sp
WHERE sp.slug = 'free'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscription s 
    WHERE s.tenant_id = t.id
  );

-- 13. Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plan_updated_at 
  BEFORE UPDATE ON public.subscription_plan
  FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

CREATE TRIGGER update_subscription_updated_at 
  BEFORE UPDATE ON public.subscription
  FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

CREATE TRIGGER update_feature_flag_updated_at 
  BEFORE UPDATE ON public.feature_flag
  FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

-- 14. Grant permissions
GRANT ALL ON public.subscription_plan TO authenticated;
GRANT ALL ON public.subscription TO authenticated;
GRANT ALL ON public.subscription_usage TO authenticated;
GRANT ALL ON public.subscription_transaction TO authenticated;
GRANT ALL ON public.feature_flag TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_tenant_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_limits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, VARCHAR, INTEGER) TO authenticated;

-- 15. Comments for documentation
COMMENT ON TABLE public.subscription_plan IS 'Available subscription plans with pricing and features';
COMMENT ON TABLE public.subscription IS 'Active subscriptions for each tenant';
COMMENT ON TABLE public.subscription_usage IS 'Historical usage tracking per billing period';
COMMENT ON TABLE public.subscription_transaction IS 'Payment transaction history';
COMMENT ON TABLE public.feature_flag IS 'Per-tenant feature toggles and overrides';

COMMENT ON FUNCTION public.get_tenant_subscription(UUID) IS 'Returns current active subscription details for a tenant';
COMMENT ON FUNCTION public.is_feature_enabled(UUID, VARCHAR) IS 'Checks if a specific feature is enabled for a tenant';
COMMENT ON FUNCTION public.get_tenant_limits(UUID) IS 'Returns usage limits for a tenant based on their subscription';
COMMENT ON FUNCTION public.increment_usage(UUID, VARCHAR, INTEGER) IS 'Increments usage counter and enforces limits';