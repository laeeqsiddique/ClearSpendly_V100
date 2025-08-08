-- Advanced Analytics Functions for ClearSpendly
-- High-performance SQL functions for complex financial analytics

-- =====================================================
-- 1. COMPREHENSIVE DASHBOARD ANALYTICS
-- =====================================================

-- Enhanced dashboard metrics with period comparisons and forecasting
CREATE OR REPLACE FUNCTION get_comprehensive_dashboard_metrics(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_compare_periods INTEGER DEFAULT 1
)
RETURNS TABLE (
  -- Current period metrics
  current_revenue DECIMAL(15,2),
  current_expenses DECIMAL(15,2),
  current_profit DECIMAL(15,2),
  current_margin DECIMAL(5,2),
  current_receipt_count INTEGER,
  current_invoice_count INTEGER,
  current_active_subscriptions INTEGER,
  
  -- Previous period metrics
  previous_revenue DECIMAL(15,2),
  previous_expenses DECIMAL(15,2),
  previous_profit DECIMAL(15,2),
  previous_margin DECIMAL(5,2),
  
  -- Growth metrics
  revenue_growth DECIMAL(5,2),
  expense_growth DECIMAL(5,2),
  profit_growth DECIMAL(5,2),
  
  -- Trend indicators
  revenue_trend TEXT,
  expense_trend TEXT,
  profit_trend TEXT,
  
  -- Forecasting
  projected_monthly_revenue DECIMAL(15,2),
  projected_monthly_expenses DECIMAL(15,2),
  
  -- Additional insights
  avg_receipt_amount DECIMAL(10,2),
  avg_invoice_amount DECIMAL(10,2),
  outstanding_invoices_amount DECIMAL(15,2),
  overdue_invoices_count INTEGER,
  
  -- Subscription metrics
  monthly_recurring_revenue DECIMAL(15,2),
  annual_recurring_revenue DECIMAL(15,2),
  subscription_churn_rate DECIMAL(5,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date DATE := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE));
  v_end_date DATE := COALESCE(p_end_date, CURRENT_DATE);
  v_period_length INTEGER;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
  
  -- Current period variables
  v_current_revenue DECIMAL(15,2) := 0;
  v_current_expenses DECIMAL(15,2) := 0;
  v_current_receipt_count INTEGER := 0;
  v_current_invoice_count INTEGER := 0;
  
  -- Previous period variables
  v_previous_revenue DECIMAL(15,2) := 0;
  v_previous_expenses DECIMAL(15,2) := 0;
  
  -- Other variables
  v_outstanding_amount DECIMAL(15,2) := 0;
  v_overdue_count INTEGER := 0;
  v_active_subscriptions INTEGER := 0;
  v_mrr DECIMAL(15,2) := 0;
  v_arr DECIMAL(15,2) := 0;
