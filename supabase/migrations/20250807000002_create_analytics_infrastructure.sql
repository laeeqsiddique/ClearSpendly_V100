-- Analytics Infrastructure for ClearSpendly
-- Optimized schema for high-performance financial analytics

-- =====================================================
-- 1. ANALYTICS AGGREGATION TABLES
-- =====================================================

-- Daily aggregations for receipts (expenses)
CREATE TABLE analytics_daily_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_tax DECIMAL(15,2) NOT NULL DEFAULT 0,
  receipt_count INTEGER NOT NULL DEFAULT 0,
  unique_vendor_count INTEGER NOT NULL DEFAULT 0,
  category_breakdown JSONB NOT NULL DEFAULT '{}',
  payment_method_breakdown JSONB NOT NULL DEFAULT '{}',
  tag_breakdown JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, date)
);

-- Daily aggregations for revenue (payments)
CREATE TABLE analytics_daily_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_count INTEGER NOT NULL DEFAULT 0,
  unique_client_count INTEGER NOT NULL DEFAULT 0,
  client_breakdown JSONB NOT NULL DEFAULT '{}',
  payment_method_breakdown JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, date)
);

-- Monthly rollup aggregations
CREATE TABLE analytics_monthly_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_expenses DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_profit DECIMAL(15,2) NOT NULL DEFAULT 0,
  profit_margin DECIMAL(5,2) NOT NULL DEFAULT 0,
  revenue_count INTEGER NOT NULL DEFAULT 0,
  expense_count INTEGER NOT NULL DEFAULT 0,
  unique_clients INTEGER NOT NULL DEFAULT 0,
  unique_vendors INTEGER NOT NULL DEFAULT 0,
  top_categories JSONB NOT NULL DEFAULT '{}',
  top_clients JSONB NOT NULL DEFAULT '{}',
  trend_indicators JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, year, month)
);

-- Subscription analytics aggregations
CREATE TABLE analytics_subscription_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  active_subscriptions INTEGER NOT NULL DEFAULT 0,
  total_monthly_recurring DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_annual_recurring DECIMAL(15,2) NOT NULL DEFAULT 0,
  new_subscriptions INTEGER NOT NULL DEFAULT 0,
  cancelled_subscriptions INTEGER NOT NULL DEFAULT 0,
  upcoming_charges DECIMAL(15,2) NOT NULL DEFAULT 0,
  overdue_charges DECIMAL(15,2) NOT NULL DEFAULT 0,
  category_breakdown JSONB NOT NULL DEFAULT '{}',
  status_breakdown JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, date)
);

-- =====================================================
-- 2. PERFORMANCE INDEXES
-- =====================================================

-- Analytics daily expenses indexes
CREATE INDEX idx_analytics_daily_expenses_tenant_date ON analytics_daily_expenses(tenant_id, date DESC);
CREATE INDEX idx_analytics_daily_expenses_date_range ON analytics_daily_expenses(date) WHERE date >= CURRENT_DATE - INTERVAL '1 year';
CREATE INDEX idx_analytics_daily_expenses_amount ON analytics_daily_expenses(tenant_id, total_amount DESC);

-- Analytics daily revenue indexes  
CREATE INDEX idx_analytics_daily_revenue_tenant_date ON analytics_daily_revenue(tenant_id, date DESC);
CREATE INDEX idx_analytics_daily_revenue_date_range ON analytics_daily_revenue(date) WHERE date >= CURRENT_DATE - INTERVAL '1 year';
CREATE INDEX idx_analytics_daily_revenue_amount ON analytics_daily_revenue(tenant_id, total_amount DESC);

-- Analytics monthly summary indexes
CREATE INDEX idx_analytics_monthly_tenant_period ON analytics_monthly_summary(tenant_id, year DESC, month DESC);
CREATE INDEX idx_analytics_monthly_profit ON analytics_monthly_summary(tenant_id, net_profit DESC);
CREATE INDEX idx_analytics_monthly_revenue ON analytics_monthly_summary(tenant_id, total_revenue DESC);

-- Subscription metrics indexes
CREATE INDEX idx_analytics_subscription_tenant_date ON analytics_subscription_metrics(tenant_id, date DESC);
CREATE INDEX idx_analytics_subscription_mrr ON analytics_subscription_metrics(tenant_id, total_monthly_recurring DESC);

-- Core table performance indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_receipt_analytics ON receipt(tenant_id, receipt_date DESC, total_amount) 
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_receipt_category_analytics ON receipt(tenant_id, category, receipt_date DESC) 
  WHERE deleted_at IS NULL AND category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receipt_vendor_analytics ON receipt(tenant_id, vendor_id, receipt_date DESC) 
  WHERE deleted_at IS NULL;

