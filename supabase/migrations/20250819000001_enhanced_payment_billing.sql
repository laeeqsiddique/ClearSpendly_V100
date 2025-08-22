-- Enhanced Payment and Billing System
-- Migration: 20250819000001_enhanced_payment_billing

-- Create payment failures table for dunning management
CREATE TABLE IF NOT EXISTS payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal')),
  provider_failure_id TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  failure_reason TEXT NOT NULL,
  failure_code TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  next_retry_date TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'resolved', 'abandoned')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create subscription events table for audit logging
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create cancellation feedback table
CREATE TABLE IF NOT EXISTS cancellation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  reason TEXT,
  feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  would_recommend BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create scheduled jobs table for background tasks
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenant(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  executed_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  payload JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tenant settings table for dunning configuration
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE UNIQUE,
  dunning_config JSONB DEFAULT '{}'::jsonb,
  billing_settings JSONB DEFAULT '{}'::jsonb,
  notification_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenant(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL,
  currency CHAR(3) DEFAULT 'USD',
  duration TEXT NOT NULL CHECK (duration IN ('forever', 'once', 'repeating')),
  duration_in_months INTEGER,
  max_redemptions INTEGER,
  times_redeemed INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  stripe_coupon_id TEXT,
  paypal_coupon_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- Create coupon redemptions table
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP DEFAULT NOW(),
  discount_amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD'
);

-- Update existing subscription table with enhanced fields
DO $$
BEGIN
  -- Add paused_at field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription' AND column_name = 'paused_at'
  ) THEN
    ALTER TABLE subscription ADD COLUMN paused_at TIMESTAMP;
  END IF;

  -- Add pause_until field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription' AND column_name = 'pause_until'
  ) THEN
    ALTER TABLE subscription ADD COLUMN pause_until TIMESTAMP;
  END IF;

  -- Add cancellation_reason field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE subscription ADD COLUMN cancellation_reason TEXT;
  END IF;

  -- Add plan_id field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription' AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE subscription ADD COLUMN plan_id TEXT;
  END IF;

  -- Add provider_customer_id field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription' AND column_name = 'provider_customer_id'
  ) THEN
    ALTER TABLE subscription ADD COLUMN provider_customer_id TEXT;
  END IF;

  -- Add provider_subscription_id field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription' AND column_name = 'provider_subscription_id'
  ) THEN
    ALTER TABLE subscription ADD COLUMN provider_subscription_id TEXT;
  END IF;

  -- Add provider field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription' AND column_name = 'provider'
  ) THEN
    ALTER TABLE subscription ADD COLUMN provider TEXT CHECK (provider IN ('stripe', 'paypal', 'polar'));
  END IF;

  -- Add billing_cycle field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription' AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE subscription ADD COLUMN billing_cycle TEXT CHECK (billing_cycle IN ('month', 'year'));
  END IF;

  -- Add amount field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription' AND column_name = 'amount'
  ) THEN
    ALTER TABLE subscription ADD COLUMN amount DECIMAL(10,2);
  END IF;

  -- Add currency field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription' AND column_name = 'currency'
  ) THEN
    ALTER TABLE subscription ADD COLUMN currency CHAR(3) DEFAULT 'USD';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_failures_tenant_id ON payment_failures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_status ON payment_failures(status);
CREATE INDEX IF NOT EXISTS idx_payment_failures_next_retry_date ON payment_failures(next_retry_date);
CREATE INDEX IF NOT EXISTS idx_payment_failures_provider_failure_id ON payment_failures(provider_failure_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_scheduled_at ON scheduled_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_job_type ON scheduled_jobs(job_type);

CREATE INDEX IF NOT EXISTS idx_coupons_tenant_id ON coupons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_subscription_id ON coupon_redemptions(subscription_id);

-- Create updated_at triggers
CREATE TRIGGER update_payment_failures_updated_at
    BEFORE UPDATE ON payment_failures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_jobs_updated_at
    BEFORE UPDATE ON scheduled_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_settings_updated_at
    BEFORE UPDATE ON tenant_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE payment_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Payment failures - tenant members can view their tenant's failures
CREATE POLICY "Users can view their tenant payment failures"
ON payment_failures FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND m.tenant_id = payment_failures.tenant_id
  )
);

-- Only owners/admins can manage payment failures
CREATE POLICY "Owners and admins can manage payment failures"
ON payment_failures FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND m.tenant_id = payment_failures.tenant_id
      AND m.role IN ('owner', 'admin')
  )
);

-- Subscription events - read-only for tenant members
CREATE POLICY "Users can view their tenant subscription events"
ON subscription_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM subscription s
    JOIN membership m ON s.tenant_id = m.tenant_id
    WHERE s.id = subscription_events.subscription_id
      AND m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
  )
);

-- System can insert subscription events (no user restriction)
CREATE POLICY "System can insert subscription events"
ON subscription_events FOR INSERT
WITH CHECK (true);

-- Cancellation feedback - tenant members can view/create
CREATE POLICY "Users can manage their tenant cancellation feedback"
ON cancellation_feedback FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND m.tenant_id = cancellation_feedback.tenant_id
  )
);

-- Scheduled jobs - system access only
CREATE POLICY "System access for scheduled jobs"
ON scheduled_jobs FOR ALL
USING (true);

-- Tenant settings - owners can manage
CREATE POLICY "Owners can manage tenant settings"
ON tenant_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND m.tenant_id = tenant_settings.tenant_id
      AND m.role = 'owner'
  )
);

