-- Rollback Migration for Complete Branding System
-- Use this only if you need to revert the branding system changes

-- =====================================================
-- PART 1: Remove RLS policies for logos bucket
-- =====================================================

DROP POLICY IF EXISTS "Users can view their tenant logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can delete logos" ON storage.objects;

-- =====================================================
-- PART 2: Remove logos storage bucket
-- =====================================================

-- First, delete all objects in the bucket
DELETE FROM storage.objects WHERE bucket_id = 'logos';

-- Then delete the bucket
DELETE FROM storage.buckets WHERE id = 'logos';

-- =====================================================
-- PART 3: Remove branding fields from tenant table
-- =====================================================

-- Drop the index first
DROP INDEX IF EXISTS idx_tenant_business_name;

-- Remove branding columns from tenant table
ALTER TABLE public.tenant 
DROP COLUMN IF EXISTS logo_url,
DROP COLUMN IF EXISTS business_name,
DROP COLUMN IF EXISTS tagline,
DROP COLUMN IF EXISTS website,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS address_line1,
DROP COLUMN IF EXISTS address_line2,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS state,
DROP COLUMN IF EXISTS postal_code,
DROP COLUMN IF EXISTS country,
DROP COLUMN IF EXISTS email_from_name,
DROP COLUMN IF EXISTS reply_to_email,
DROP COLUMN IF EXISTS email_signature,
DROP COLUMN IF EXISTS brand_primary_color,
DROP COLUMN IF EXISTS brand_secondary_color;

-- =====================================================
-- PART 4: Remove logo fields from email_templates
-- =====================================================

ALTER TABLE public.email_templates
DROP COLUMN IF EXISTS logo_url,
DROP COLUMN IF EXISTS logo_width,
DROP COLUMN IF EXISTS logo_position;

-- =====================================================
-- PART 5: Remove helper function
-- =====================================================

DROP FUNCTION IF EXISTS migrate_base64_logos_to_storage();

-- =====================================================
-- Rollback complete message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Branding System Rollback Complete!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'All branding-related fields and storage have been removed.';
  RAISE NOTICE '';
END $$;