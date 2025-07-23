-- Analytics functions for the dashboard
CREATE OR REPLACE FUNCTION get_monthly_revenue(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  month DATE,
  revenue DECIMAL(12,2),
  invoice_count INTEGER,
  avg_invoice DECIMAL(12,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', p.payment_date)::DATE as month,
    COALESCE(SUM(pa.allocated_amount), 0)::DECIMAL(12,2) as revenue,
    COUNT(DISTINCT i.id)::INTEGER as invoice_count,
    COALESCE(AVG(i.total_amount), 0)::DECIMAL(12,2) as avg_invoice
  FROM payment p
  JOIN payment_allocation pa ON p.id = pa.payment_id
  JOIN invoice i ON pa.invoice_id = i.id
  WHERE i.tenant_id = p_tenant_id
    AND p.payment_date >= p_start_date
    AND p.payment_date <= p_end_date
  GROUP BY DATE_TRUNC('month', p.payment_date)
  ORDER BY month DESC;
END;
$$;

-- Function to get expense breakdown by category for analytics
CREATE OR REPLACE FUNCTION get_expense_breakdown(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category TEXT,
  total_amount DECIMAL(12,2),
  transaction_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(r.category, 'Uncategorized') as category,
    COALESCE(SUM(r.total_amount), 0)::DECIMAL(12,2) as total_amount,
    COUNT(r.id)::INTEGER as transaction_count
  FROM receipt r
  WHERE r.tenant_id = p_tenant_id
    AND r.receipt_date >= p_start_date
    AND r.receipt_date <= p_end_date
  GROUP BY COALESCE(r.category, 'Uncategorized')
  ORDER BY total_amount DESC;
END;
$$;

-- Function to get basic P&L data
CREATE OR REPLACE FUNCTION get_basic_pnl(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_revenue DECIMAL(12,2),
  total_expenses DECIMAL(12,2),
  net_profit DECIMAL(12,2),
  profit_margin DECIMAL(5,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_revenue DECIMAL(12,2) := 0;
  v_expenses DECIMAL(12,2) := 0;
  v_profit DECIMAL(12,2) := 0;
  v_margin DECIMAL(5,2) := 0;
BEGIN
  -- Calculate total revenue from payments
  SELECT COALESCE(SUM(pa.allocated_amount), 0)
  INTO v_revenue
  FROM payment p
  JOIN payment_allocation pa ON p.id = pa.payment_id
  JOIN invoice i ON pa.invoice_id = i.id
  WHERE i.tenant_id = p_tenant_id
    AND p.payment_date >= p_start_date
    AND p.payment_date <= p_end_date;

  -- Calculate total expenses from receipts
  SELECT COALESCE(SUM(r.total_amount), 0)
  INTO v_expenses
  FROM receipt r
  WHERE r.tenant_id = p_tenant_id
    AND r.receipt_date >= p_start_date
    AND r.receipt_date <= p_end_date;

  -- Calculate profit and margin
  v_profit := v_revenue - v_expenses;
  v_margin := CASE 
    WHEN v_revenue > 0 THEN (v_profit / v_revenue * 100)
    ELSE 0 
  END;

  RETURN QUERY
  SELECT v_revenue, v_expenses, v_profit, v_margin;
END;
$$;