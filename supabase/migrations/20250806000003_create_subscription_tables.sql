-- Create subscription system tables
-- Migration: 20250806000003_create_subscription_tables

-- Create subscription tiers table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  storage_limit_mb INTEGER NOT NULL DEFAULT 100,
  max_file_size_mb INTEGER NOT NULL DEFAULT 5,
  max_files INTEGER NOT NULL DEFAULT 50,
  features JSONB DEFAULT '[]'::jsonb,
  price_monthly DECIMAL(10,2) DEFAULT 0.00,
  price_yearly DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tenant subscriptions table
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES subscription_tiers(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMP NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id) -- One active subscription per tenant
);

-- Insert default subscription tiers
INSERT INTO subscription_tiers (id, name, description, storage_limit_mb, max_file_size_mb, max_files, features, price_monthly, price_yearly) VALUES
('free', 'Free', 'Perfect for getting started with receipt management', 100, 5, 50, 
 '["OCR receipt processing", "Basic reporting", "Up to 50 receipts", "100MB storage"]'::jsonb, 
 0.00, 0.00),
('basic', 'Basic', 'Great for small businesses and freelancers', 1024, 10, 500,
 '["All free features", "Advanced OCR", "Up to 500 receipts", "1GB storage", "Export to CSV/PDF"]'::jsonb,
 9.99, 99.99),
('premium', 'Premium', 'Perfect for growing businesses', 10240, 25, 5000,
 '["All basic features", "AI-powered categorization", "Up to 5000 receipts", "10GB storage", "Multi-user access", "API access"]'::jsonb,
 24.99, 249.99),
('enterprise', 'Enterprise', 'For large organizations with advanced needs', 102400, 100, 50000,
 '["All premium features", "Unlimited receipts", "100GB storage", "White-label branding", "Custom integrations", "Priority support"]'::jsonb,
 99.99, 999.99)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  storage_limit_mb = EXCLUDED.storage_limit_mb,
  max_file_size_mb = EXCLUDED.max_file_size_mb,
  max_files = EXCLUDED.max_files,
  features = EXCLUDED.features,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  updated_at = NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tier_id ON tenant_subscriptions(tier_id);
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_active ON subscription_tiers(is_active);

-- Create updated_at trigger for tenant_subscriptions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_subscriptions_updated_at
    BEFORE UPDATE ON tenant_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_tiers_updated_at
    BEFORE UPDATE ON subscription_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get tenant subscription with tier details
