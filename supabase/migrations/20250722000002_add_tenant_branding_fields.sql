-- Add branding fields to tenant table
-- This allows storing business logo and branding settings

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United States',
ADD COLUMN IF NOT EXISTS email_from_name TEXT,
ADD COLUMN IF NOT EXISTS reply_to_email TEXT,
ADD COLUMN IF NOT EXISTS email_signature TEXT,
ADD COLUMN IF NOT EXISTS brand_primary_color TEXT DEFAULT '#667eea',
ADD COLUMN IF NOT EXISTS brand_secondary_color TEXT DEFAULT '#764ba2';

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_tenants_business_name ON public.tenants(business_name);

-- Update RLS policy if needed
-- The existing RLS policies should already cover these new fields