BEGIN
  -- Calculate period length and previous period dates
  v_period_length := v_end_date - v_start_date;
  v_prev_start_date := v_start_date - (v_period_length * p_compare_periods);
  v_prev_end_date := v_start_date - 1;
  
  -- Get current period revenue
  SELECT COALESCE(SUM(pa.allocated_amount), 0), COUNT(DISTINCT i.id)
  INTO v_current_revenue, v_current_invoice_count
  FROM payment p
  JOIN payment_allocation pa ON p.id = pa.payment_id
  JOIN invoice i ON pa.invoice_id = i.id
  WHERE i.tenant_id = p_tenant_id
    AND p.payment_date BETWEEN v_start_date AND v_end_date
    AND p.deleted_at IS NULL;
    
  -- Get current period expenses
  SELECT COALESCE(SUM(r.total_amount), 0), COUNT(*)
  INTO v_current_expenses, v_current_receipt_count
  FROM receipt r
  WHERE r.tenant_id = p_tenant_id
    AND r.receipt_date BETWEEN v_start_date AND v_end_date
    AND r.deleted_at IS NULL;
    
  -- Get previous period metrics
  SELECT COALESCE(SUM(pa.allocated_amount), 0)
  INTO v_previous_revenue
  FROM payment p
  JOIN payment_allocation pa ON p.id = pa.payment_id
  JOIN invoice i ON pa.invoice_id = i.id
  WHERE i.tenant_id = p_tenant_id
    AND p.payment_date BETWEEN v_prev_start_date AND v_prev_end_date
    AND p.deleted_at IS NULL;
    
  SELECT COALESCE(SUM(r.total_amount), 0)
  INTO v_previous_expenses
  FROM receipt r
  WHERE r.tenant_id = p_tenant_id
    AND r.receipt_date BETWEEN v_prev_start_date AND v_prev_end_date
    AND r.deleted_at IS NULL;
    
  -- Get outstanding and overdue invoices
  SELECT 
    COALESCE(SUM(balance_due), 0),
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'paid')
  INTO v_outstanding_amount, v_overdue_count
  FROM invoice
  WHERE tenant_id = p_tenant_id 
    AND balance_due > 0 
    AND deleted_at IS NULL;
    
  -- Get subscription metrics
  SELECT 
    COUNT(*) FILTER (WHERE status = 'active'),
    SUM(CASE 
      WHEN frequency = 'monthly' THEN amount
      WHEN frequency = 'yearly' THEN amount / 12
      WHEN frequency = 'quarterly' THEN amount / 3
      ELSE amount
    END) FILTER (WHERE status = 'active')
  INTO v_active_subscriptions, v_mrr
  FROM subscription
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;
  
  v_arr := v_mrr * 12;
  
  RETURN QUERY
  SELECT 
    -- Current metrics
    v_current_revenue,
    v_current_expenses,
    v_current_revenue - v_current_expenses as current_profit,
    CASE WHEN v_current_revenue > 0 THEN ((v_current_revenue - v_current_expenses) / v_current_revenue * 100) ELSE 0 END as current_margin,
    v_current_receipt_count,
    v_current_invoice_count,
    v_active_subscriptions,
    
    -- Previous metrics
    v_previous_revenue,
    v_previous_expenses,
    v_previous_revenue - v_previous_expenses as previous_profit,
    CASE WHEN v_previous_revenue > 0 THEN ((v_previous_revenue - v_previous_expenses) / v_previous_revenue * 100) ELSE 0 END as previous_margin,
    
    -- Growth calculations
    CASE WHEN v_previous_revenue > 0 THEN ((v_current_revenue - v_previous_revenue) / v_previous_revenue * 100) ELSE 0 END as revenue_growth,
    CASE WHEN v_previous_expenses > 0 THEN ((v_current_expenses - v_previous_expenses) / v_previous_expenses * 100) ELSE 0 END as expense_growth,
    CASE WHEN (v_previous_revenue - v_previous_expenses) != 0 THEN (((v_current_revenue - v_current_expenses) - (v_previous_revenue - v_previous_expenses)) / ABS(v_previous_revenue - v_previous_expenses) * 100) ELSE 0 END as profit_growth,
    
    -- Trends
    CASE 
      WHEN v_previous_revenue = 0 AND v_current_revenue > 0 THEN 'up'
      WHEN v_previous_revenue > 0 AND ((v_current_revenue - v_previous_revenue) / v_previous_revenue) > 0.05 THEN 'up'
      WHEN v_previous_revenue > 0 AND ((v_current_revenue - v_previous_revenue) / v_previous_revenue) < -0.05 THEN 'down'
      ELSE 'stable'
    END as revenue_trend,
    CASE 
      WHEN v_previous_expenses = 0 AND v_current_expenses > 0 THEN 'up'
      WHEN v_previous_expenses > 0 AND ((v_current_expenses - v_previous_expenses) / v_previous_expenses) > 0.05 THEN 'up'
      WHEN v_previous_expenses > 0 AND ((v_current_expenses - v_previous_expenses) / v_previous_expenses) < -0.05 THEN 'down'
      ELSE 'stable'
    END as expense_trend,
    CASE 
      WHEN (v_current_revenue - v_current_expenses) > (v_previous_revenue - v_previous_expenses) THEN 'up'
      WHEN (v_current_revenue - v_current_expenses) < (v_previous_revenue - v_previous_expenses) THEN 'down'
      ELSE 'stable'
    END as profit_trend,
    
    -- Projections (simple linear projection based on current period)
    (v_current_revenue / v_period_length * 30) as projected_monthly_revenue,
    (v_current_expenses / v_period_length * 30) as projected_monthly_expenses,
    
    -- Additional insights
    CASE WHEN v_current_receipt_count > 0 THEN (v_current_expenses / v_current_receipt_count) ELSE 0 END as avg_receipt_amount,
    CASE WHEN v_current_invoice_count > 0 THEN (v_current_revenue / v_current_invoice_count) ELSE 0 END as avg_invoice_amount,
    v_outstanding_amount,
    v_overdue_count,
    
    -- Subscription metrics
    v_mrr,
    v_arr,
    0.00 as subscription_churn_rate; -- TODO: Calculate based on cancelled subscriptions
