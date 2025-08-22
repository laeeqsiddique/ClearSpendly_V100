-- Billing Operations Tables
-- Migration: 20250819000002_billing_operations_tables

-- Create billing invoices table
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal')),
  provider_invoice_id TEXT,
  invoice_number TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  due_date TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,
  description TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  tax DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, invoice_number)
);

-- Create payment receipts table
CREATE TABLE IF NOT EXISTS payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  subscription_id UUID,
  invoice_id UUID REFERENCES billing_invoices(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal')),
  provider_payment_id TEXT NOT NULL,
  receipt_number TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL,
  payment_date TIMESTAMP NOT NULL,
  description TEXT,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, receipt_number),
  UNIQUE(provider, provider_payment_id)
);

-- Create notification log table
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT,
  text_content TEXT,
  variables JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  sent_at TIMESTAMP DEFAULT NOW(),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create test results table for payment testing
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  action TEXT NOT NULL,
  scenario_id TEXT,
  results JSONB NOT NULL,
  success_rate DECIMAL(5,2) NOT NULL,
  total_duration INTEGER NOT NULL, -- milliseconds
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create cron execution log table
CREATE TABLE IF NOT EXISTS cron_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  results JSONB NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- Create billing analytics materialized view for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS billing_analytics AS
SELECT 
  tenant_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as invoice_count,
  COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
  COUNT(*) FILTER (WHERE status = 'open') as open_count,
  COUNT(*) FILTER (WHERE status = 'void') as void_count,
  SUM(amount) as total_amount,
  SUM(amount) FILTER (WHERE status = 'paid') as paid_amount,
  AVG(amount) as avg_amount,
  AVG(EXTRACT(EPOCH FROM (paid_at - created_at))/86400) FILTER (WHERE status = 'paid') as avg_payment_days
FROM billing_invoices
GROUP BY tenant_id, DATE_TRUNC('month', created_at);

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_analytics_tenant_month 
ON billing_analytics(tenant_id, month);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_invoices_tenant_id ON billing_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_subscription_id ON billing_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_due_date ON billing_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_provider_invoice_id ON billing_invoices(provider_invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_created_at ON billing_invoices(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_tenant_id ON payment_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_subscription_id ON payment_receipts(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_invoice_id ON payment_receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_provider ON payment_receipts(provider);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment_date ON payment_receipts(payment_date);

CREATE INDEX IF NOT EXISTS idx_notification_log_tenant_id ON notification_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_template_id ON notification_log(template_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at);

CREATE INDEX IF NOT EXISTS idx_test_results_tenant_id ON test_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_type ON test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at);

CREATE INDEX IF NOT EXISTS idx_cron_execution_log_job_type ON cron_execution_log(job_type);
CREATE INDEX IF NOT EXISTS idx_cron_execution_log_executed_at ON cron_execution_log(executed_at);

-- Create updated_at triggers
CREATE TRIGGER update_billing_invoices_updated_at
    BEFORE UPDATE ON billing_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_execution_log ENABLE ROW LEVEL SECURITY;

-- Billing invoices - tenant members can view, owners/admins can manage
CREATE POLICY "Users can view their tenant billing invoices"
ON billing_invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND m.tenant_id = billing_invoices.tenant_id
  )
);

CREATE POLICY "Owners and admins can manage billing invoices"
ON billing_invoices FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND m.tenant_id = billing_invoices.tenant_id
      AND m.role IN ('owner', 'admin')
  )
);

-- System can insert invoices (for automated billing)
CREATE POLICY "System can insert billing invoices"
ON billing_invoices FOR INSERT
WITH CHECK (true);

-- Payment receipts - tenant members can view
CREATE POLICY "Users can view their tenant payment receipts"
ON payment_receipts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND m.tenant_id = payment_receipts.tenant_id
  )
);

-- System can insert receipts (for payment processing)
CREATE POLICY "System can insert payment receipts"
ON payment_receipts FOR INSERT
WITH CHECK (true);

-- Notification log - owners can view
CREATE POLICY "Owners can view notification log"
ON notification_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND m.tenant_id = notification_log.tenant_id
      AND m.role = 'owner'
  )
);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON notification_log FOR INSERT
WITH CHECK (true);

-- Test results - users can view their own tests
CREATE POLICY "Users can view their own test results"
ON test_results FOR SELECT
USING (
  user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
  AND EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = user_id
      AND m.tenant_id = test_results.tenant_id
      AND m.role IN ('owner', 'admin')
  )
);

