-- Run this SQL in your Supabase SQL Editor to fix the branding fields issue
-- This adds the missing fields to the 'tenant' table (not 'tenants')

ALTER TABLE public.tenant 
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
CREATE INDEX IF NOT EXISTS idx_tenant_business_name ON public.tenant(business_name);

-- Verify the fields were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tenant'
AND column_name IN (
    'logo_url', 'business_name', 'tagline', 'website', 'phone',
    'address_line1', 'address_line2', 'city', 'state', 'postal_code',
    'country', 'email_from_name', 'reply_to_email', 'email_signature',
    'brand_primary_color', 'brand_secondary_color'
)
ORDER BY column_name;