END;
$$;

-- =====================================================
-- 2. ADVANCED SEGMENTATION ANALYTICS  
-- =====================================================

-- Customer/Client segmentation analysis
CREATE OR REPLACE FUNCTION get_client_segmentation_analytics(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_industry TEXT,
  segment TEXT, -- 'high_value', 'medium_value', 'low_value', 'at_risk', 'new'
  total_revenue DECIMAL(15,2),
  invoice_count INTEGER,
  avg_invoice_amount DECIMAL(10,2),
  days_since_last_invoice INTEGER,
  payment_behavior TEXT, -- 'excellent', 'good', 'slow', 'problematic'
  avg_payment_days DECIMAL(5,1),
  outstanding_amount DECIMAL(15,2),
  lifetime_value DECIMAL(15,2),
  growth_rate DECIMAL(5,2),
  risk_score INTEGER -- 1-10 scale
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date DATE := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE));
  v_end_date DATE := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
  RETURN QUERY
  WITH client_metrics AS (
    SELECT 
      c.id,
      c.name,
      c.industry,
      -- Current period revenue
      COALESCE(SUM(pa.allocated_amount) FILTER (WHERE p.payment_date BETWEEN v_start_date AND v_end_date), 0) as period_revenue,
      COUNT(DISTINCT i.id) FILTER (WHERE i.issue_date BETWEEN v_start_date AND v_end_date) as period_invoices,
      -- Lifetime metrics
      COALESCE(SUM(pa.allocated_amount), 0) as lifetime_revenue,
      COUNT(DISTINCT i.id) as lifetime_invoices,
      -- Payment behavior
      AVG(p.payment_date - i.due_date) as avg_payment_delay,
      MAX(i.issue_date) as last_invoice_date,
      SUM(i.balance_due) FILTER (WHERE i.balance_due > 0) as outstanding_balance,
      -- Previous period for growth calculation
      COALESCE(SUM(pa.allocated_amount) FILTER (WHERE p.payment_date BETWEEN v_start_date - INTERVAL '1 year' AND v_end_date - INTERVAL '1 year'), 0) as previous_year_revenue
    FROM client c
    LEFT JOIN invoice i ON c.id = i.client_id AND c.tenant_id = i.tenant_id
    LEFT JOIN payment_allocation pa ON i.id = pa.invoice_id
    LEFT JOIN payment p ON pa.payment_id = p.id
    WHERE c.tenant_id = p_tenant_id AND c.deleted_at IS NULL
    GROUP BY c.id, c.name, c.industry
  ),
  segmented_clients AS (
    SELECT 
      *,
      CASE 
        WHEN period_invoices = 0 THEN 0
        ELSE period_revenue / period_invoices
      END as avg_invoice,
      CASE 
        WHEN last_invoice_date IS NULL THEN 999
        ELSE CURRENT_DATE - last_invoice_date
      END as days_since_last,
      CASE
        WHEN previous_year_revenue > 0 THEN ((period_revenue - previous_year_revenue) / previous_year_revenue * 100)
        ELSE 0
      END as growth_rate_calc
    FROM client_metrics
  )
  SELECT 
    sc.id,
    sc.name,
    sc.industry,
    -- Segmentation logic
    CASE 
      WHEN sc.lifetime_revenue = 0 THEN 'new'
      WHEN sc.lifetime_revenue > 50000 AND sc.period_revenue > 10000 THEN 'high_value'
      WHEN sc.lifetime_revenue > 20000 AND sc.period_revenue > 5000 THEN 'medium_value'
      WHEN sc.days_since_last > 90 AND sc.lifetime_revenue > 1000 THEN 'at_risk'
      ELSE 'low_value'
    END as segment,
    sc.period_revenue,
    sc.period_invoices,
    sc.avg_invoice,
    sc.days_since_last,
    -- Payment behavior
    CASE 
      WHEN sc.avg_payment_delay <= 0 THEN 'excellent'
      WHEN sc.avg_payment_delay <= 7 THEN 'good'
      WHEN sc.avg_payment_delay <= 30 THEN 'slow'
      ELSE 'problematic'
    END as payment_behavior,
    COALESCE(sc.avg_payment_delay, 0),
    COALESCE(sc.outstanding_balance, 0),
    sc.lifetime_revenue,
    sc.growth_rate_calc,
    -- Risk score (1-10, higher = more risk)
    CASE 
      WHEN sc.days_since_last > 180 THEN 9
      WHEN sc.days_since_last > 90 THEN 7
      WHEN sc.avg_payment_delay > 60 THEN 6
      WHEN sc.outstanding_balance > sc.avg_invoice * 2 THEN 5
      WHEN sc.growth_rate_calc < -50 THEN 4
      ELSE 2
    END as risk_score
  FROM segmented_clients sc
  ORDER BY sc.lifetime_revenue DESC;