-- System/admins can insert test results
CREATE POLICY "Admins can manage test results"
ON test_results FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM membership m
    WHERE m.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND m.tenant_id = test_results.tenant_id
      AND m.role IN ('owner', 'admin')
  )
);

-- Cron execution log - system access only (no user access needed)
CREATE POLICY "System access for cron execution log"
ON cron_execution_log FOR ALL
USING (true);

-- Functions for billing operations
CREATE OR REPLACE FUNCTION get_tenant_billing_summary(tenant_uuid UUID, start_date DATE DEFAULT NULL, end_date DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  date_filter_start DATE;
  date_filter_end DATE;
BEGIN
  -- Set default date range if not provided (last 12 months)
  date_filter_start := COALESCE(start_date, CURRENT_DATE - INTERVAL '12 months');
  date_filter_end := COALESCE(end_date, CURRENT_DATE);
  
  SELECT jsonb_build_object(
    'total_invoices', COUNT(*),
    'paid_invoices', COUNT(*) FILTER (WHERE status = 'paid'),
    'open_invoices', COUNT(*) FILTER (WHERE status = 'open'),
    'overdue_invoices', COUNT(*) FILTER (WHERE status = 'open' AND due_date < CURRENT_DATE),
    'total_revenue', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
    'outstanding_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'open'), 0),
    'average_invoice_value', COALESCE(AVG(amount), 0),
    'average_payment_time', COALESCE(
      AVG(EXTRACT(EPOCH FROM (paid_at - created_at))/86400) FILTER (WHERE status = 'paid'), 0
    ),
    'monthly_revenue', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'month', TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM'),
          'revenue', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
          'invoice_count', COUNT(*)
        ) ORDER BY DATE_TRUNC('month', created_at)
      )
      FROM billing_invoices bi2
      WHERE bi2.tenant_id = tenant_uuid
        AND bi2.created_at::date BETWEEN date_filter_start AND date_filter_end
      GROUP BY DATE_TRUNC('month', created_at)
    )
  ) INTO result
  FROM billing_invoices
  WHERE tenant_id = tenant_uuid
    AND created_at::date BETWEEN date_filter_start AND date_filter_end;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get payment method usage statistics
CREATE OR REPLACE FUNCTION get_payment_method_stats(tenant_uuid UUID, start_date DATE DEFAULT NULL, end_date DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  date_filter_start DATE;
  date_filter_end DATE;
BEGIN
  date_filter_start := COALESCE(start_date, CURRENT_DATE - INTERVAL '12 months');
  date_filter_end := COALESCE(end_date, CURRENT_DATE);
  
  SELECT jsonb_object_agg(
    payment_method,
    jsonb_build_object(
      'count', count,
      'total_amount', total_amount,
      'average_amount', average_amount,
      'percentage', ROUND((count::decimal / SUM(count) OVER() * 100), 2)
    )
  ) INTO result
  FROM (
    SELECT 
      payment_method,
      COUNT(*) as count,
      SUM(amount) as total_amount,
      AVG(amount) as average_amount
    FROM payment_receipts
    WHERE tenant_id = tenant_uuid
      AND payment_date::date BETWEEN date_filter_start AND date_filter_end
    GROUP BY payment_method
  ) payment_stats;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to refresh billing analytics materialized view
CREATE OR REPLACE FUNCTION refresh_billing_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY billing_analytics;
END;
$$ LANGUAGE plpgsql;

-- Schedule the materialized view refresh (if pg_cron is available)
-- This would typically be done outside the migration in production
-- SELECT cron.schedule('refresh-billing-analytics', '0 2 * * *', 'SELECT refresh_billing_analytics();');

COMMENT ON TABLE billing_invoices IS 'Generated invoices for subscriptions and one-time payments';
COMMENT ON TABLE payment_receipts IS 'Receipts for completed payments with customer details';
COMMENT ON TABLE notification_log IS 'Audit log of all payment and billing notifications sent';
COMMENT ON TABLE test_results IS 'Results from automated payment testing scenarios';
COMMENT ON TABLE cron_execution_log IS 'Log of cron job executions for payment processing tasks';

COMMENT ON FUNCTION get_tenant_billing_summary(UUID, DATE, DATE) IS 'Get comprehensive billing summary with revenue and payment analytics';
COMMENT ON FUNCTION get_payment_method_stats(UUID, DATE, DATE) IS 'Get payment method usage statistics and trends';
COMMENT ON FUNCTION refresh_billing_analytics() IS 'Refresh the billing analytics materialized view for up-to-date reporting';