CREATE OR REPLACE FUNCTION get_tenant_subscription_with_tier(tenant_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'tenant_id', ts.tenant_id,
    'tier_id', ts.tier_id,
    'status', ts.status,
    'current_period_start', ts.current_period_start,
    'current_period_end', ts.current_period_end,
    'cancel_at_period_end', ts.cancel_at_period_end,
    'tier', jsonb_build_object(
      'id', st.id,
      'name', st.name,
      'description', st.description,
      'storage_limit_mb', st.storage_limit_mb,
      'max_file_size_mb', st.max_file_size_mb,
      'max_files', st.max_files,
      'features', st.features,
      'price_monthly', st.price_monthly,
      'price_yearly', st.price_yearly
    )
  ) INTO result
  FROM tenant_subscriptions ts
  JOIN subscription_tiers st ON ts.tier_id = st.id
  WHERE ts.tenant_id = tenant_uuid
    AND ts.status = 'active';
  
  -- If no active subscription found, return free tier
  IF result IS NULL THEN
    SELECT jsonb_build_object(
      'tenant_id', tenant_uuid,
      'tier_id', 'free',
      'status', 'active',
      'current_period_start', NOW(),
      'current_period_end', NOW() + INTERVAL '1 year',
      'cancel_at_period_end', false,
      'tier', jsonb_build_object(
        'id', st.id,
        'name', st.name,
        'description', st.description,
        'storage_limit_mb', st.storage_limit_mb,
        'max_file_size_mb', st.max_file_size_mb,
        'max_files', st.max_files,
        'features', st.features,
        'price_monthly', st.price_monthly,
        'price_yearly', st.price_yearly
      )
    ) INTO result
    FROM subscription_tiers st
    WHERE st.id = 'free';
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check storage limits for a tenant
CREATE OR REPLACE FUNCTION check_tenant_storage_limits(
  tenant_uuid UUID,
  file_size_bytes BIGINT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  subscription_data JSONB;
  current_usage JSONB;
  tier_limits JSONB;
  storage_used BIGINT := 0;
  file_count INTEGER := 0;
  can_upload BOOLEAN := false;
  reason TEXT := '';
BEGIN
  -- Get subscription data
  subscription_data := get_tenant_subscription_with_tier(tenant_uuid);
  tier_limits := subscription_data->'tier';
  
  -- Get current usage
  current_usage := get_tenant_storage_stats(tenant_uuid);
  
  -- Calculate current storage usage (rough estimate from file metadata)
  SELECT 
    COALESCE(SUM(CAST(r.file_metadata->>'size' AS BIGINT)), 0) +
    COALESCE(SUM(CAST(i.attachment_metadata->>'size' AS BIGINT)), 0)
  INTO storage_used
  FROM tenant t
  LEFT JOIN receipt r ON t.id = r.tenant_id AND r.file_metadata IS NOT NULL
  LEFT JOIN invoice i ON t.id = i.tenant_id AND i.attachment_metadata IS NOT NULL
  WHERE t.id = tenant_uuid;
  
  -- Count total files
  file_count := COALESCE((current_usage->>'total')::INTEGER, 0);
  
  -- Check limits
  IF file_size_bytes > (tier_limits->>'max_file_size_mb')::INTEGER * 1024 * 1024 THEN
    reason := 'File size exceeds limit of ' || (tier_limits->>'max_file_size_mb') || 'MB for ' || (tier_limits->>'name') || ' plan';
  ELSIF storage_used + file_size_bytes > (tier_limits->>'storage_limit_mb')::INTEGER * 1024 * 1024 THEN
    reason := 'Adding this file would exceed storage limit of ' || (tier_limits->>'storage_limit_mb') || 'MB for ' || (tier_limits->>'name') || ' plan';
  ELSIF file_count >= (tier_limits->>'max_files')::INTEGER THEN
    reason := 'File count limit of ' || (tier_limits->>'max_files') || ' files exceeded for ' || (tier_limits->>'name') || ' plan';
  ELSE
    can_upload := true;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', can_upload,
    'reason', reason,
    'subscription', subscription_data,
    'usage', jsonb_build_object(
      'storage_used', storage_used,
      'file_count', file_count,
      'storage_limit', (tier_limits->>'storage_limit_mb')::INTEGER * 1024 * 1024,
      'file_limit', (tier_limits->>'max_files')::INTEGER,
      'max_file_size', (tier_limits->>'max_file_size_mb')::INTEGER * 1024 * 1024
    )
  );
END;
$$ LANGUAGE plpgsql;

-- RLS policies for subscription tables
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- Public read access to subscription tiers (for pricing page)
CREATE POLICY "Public read access to subscription tiers"
ON subscription_tiers FOR SELECT
USING (is_active = true);

-- Tenant subscriptions - users can only see their own tenant's subscription
CREATE POLICY "Users can view their tenant subscription"
ON tenant_subscriptions FOR SELECT
USING (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
);

-- Only admins can modify subscriptions (implement admin check as needed)
CREATE POLICY "Admin can modify subscriptions"
ON tenant_subscriptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND m.tenant_id = tenant_subscriptions.tenant_id
      AND m.role = 'owner'
  )
);

COMMENT ON TABLE subscription_tiers IS 'Defines available subscription plans with storage and feature limits';
COMMENT ON TABLE tenant_subscriptions IS 'Tracks each tenant''s subscription status and billing information';
COMMENT ON FUNCTION get_tenant_subscription_with_tier(UUID) IS 'Get tenant subscription with tier details, defaults to free tier if no subscription';
COMMENT ON FUNCTION check_tenant_storage_limits(UUID, BIGINT) IS 'Check if tenant can upload file based on subscription limits';