-- Coupons - tenant members can view, owners/admins can manage
CREATE POLICY "Users can view their tenant coupons"
ON coupons FOR SELECT
USING (
  tenant_id IS NULL OR -- Global coupons
  EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND m.tenant_id = coupons.tenant_id
  )
);

CREATE POLICY "Owners and admins can manage tenant coupons"
ON coupons FOR ALL
USING (
  tenant_id IS NULL OR -- System coupons
  EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND m.tenant_id = coupons.tenant_id
      AND m.role IN ('owner', 'admin')
  )
);

-- Coupon redemptions - tenant members can view
CREATE POLICY "Users can view their tenant coupon redemptions"
ON coupon_redemptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND m.tenant_id = coupon_redemptions.tenant_id
  )
);

-- System can insert coupon redemptions
CREATE POLICY "System can insert coupon redemptions"
ON coupon_redemptions FOR INSERT
WITH CHECK (true);

-- Functions for dunning management
CREATE OR REPLACE FUNCTION get_tenant_payment_failure_stats(tenant_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_failures', COUNT(*),
    'active_failures', COUNT(*) FILTER (WHERE status IN ('pending', 'retrying')),
    'resolved_failures', COUNT(*) FILTER (WHERE status = 'resolved'),
    'abandoned_failures', COUNT(*) FILTER (WHERE status = 'abandoned'),
    'total_amount', COALESCE(SUM(amount), 0),
    'average_resolution_time_hours', COALESCE(
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) 
      FILTER (WHERE status = 'resolved'), 0
    )
  ) INTO result
  FROM payment_failures
  WHERE tenant_id = tenant_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to process due payment retries
CREATE OR REPLACE FUNCTION get_due_payment_retries()
RETURNS SETOF payment_failures AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM payment_failures
  WHERE status = 'pending'
    AND next_retry_date IS NOT NULL
    AND next_retry_date <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get subscription lifecycle analytics
CREATE OR REPLACE FUNCTION get_tenant_subscription_analytics(tenant_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_subscriptions', COUNT(*),
    'active_subscriptions', COUNT(*) FILTER (WHERE status = 'active'),
    'cancelled_subscriptions', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'trialing_subscriptions', COUNT(*) FILTER (WHERE trial_end IS NOT NULL AND trial_end > NOW()),
    'churned_subscriptions', COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_at > NOW() - INTERVAL '30 days'),
    'upgrade_events', (
      SELECT COUNT(*)
      FROM subscription_events se
      JOIN subscription s ON se.subscription_id = s.id
      WHERE s.tenant_id = tenant_uuid 
        AND se.event_type = 'upgraded'
        AND se.created_at > NOW() - INTERVAL '30 days'
    ),
    'mrr', COALESCE(
      SUM(
        CASE 
          WHEN billing_cycle = 'month' THEN amount
          WHEN billing_cycle = 'year' THEN amount / 12
          ELSE 0
        END
      ) FILTER (WHERE status = 'active'), 0
    ),
    'arr', COALESCE(
      SUM(
        CASE 
          WHEN billing_cycle = 'month' THEN amount * 12
          WHEN billing_cycle = 'year' THEN amount
          ELSE 0
        END
      ) FILTER (WHERE status = 'active'), 0
    )
  ) INTO result
  FROM subscription
  WHERE tenant_id = tenant_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insert default tenant settings for existing tenants
INSERT INTO tenant_settings (tenant_id, dunning_config, billing_settings, notification_preferences)
SELECT 
  id,
  '{
    "maxRetryAttempts": 3,
    "retryIntervals": [1, 3, 7],
    "gracePeriod": 14,
    "emailTemplates": {
      "failedPayment": "payment_failed",
      "finalNotice": "payment_final_notice",
      "accountSuspended": "account_suspended",
      "paymentSucceeded": "payment_recovered"
    }
  }'::jsonb,
  '{
    "currency": "USD",
    "timezone": "UTC",
    "invoicePrefix": "INV-",
    "taxRate": 0
  }'::jsonb,
  '{
    "emailNotifications": true,
    "smsNotifications": false,
    "webhookNotifications": false
  }'::jsonb
FROM tenant
WHERE id NOT IN (SELECT tenant_id FROM tenant_settings WHERE tenant_id IS NOT NULL)
ON CONFLICT (tenant_id) DO NOTHING;

COMMENT ON TABLE payment_failures IS 'Tracks payment failures for dunning management and retry logic';
COMMENT ON TABLE subscription_events IS 'Audit log for subscription lifecycle events';
COMMENT ON TABLE cancellation_feedback IS 'Stores user feedback when cancelling subscriptions';
COMMENT ON TABLE scheduled_jobs IS 'Background job queue for subscription and billing tasks';
COMMENT ON TABLE tenant_settings IS 'Tenant-specific configuration for billing and dunning';
COMMENT ON TABLE coupons IS 'Promotional codes and discounts for subscriptions';
COMMENT ON TABLE coupon_redemptions IS 'Tracks when and how coupons are redeemed';

COMMENT ON FUNCTION get_tenant_payment_failure_stats(UUID) IS 'Get comprehensive payment failure statistics for a tenant';
COMMENT ON FUNCTION get_due_payment_retries() IS 'Get all payment failures that are due for retry';
COMMENT ON FUNCTION get_tenant_subscription_analytics(UUID) IS 'Get comprehensive subscription analytics including MRR, ARR, churn';