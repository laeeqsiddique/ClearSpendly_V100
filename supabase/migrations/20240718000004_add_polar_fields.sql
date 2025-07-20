-- Add Polar-related fields to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT UNIQUE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_polar_customer_id ON public.tenants(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_polar_subscription_id ON public.tenants(polar_subscription_id);

-- Update existing tenants to have proper subscription fields
UPDATE public.tenants 
SET subscription_status = 'free'
WHERE subscription_status IS NULL;