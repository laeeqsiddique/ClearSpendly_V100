-- Complete Branding System Migration
-- This migration sets up the complete branding system including:
-- 1. Tenant branding fields
-- 2. Private storage bucket for logos
-- 3. RLS policies for secure access

-- =====================================================
-- PART 1: Add branding fields to tenant table
-- =====================================================

-- Add branding columns to the tenant table (not tenants)
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

-- =====================================================
-- PART 2: Create private storage bucket for logos
-- =====================================================

-- Create private logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  false, -- PRIVATE bucket
  2097152, -- 2MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- =====================================================
-- PART 3: RLS policies for logos bucket
-- =====================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their tenant logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their tenant logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their tenant logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their tenant logo" ON storage.objects;
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;

-- Policy: Allow authenticated users to view logos from their tenant only
CREATE POLICY "Users can view their tenant logos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.user_id = auth.uid()
    AND m.tenant_id::text = SPLIT_PART(name, '/', 1)
  )
);

-- Policy: Allow owners and admins to upload logos for their tenant
CREATE POLICY "Owners and admins can upload logos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
    AND m.tenant_id::text = SPLIT_PART(name, '/', 1)
  )
);

-- Policy: Allow owners and admins to update logos for their tenant
CREATE POLICY "Owners and admins can update logos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
    AND m.tenant_id::text = SPLIT_PART(name, '/', 1)
  )
);

-- Policy: Allow owners and admins to delete logos for their tenant
CREATE POLICY "Owners and admins can delete logos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
    AND m.tenant_id::text = SPLIT_PART(name, '/', 1)
  )
);

-- =====================================================
-- PART 4: Update email templates to use tenant branding
-- =====================================================

-- Add logo-related fields to email_templates if they don't exist
ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS logo_width INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS logo_position TEXT DEFAULT 'center' CHECK (logo_position IN ('left', 'center', 'right'));

-- =====================================================
-- PART 5: Migration helpers and verification
-- =====================================================

-- Function to help migrate existing base64 logos to storage (optional, for manual migration)
CREATE OR REPLACE FUNCTION migrate_base64_logos_to_storage()
RETURNS TABLE (
  tenant_id UUID,
  status TEXT,
  message TEXT
) AS $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT id, logo_url 
    FROM public.tenant 
    WHERE logo_url IS NOT NULL 
    AND logo_url LIKE 'data:image/%'
  LOOP
    RETURN QUERY
    SELECT 
      tenant_record.id,
      'base64_found'::TEXT,
      'Tenant has base64 logo that needs migration to storage bucket'::TEXT;
  END LOOP;
  
  -- Also check for any external URLs
  FOR tenant_record IN 
    SELECT id, logo_url 
    FROM public.tenant 
    WHERE logo_url IS NOT NULL 
    AND logo_url LIKE 'http%'
  LOOP
    RETURN QUERY
    SELECT 
      tenant_record.id,
      'external_url'::TEXT,
      'Tenant has external URL logo'::TEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 6: Verification queries
-- =====================================================

-- Verify tenant table has all branding fields
DO $$
BEGIN
  RAISE NOTICE 'Verifying tenant branding fields...';
  
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenant'
    AND column_name IN (
      'logo_url', 'business_name', 'tagline', 'website', 'phone',
      'address_line1', 'address_line2', 'city', 'state', 'postal_code',
      'country', 'email_from_name', 'reply_to_email', 'email_signature',
      'brand_primary_color', 'brand_secondary_color'
    )
    HAVING COUNT(*) = 16
  ) THEN
    RAISE NOTICE '✓ All branding fields successfully added to tenant table';
  ELSE
    RAISE WARNING '✗ Some branding fields may be missing from tenant table';
  END IF;
END $$;

-- Verify logos bucket exists and is private
DO $$
DECLARE
  bucket_info RECORD;
BEGIN
  SELECT * INTO bucket_info
  FROM storage.buckets 
  WHERE id = 'logos';
  
  IF FOUND THEN
    IF bucket_info.public = false THEN
      RAISE NOTICE '✓ Logos bucket exists and is private';
    ELSE
      RAISE WARNING '✗ Logos bucket exists but is PUBLIC - security risk!';
    END IF;
  ELSE
    RAISE WARNING '✗ Logos bucket does not exist';
  END IF;
END $$;

-- =====================================================
-- PART 7: Grant necessary permissions
-- =====================================================

-- Ensure authenticated users can access storage
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- =====================================================
-- Migration complete message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Branding System Migration Complete!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test logo upload functionality';
  RAISE NOTICE '2. Verify existing logos still display correctly';
  RAISE NOTICE '3. Check that only authorized users can access logos';
  RAISE NOTICE '4. Consider migrating any base64 logos to storage';
  RAISE NOTICE '';
  RAISE NOTICE 'To check for base64 logos that need migration:';
  RAISE NOTICE 'SELECT * FROM migrate_base64_logos_to_storage();';
  RAISE NOTICE '';
END $$;