END;
$$;

-- =====================================================
-- 3. EXPENSE ANALYTICS WITH ANOMALY DETECTION
-- =====================================================

-- Advanced expense analysis with statistical anomaly detection
CREATE OR REPLACE FUNCTION get_expense_analytics_with_anomalies(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_anomaly_threshold DECIMAL DEFAULT 2.0 -- Standard deviations for anomaly detection
)
RETURNS TABLE (
  category TEXT,
  vendor_name TEXT,
  total_amount DECIMAL(15,2),
  transaction_count INTEGER,
  avg_amount DECIMAL(10,2),
  median_amount DECIMAL(10,2),
  std_deviation DECIMAL(10,2),
  min_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  trend_direction TEXT,
  trend_strength DECIMAL(5,2),
  anomaly_count INTEGER,
  anomaly_details JSONB,
  spending_pattern TEXT, -- 'consistent', 'increasing', 'decreasing', 'volatile'
  seasonality_factor DECIMAL(5,2),
  projected_monthly DECIMAL(15,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date DATE := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE));
  v_end_date DATE := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
  RETURN QUERY
  WITH expense_stats AS (
    SELECT 
      COALESCE(r.category, 'Uncategorized') as category,
      COALESCE(v.name, 'Unknown Vendor') as vendor_name,
      SUM(r.total_amount) as total_amount,
      COUNT(*) as transaction_count,
      AVG(r.total_amount) as avg_amount,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.total_amount) as median_amount,
      STDDEV(r.total_amount) as std_deviation,
      MIN(r.total_amount) as min_amount,
      MAX(r.total_amount) as max_amount,
      -- Collect individual amounts for anomaly detection
      ARRAY_AGG(r.total_amount ORDER BY r.receipt_date) as amounts,
      ARRAY_AGG(r.receipt_date ORDER BY r.receipt_date) as dates
    FROM receipt r
    LEFT JOIN vendor v ON r.vendor_id = v.id
    WHERE r.tenant_id = p_tenant_id
      AND r.receipt_date BETWEEN v_start_date AND v_end_date
      AND r.deleted_at IS NULL
    GROUP BY COALESCE(r.category, 'Uncategorized'), COALESCE(v.name, 'Unknown Vendor')
    HAVING COUNT(*) >= 3 -- Need enough data for meaningful statistics
  ),
  expense_analysis AS (
    SELECT 
      *,
      -- Anomaly detection: find amounts more than threshold standard deviations from mean
      (
        SELECT COUNT(*)
        FROM UNNEST(amounts) as amount
        WHERE ABS(amount - avg_amount) > (p_anomaly_threshold * COALESCE(std_deviation, 0))
      ) as anomaly_count,
      -- Trend calculation (simple linear regression slope)
      CASE 
        WHEN array_length(amounts, 1) >= 3 THEN
          (
            SELECT 
              CASE 
                WHEN var_x = 0 THEN 0
                ELSE covar_xy / var_x
              END
            FROM (
              SELECT 
                SUM((row_number - avg_x) * (amount - avg_amount)) as covar_xy,
                SUM(POWER(row_number - avg_x, 2)) as var_x
              FROM (
                SELECT 
                  UNNEST(amounts) as amount,
                  ROW_NUMBER() OVER () as row_number,
                  AVG(ROW_NUMBER() OVER ()) OVER () as avg_x,
                  es.avg_amount
                FROM expense_stats es
              ) trend_data
            ) trend_calc
          )
        ELSE 0
      END as trend_slope
    FROM expense_stats es
  )
  SELECT 
    ea.category,
    ea.vendor_name,
    ea.total_amount,
    ea.transaction_count,
    ea.avg_amount,
    ea.median_amount,
    COALESCE(ea.std_deviation, 0),
    ea.min_amount,
    ea.max_amount,
    -- Trend direction
    CASE 
      WHEN ea.trend_slope > 5 THEN 'increasing'
      WHEN ea.trend_slope < -5 THEN 'decreasing'
      ELSE 'stable'
    END,
    ABS(ea.trend_slope) as trend_strength,
    ea.anomaly_count,
    -- Anomaly details as JSON
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'amount', amount,
          'deviation', ABS(amount - ea.avg_amount),
          'severity', 
          CASE 
            WHEN ABS(amount - ea.avg_amount) > (3 * COALESCE(ea.std_deviation, 1)) THEN 'high'
            WHEN ABS(amount - ea.avg_amount) > (2 * COALESCE(ea.std_deviation, 1)) THEN 'medium'
            ELSE 'low'
          END
        )
      )
      FROM UNNEST(ea.amounts) as amount
      WHERE ABS(amount - ea.avg_amount) > (p_anomaly_threshold * COALESCE(ea.std_deviation, 0))
    ) as anomaly_details,
    -- Spending pattern
    CASE 
      WHEN COALESCE(ea.std_deviation, 0) = 0 THEN 'consistent'
      WHEN (COALESCE(ea.std_deviation, 0) / NULLIF(ea.avg_amount, 0)) > 0.5 THEN 'volatile'
      WHEN ea.trend_slope > 10 THEN 'increasing'
      WHEN ea.trend_slope < -10 THEN 'decreasing'
      ELSE 'consistent'
    END,
    -- Simple seasonality factor (could be enhanced with more sophisticated analysis)
    1.0 as seasonality_factor,
    -- Monthly projection
    ea.total_amount / NULLIF((v_end_date - v_start_date), 0) * 30 as projected_monthly
  FROM expense_analysis ea
  ORDER BY ea.total_amount DESC;
