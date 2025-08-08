-- Create expense_subscription table (separate from billing subscription table)
-- This tracks recurring expense services like Netflix, Spotify, etc.
CREATE TABLE IF NOT EXISTS public.expense_subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Subscription details
  service_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  category VARCHAR(100),
  
  -- Dates
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_charge_date DATE,
  last_charge_date DATE,
  end_date DATE, -- For cancelled subscriptions
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  
  -- Additional info
  notes TEXT,
  payment_method VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT expense_subscription_tenant_service_unique UNIQUE(tenant_id, service_name)
);

-- Create index for performance
CREATE INDEX idx_expense_subscription_tenant_status ON public.expense_subscription(tenant_id, status);

-- Enable RLS
ALTER TABLE public.expense_subscription ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "expense_subscription_select_policy" ON public.expense_subscription
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.membership m
      WHERE m.tenant_id = expense_subscription.tenant_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "expense_subscription_insert_policy" ON public.expense_subscription
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.membership m
      WHERE m.tenant_id = expense_subscription.tenant_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "expense_subscription_update_policy" ON public.expense_subscription
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.membership m
      WHERE m.tenant_id = expense_subscription.tenant_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "expense_subscription_delete_policy" ON public.expense_subscription
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.membership m
      WHERE m.tenant_id = expense_subscription.tenant_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_expense_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Auto-calculate next charge date if not provided
  IF NEW.next_charge_date IS NULL AND NEW.start_date IS NOT NULL THEN
    CASE NEW.frequency
      WHEN 'weekly' THEN
        NEW.next_charge_date = NEW.start_date + INTERVAL '1 week';
      WHEN 'monthly' THEN
        NEW.next_charge_date = NEW.start_date + INTERVAL '1 month';
      WHEN 'quarterly' THEN
        NEW.next_charge_date = NEW.start_date + INTERVAL '3 months';
      WHEN 'yearly' THEN
        NEW.next_charge_date = NEW.start_date + INTERVAL '1 year';
      ELSE
        NEW.next_charge_date = NEW.start_date + INTERVAL '1 month';
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_subscription_updated_at_trigger
  BEFORE INSERT OR UPDATE ON public.expense_subscription
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_subscription_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.expense_subscription IS 'Tracks recurring expense subscriptions (Netflix, Spotify, etc.) separate from billing subscriptions';