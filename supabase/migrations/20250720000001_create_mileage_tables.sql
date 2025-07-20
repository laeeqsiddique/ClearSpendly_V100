-- Mileage tracking database schema
-- Designed for IRS compliance and great UX

-- Main mileage log table
CREATE TABLE IF NOT EXISTS public.mileage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Trip details
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_location TEXT NOT NULL,
  end_location TEXT NOT NULL,
  miles DECIMAL(8,2) NOT NULL CHECK (miles > 0),
  
  -- Business purpose (IRS required)
  purpose TEXT NOT NULL,
  business_purpose_category VARCHAR(50) DEFAULT 'client_visit', -- client_visit, supplies, meeting, etc.
  
  -- Optional details
  notes TEXT,
  receipt_id UUID REFERENCES public.receipt(id), -- Link to related expense
  
  -- Auto-calculated fields
  irs_rate DECIMAL(6,4) NOT NULL DEFAULT 0.6550, -- IRS rate used (will be populated from irs_mileage_rate table)
  deduction_amount DECIMAL(10,2) GENERATED ALWAYS AS (miles * irs_rate) STORED,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mileage templates for frequent trips
CREATE TABLE IF NOT EXISTS public.mileage_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL, -- e.g., "Office to Client A"
  start_location TEXT NOT NULL,
  end_location TEXT NOT NULL,
  typical_miles DECIMAL(8,2) NOT NULL,
  purpose TEXT NOT NULL,
  business_purpose_category VARCHAR(50) DEFAULT 'client_visit',
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mileage_log_tenant_date ON public.mileage_log(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_mileage_log_user ON public.mileage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_template_tenant ON public.mileage_template(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mileage_template_usage ON public.mileage_template(tenant_id, last_used_at DESC NULLS LAST);

-- Enable RLS
ALTER TABLE public.mileage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_template ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's mileage logs" ON public.mileage_log
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert mileage logs for their tenant" ON public.mileage_log
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own mileage logs" ON public.mileage_log
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own mileage logs" ON public.mileage_log
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

-- Template policies
CREATE POLICY "Users can view their tenant's mileage templates" ON public.mileage_template
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage mileage templates for their tenant" ON public.mileage_template
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

-- IRS mileage rates by year (maintainable)
CREATE TABLE IF NOT EXISTS public.irs_mileage_rate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL UNIQUE,
  rate DECIMAL(6,4) NOT NULL CHECK (rate > 0), -- e.g., 0.6550 for 65.5 cents
  effective_date DATE NOT NULL,
  notes TEXT, -- Any additional info about rate changes
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert current and recent IRS rates
INSERT INTO public.irs_mileage_rate (year, rate, effective_date, notes) VALUES
  (2024, 0.6550, '2024-01-01', 'Standard mileage rate for 2024'),
  (2023, 0.6550, '2023-01-01', 'Standard mileage rate for 2023'),
  (2022, 0.5850, '2022-01-01', 'Standard mileage rate for 2022 (first half)'),
  (2021, 0.5600, '2021-01-01', 'Standard mileage rate for 2021')
ON CONFLICT (year) DO NOTHING;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_irs_mileage_rate_year ON public.irs_mileage_rate(year DESC);

-- Enable RLS
ALTER TABLE public.irs_mileage_rate ENABLE ROW LEVEL SECURITY;

-- RLS Policy - rates are public read-only for all authenticated users
CREATE POLICY "IRS rates are publicly readable" ON public.irs_mileage_rate
  FOR SELECT TO authenticated USING (true);

-- Only admin users can modify rates (we'll add admin role later)
CREATE POLICY "Only admins can modify IRS rates" ON public.irs_mileage_rate
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.membership 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Grants
GRANT ALL ON public.mileage_log TO authenticated;
GRANT ALL ON public.mileage_template TO authenticated;
GRANT SELECT ON public.irs_mileage_rate TO authenticated;
GRANT ALL ON public.irs_mileage_rate TO service_role;

-- Function to set IRS rate before inserting mileage log
CREATE OR REPLACE FUNCTION public.set_irs_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- If IRS rate not explicitly set, get current year's rate
  IF NEW.irs_rate = 0.6550 THEN -- Default value, means not explicitly set
    SELECT rate INTO NEW.irs_rate
    FROM public.irs_mileage_rate
    WHERE year = EXTRACT(YEAR FROM NEW.date)
    ORDER BY year DESC
    LIMIT 1;
    
    -- If no rate found for the year, use current year's rate
    IF NEW.irs_rate IS NULL THEN
      SELECT rate INTO NEW.irs_rate
      FROM public.irs_mileage_rate
      WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
      ORDER BY year DESC
      LIMIT 1;
    END IF;
    
    -- Final fallback to 2024 rate
    IF NEW.irs_rate IS NULL THEN
      NEW.irs_rate := 0.6550;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update template usage stats when templates are used
CREATE OR REPLACE FUNCTION public.update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- If this trip matches an existing template, update usage stats
  UPDATE public.mileage_template
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE tenant_id = NEW.tenant_id
    AND start_location = NEW.start_location
    AND end_location = NEW.end_location
    AND purpose = NEW.purpose;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_mileage_template_usage ON public.mileage_log;
DROP TRIGGER IF EXISTS auto_create_update_templates_trigger ON public.mileage_log;
DROP TRIGGER IF EXISTS set_irs_rate_trigger ON public.mileage_log;

-- Set IRS rate before inserting
CREATE TRIGGER set_irs_rate_trigger
  BEFORE INSERT ON public.mileage_log
  FOR EACH ROW EXECUTE FUNCTION public.set_irs_rate();

-- Update template usage after inserting
CREATE TRIGGER update_mileage_template_usage_trigger
  AFTER INSERT ON public.mileage_log
  FOR EACH ROW EXECUTE FUNCTION public.update_template_usage();