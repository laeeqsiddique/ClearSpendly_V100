-- Create tenant-specific IRS mileage rates table
CREATE TABLE IF NOT EXISTS public.irs_mileage_rate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  year INTEGER NOT NULL,
  rate DECIMAL(6,4) NOT NULL CHECK (rate > 0), -- e.g., 0.6550 for 65.5 cents
  effective_date DATE NOT NULL,
  notes TEXT, -- Any additional info about rate changes
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, year)
);

-- Insert default IRS rates for existing tenants
INSERT INTO public.irs_mileage_rate (tenant_id, user_id, year, rate, effective_date, notes)
SELECT 
  t.id as tenant_id,
  m.user_id,
  generate_series(2021, 2024) as year,
  CASE 
    WHEN generate_series(2021, 2024) = 2024 THEN 0.6550
    WHEN generate_series(2021, 2024) = 2023 THEN 0.6550  
    WHEN generate_series(2021, 2024) = 2022 THEN 0.5850
    WHEN generate_series(2021, 2024) = 2021 THEN 0.5600
  END as rate,
  CASE 
    WHEN generate_series(2021, 2024) = 2024 THEN '2024-01-01'::date
    WHEN generate_series(2021, 2024) = 2023 THEN '2023-01-01'::date
    WHEN generate_series(2021, 2024) = 2022 THEN '2022-01-01'::date  
    WHEN generate_series(2021, 2024) = 2021 THEN '2021-01-01'::date
  END as effective_date,
  CASE 
    WHEN generate_series(2021, 2024) = 2024 THEN 'Standard mileage rate for 2024'
    WHEN generate_series(2021, 2024) = 2023 THEN 'Standard mileage rate for 2023'
    WHEN generate_series(2021, 2024) = 2022 THEN 'Standard mileage rate for 2022'
    WHEN generate_series(2021, 2024) = 2021 THEN 'Standard mileage rate for 2021'
  END as notes
FROM public.tenant t
JOIN public.membership m ON t.id = m.tenant_id
WHERE m.role = 'owner'
ON CONFLICT (tenant_id, year) DO NOTHING;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_irs_mileage_rate_tenant_year ON public.irs_mileage_rate(tenant_id, year DESC);
CREATE INDEX IF NOT EXISTS idx_irs_mileage_rate_user ON public.irs_mileage_rate(user_id);

-- Enable RLS
ALTER TABLE public.irs_mileage_rate ENABLE ROW LEVEL SECURITY;

-- RLS Policies - tenant members can read their tenant's rates
CREATE POLICY "Users can view their tenant's IRS rates" ON public.irs_mileage_rate
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
  );

-- Users can manage IRS rates for their tenant
CREATE POLICY "Users can manage IRS rates for their tenant" ON public.irs_mileage_rate
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.membership WHERE user_id = auth.uid())
  );

-- Grants
GRANT ALL ON public.irs_mileage_rate TO authenticated;

-- Update the set_irs_rate function to work with tenant-specific rates
CREATE OR REPLACE FUNCTION public.set_irs_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- If IRS rate not explicitly set, get current year's rate for this tenant
  IF NEW.irs_rate = 0.6550 THEN -- Default value, means not explicitly set
    SELECT rate INTO NEW.irs_rate
    FROM public.irs_mileage_rate
    WHERE tenant_id = NEW.tenant_id 
    AND year = EXTRACT(YEAR FROM NEW.date)
    ORDER BY year DESC
    LIMIT 1;
    
    -- If no rate found for the year, use current year's rate for this tenant
    IF NEW.irs_rate IS NULL THEN
      SELECT rate INTO NEW.irs_rate
      FROM public.irs_mileage_rate
      WHERE tenant_id = NEW.tenant_id
      AND year = EXTRACT(YEAR FROM CURRENT_DATE)
      ORDER BY year DESC
      LIMIT 1;
    END IF;
    
    -- Final fallback to default 2024 rate
    IF NEW.irs_rate IS NULL THEN
      NEW.irs_rate := 0.6550;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;