END;
$$;

-- =====================================================
-- 4. SUBSCRIPTION ANALYTICS AND FORECASTING
-- =====================================================

-- Comprehensive subscription analytics with churn prediction
CREATE OR REPLACE FUNCTION get_subscription_analytics(
  p_tenant_id UUID
)
RETURNS TABLE (
  total_active_subscriptions INTEGER,
  monthly_recurring_revenue DECIMAL(15,2),
  annual_recurring_revenue DECIMAL(15,2),
  average_subscription_value DECIMAL(10,2),
  churn_rate DECIMAL(5,2),
  growth_rate DECIMAL(5,2),
  upcoming_renewals_30_days INTEGER,
  upcoming_renewals_amount DECIMAL(15,2),
  at_risk_subscriptions INTEGER,
  at_risk_amount DECIMAL(15,2),
  subscription_health_score DECIMAL(5,2),
  category_breakdown JSONB,
  status_breakdown JSONB,
  payment_method_breakdown JSONB,
  projected_3_month_mrr DECIMAL(15,2),
  projected_6_month_mrr DECIMAL(15,2),
  projected_12_month_mrr DECIMAL(15,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_mrr DECIMAL(15,2) := 0;
  v_previous_mrr DECIMAL(15,2) := 0;
  v_active_count INTEGER := 0;
  v_churned_count INTEGER := 0;
  v_new_count INTEGER := 0;
BEGIN
  -- Calculate current MRR and active subscriptions
  SELECT 
    COUNT(*) FILTER (WHERE status = 'active'),
    SUM(CASE 
      WHEN frequency = 'monthly' THEN amount
      WHEN frequency = 'yearly' THEN amount / 12
      WHEN frequency = 'quarterly' THEN amount / 3
      WHEN frequency = 'weekly' THEN amount * 4.33
      WHEN frequency = 'custom' AND custom_frequency_days IS NOT NULL THEN amount * 30.0 / custom_frequency_days
      ELSE amount
    END) FILTER (WHERE status = 'active')
  INTO v_active_count, v_current_mrr
  FROM subscription
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;
  
  -- Calculate previous month MRR for growth rate
  SELECT 
    SUM(CASE 
      WHEN frequency = 'monthly' THEN amount
      WHEN frequency = 'yearly' THEN amount / 12
      WHEN frequency = 'quarterly' THEN amount / 3
      WHEN frequency = 'weekly' THEN amount * 4.33
      WHEN frequency = 'custom' AND custom_frequency_days IS NOT NULL THEN amount * 30.0 / custom_frequency_days
      ELSE amount
    END)
  INTO v_previous_mrr
  FROM subscription
  WHERE tenant_id = p_tenant_id 
    AND deleted_at IS NULL
    AND (
      (status = 'active') OR 
      (status = 'cancelled' AND end_date >= CURRENT_DATE - INTERVAL '30 days')
    )
    AND created_at <= CURRENT_DATE - INTERVAL '30 days';
  
  -- Count churned subscriptions (last 30 days)
  SELECT COUNT(*)
  INTO v_churned_count
  FROM subscription
  WHERE tenant_id = p_tenant_id
    AND status IN ('cancelled', 'expired')
    AND updated_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Count new subscriptions (last 30 days)  
  SELECT COUNT(*)
  INTO v_new_count
  FROM subscription
  WHERE tenant_id = p_tenant_id
    AND status = 'active'
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  RETURN QUERY
  WITH subscription_metrics AS (
    SELECT 
      -- Basic metrics
      v_active_count as active_subs,
      v_current_mrr as current_mrr,
      v_current_mrr * 12 as current_arr,
      CASE WHEN v_active_count > 0 THEN v_current_mrr / v_active_count ELSE 0 END as avg_sub_value,
      
      -- Churn and growth rates
      CASE 
        WHEN (v_active_count + v_churned_count) > 0 
        THEN (v_churned_count::DECIMAL / (v_active_count + v_churned_count) * 100)
        ELSE 0 
      END as churn_rate,
      CASE 
        WHEN v_previous_mrr > 0 
        THEN ((v_current_mrr - v_previous_mrr) / v_previous_mrr * 100)
        ELSE 0 
      END as growth_rate,
      
      -- Upcoming renewals (next 30 days)
      COUNT(*) FILTER (WHERE next_charge_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as upcoming_renewals,
      SUM(amount) FILTER (WHERE next_charge_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as upcoming_amount,
      
      -- At-risk subscriptions (no successful charge in 60+ days)
      COUNT(*) FILTER (WHERE 
        status = 'active' 
        AND (last_charge_date IS NULL OR last_charge_date < CURRENT_DATE - INTERVAL '60 days')
      ) as at_risk_count,
      SUM(CASE 
        WHEN frequency = 'monthly' THEN amount
        WHEN frequency = 'yearly' THEN amount / 12
        WHEN frequency = 'quarterly' THEN amount / 3
        ELSE amount
      END) FILTER (WHERE 
        status = 'active' 
        AND (last_charge_date IS NULL OR last_charge_date < CURRENT_DATE - INTERVAL '60 days')
      ) as at_risk_amount,
      
      -- Category breakdown
      jsonb_object_agg(
        COALESCE(category, 'Uncategorized'),
        category_count
      ) as category_breakdown,
      
      -- Status breakdown
      jsonb_object_agg(
        status,
        status_count
      ) as status_breakdown,
      
      -- Payment method breakdown
      jsonb_object_agg(
        COALESCE(payment_method, 'Unknown'),
        payment_method_count
      ) as payment_method_breakdown
      
    FROM subscription s
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as category_count
      FROM subscription s2 
      WHERE s2.tenant_id = s.tenant_id 
        AND s2.category = s.category 
        AND s2.deleted_at IS NULL
    ) cc ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as status_count
      FROM subscription s3
      WHERE s3.tenant_id = s.tenant_id 
        AND s3.status = s.status 
        AND s3.deleted_at IS NULL
    ) sc ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as payment_method_count
      FROM subscription s4
      WHERE s4.tenant_id = s.tenant_id 
        AND s4.payment_method = s.payment_method 
        AND s4.deleted_at IS NULL
    ) pmc ON true
    WHERE s.tenant_id = p_tenant_id AND s.deleted_at IS NULL
    GROUP BY ()
  )
  SELECT 
    sm.active_subs,
    sm.current_mrr,
    sm.current_arr,
    sm.avg_sub_value,
    sm.churn_rate,
    sm.growth_rate,
    sm.upcoming_renewals,
    sm.upcoming_amount,
    sm.at_risk_count,
    sm.at_risk_amount,
    
    -- Health score (0-100)
    CASE 
      WHEN sm.churn_rate = 0 AND sm.growth_rate > 0 THEN 100
      WHEN sm.churn_rate <= 2 AND sm.growth_rate >= 0 THEN 90
      WHEN sm.churn_rate <= 5 AND sm.growth_rate >= -2 THEN 75
      WHEN sm.churn_rate <= 10 AND sm.growth_rate >= -5 THEN 60
      WHEN sm.churn_rate <= 15 THEN 40
      ELSE 20
    END as health_score,
    
    sm.category_breakdown,
    sm.status_breakdown,
    sm.payment_method_breakdown,
    
    -- Simple MRR projections (could be enhanced with ML models)
    sm.current_mrr * (1 + sm.growth_rate / 100) * 3 as projected_3m_mrr,
    sm.current_mrr * (1 + sm.growth_rate / 100) * 6 as projected_6m_mrr,
    sm.current_mrr * (1 + sm.growth_rate / 100) * 12 as projected_12m_mrr
    
  FROM subscription_metrics sm;
END;
$$;