-- Payment analytics indexes
CREATE INDEX IF NOT EXISTS idx_payment_analytics ON payment(tenant_id, payment_date DESC, amount) 
  WHERE deleted_at IS NULL;

-- Invoice analytics indexes  
CREATE INDEX IF NOT EXISTS idx_invoice_analytics ON invoice(tenant_id, issue_date DESC, total_amount, status)
  WHERE deleted_at IS NULL;

-- Subscription analytics indexes
CREATE INDEX IF NOT EXISTS idx_subscription_analytics ON subscription(tenant_id, status, next_charge_date, amount)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subscription_charges_analytics ON subscription_charge(tenant_id, charge_date DESC, amount, status);

-- =====================================================
-- 3. MATERIALIZED VIEWS FOR COMPLEX ANALYTICS
-- =====================================================

-- Real-time expense insights view
CREATE MATERIALIZED VIEW analytics_expense_insights AS
SELECT 
  r.tenant_id,
  DATE_TRUNC('month', r.receipt_date) as period_month,
  r.category,
  r.payment_method,
  v.name as vendor_name,
  v.category as vendor_category,
  COUNT(*) as transaction_count,
  SUM(r.total_amount) as total_amount,
  AVG(r.total_amount) as avg_amount,
  MIN(r.total_amount) as min_amount,
  MAX(r.total_amount) as max_amount,
  STDDEV(r.total_amount) as amount_stddev
FROM receipt r
LEFT JOIN vendor v ON r.vendor_id = v.id
WHERE r.deleted_at IS NULL 
  AND r.receipt_date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY r.tenant_id, DATE_TRUNC('month', r.receipt_date), r.category, r.payment_method, v.name, v.category;

-- Revenue insights view
CREATE MATERIALIZED VIEW analytics_revenue_insights AS
SELECT 
  p.tenant_id,
  DATE_TRUNC('month', p.payment_date) as period_month,
  c.name as client_name,
  c.industry,
  COUNT(DISTINCT pa.invoice_id) as invoice_count,
  SUM(pa.allocated_amount) as total_revenue,
  AVG(pa.allocated_amount) as avg_payment,
  MIN(pa.allocated_amount) as min_payment,
  MAX(pa.allocated_amount) as max_payment
FROM payment p
JOIN payment_allocation pa ON p.id = pa.payment_id
JOIN invoice i ON pa.invoice_id = i.id
JOIN client c ON i.client_id = c.id
WHERE p.deleted_at IS NULL 
  AND p.payment_date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY p.tenant_id, DATE_TRUNC('month', p.payment_date), c.name, c.industry;

-- Create indexes on materialized views
CREATE INDEX idx_expense_insights_tenant_period ON analytics_expense_insights(tenant_id, period_month DESC);
CREATE INDEX idx_expense_insights_category ON analytics_expense_insights(tenant_id, category, total_amount DESC);
CREATE INDEX idx_revenue_insights_tenant_period ON analytics_revenue_insights(tenant_id, period_month DESC);
CREATE INDEX idx_revenue_insights_client ON analytics_revenue_insights(tenant_id, client_name, total_revenue DESC);

-- =====================================================
-- 4. REAL-TIME UPDATE TRIGGERS
-- =====================================================

-- Function to update daily expense aggregations
CREATE OR REPLACE FUNCTION update_daily_expense_aggregations()
RETURNS TRIGGER AS $$
DECLARE
  target_date DATE;
  category_json JSONB;
  payment_method_json JSONB;
BEGIN
  -- Determine the target date
  target_date := COALESCE(NEW.receipt_date, OLD.receipt_date);
  
  -- Delete existing aggregation for recalculation
  DELETE FROM analytics_daily_expenses 
  WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id) AND date = target_date;
  
  -- Recalculate aggregations for the date
  WITH daily_stats AS (
    SELECT 
      r.tenant_id,
      r.receipt_date as date,
      SUM(r.total_amount) as total_amount,
      SUM(r.tax_amount) as total_tax,
      COUNT(*) as receipt_count,
      COUNT(DISTINCT r.vendor_id) as unique_vendor_count,
      jsonb_object_agg(
        COALESCE(r.category, 'Uncategorized'), 
        SUM(r.total_amount)
      ) FILTER (WHERE r.category IS NOT NULL) as category_breakdown,
      jsonb_object_agg(
        COALESCE(r.payment_method, 'Unknown'), 
        SUM(r.total_amount)
      ) FILTER (WHERE r.payment_method IS NOT NULL) as payment_method_breakdown
    FROM receipt r
    WHERE r.tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
      AND r.receipt_date = target_date
      AND r.deleted_at IS NULL
    GROUP BY r.tenant_id, r.receipt_date
  )
  INSERT INTO analytics_daily_expenses (
    tenant_id, date, total_amount, total_tax, receipt_count, 
    unique_vendor_count, category_breakdown, payment_method_breakdown
  )
  SELECT * FROM daily_stats;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for real-time updates
CREATE TRIGGER trigger_update_expense_aggregations
  AFTER INSERT OR UPDATE OR DELETE ON receipt
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_expense_aggregations();

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_expense_insights;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_revenue_insights;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. ANALYTICS HELPER FUNCTIONS
-- =====================================================

-- Function to get trend analysis with statistical significance
CREATE OR REPLACE FUNCTION get_trend_analysis(
  p_tenant_id UUID,
  p_metric_type TEXT, -- 'revenue', 'expenses', 'profit'
  p_periods INTEGER DEFAULT 12
)
RETURNS TABLE (
  period_label TEXT,
  period_date DATE,
  value DECIMAL(15,2),
  trend_direction TEXT,
  trend_strength DECIMAL(5,2),
  is_significant BOOLEAN,
  comparison_previous DECIMAL(5,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  base_query TEXT;
BEGIN
  CASE p_metric_type
    WHEN 'revenue' THEN
      RETURN QUERY
      WITH monthly_data AS (
        SELECT 
          TO_CHAR(period_month, 'YYYY-MM') as period_label,
          period_month::DATE as period_date,
          SUM(total_revenue) as value
        FROM analytics_revenue_insights
        WHERE tenant_id = p_tenant_id 
          AND period_month >= CURRENT_DATE - (p_periods || ' months')::INTERVAL
        GROUP BY period_month
        ORDER BY period_month
      ),
      trend_calc AS (
        SELECT 
          *,
          LAG(value, 1) OVER (ORDER BY period_date) as prev_value,
          CASE 
            WHEN LAG(value, 1) OVER (ORDER BY period_date) > 0 THEN
              ((value - LAG(value, 1) OVER (ORDER BY period_date)) / LAG(value, 1) OVER (ORDER BY period_date)) * 100
            ELSE 0
          END as comparison_previous
        FROM monthly_data
      )
      SELECT 
        tc.period_label,
        tc.period_date,
        tc.value,
        CASE 
          WHEN tc.comparison_previous > 5 THEN 'up'
          WHEN tc.comparison_previous < -5 THEN 'down'
          ELSE 'stable'
        END as trend_direction,
        ABS(tc.comparison_previous) as trend_strength,
        ABS(tc.comparison_previous) > 10 as is_significant,
        tc.comparison_previous
      FROM trend_calc tc;
      
    WHEN 'expenses' THEN
      RETURN QUERY
      WITH monthly_data AS (
        SELECT 
          TO_CHAR(period_month, 'YYYY-MM') as period_label,
          period_month::DATE as period_date,
          SUM(total_amount) as value
        FROM analytics_expense_insights
        WHERE tenant_id = p_tenant_id 
          AND period_month >= CURRENT_DATE - (p_periods || ' months')::INTERVAL
        GROUP BY period_month
        ORDER BY period_month
      ),
      trend_calc AS (
        SELECT 
          *,
          LAG(value, 1) OVER (ORDER BY period_date) as prev_value,
          CASE 
            WHEN LAG(value, 1) OVER (ORDER BY period_date) > 0 THEN
              ((value - LAG(value, 1) OVER (ORDER BY period_date)) / LAG(value, 1) OVER (ORDER BY period_date)) * 100
            ELSE 0
          END as comparison_previous
        FROM monthly_data
      )
      SELECT 
        tc.period_label,
        tc.period_date,
        tc.value,
        CASE 
          WHEN tc.comparison_previous > 5 THEN 'up'
          WHEN tc.comparison_previous < -5 THEN 'down'
          ELSE 'stable'
        END as trend_direction,
        ABS(tc.comparison_previous) as trend_strength,
        ABS(tc.comparison_previous) > 10 as is_significant,
        tc.comparison_previous
      FROM trend_calc tc;
  END CASE;
END;
$$;

-- Schedule regular refresh of materialized views (requires pg_cron extension)
-- SELECT cron.schedule('refresh_analytics', '0 2 * * *', 'SELECT refresh_analytics_views();');