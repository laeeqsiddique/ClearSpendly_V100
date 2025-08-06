-- Create complete storage system with all required buckets
-- Migration: 20250806000002_create_complete_storage_system

-- Create receipts bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts', 
  false, -- PRIVATE bucket - requires authentication
  25485760, -- 25MB file size limit per receipt
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 25485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']::text[];

-- Create invoices bucket for invoice attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false, -- PRIVATE bucket
  26214400, -- 25MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create profiles bucket for user profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  false, -- PRIVATE bucket
  2097152, -- 2MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Update logos bucket (if exists) or create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true, -- PUBLIC bucket for logos that need to be displayed
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']::text[];

-- RLS Policies for receipts bucket
DROP POLICY IF EXISTS "Users can upload receipts to their tenant folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view receipts from their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can update receipts in their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete receipts from their tenant" ON storage.objects;

CREATE POLICY "Tenant receipts upload policy"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

CREATE POLICY "Tenant receipts select policy"
ON storage.objects FOR SELECT USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

CREATE POLICY "Tenant receipts update policy"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

CREATE POLICY "Tenant receipts delete policy"
ON storage.objects FOR DELETE USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

-- RLS Policies for invoices bucket
CREATE POLICY "Tenant invoices upload policy"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

CREATE POLICY "Tenant invoices select policy"
ON storage.objects FOR SELECT USING (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

CREATE POLICY "Tenant invoices update policy"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

CREATE POLICY "Tenant invoices delete policy"
ON storage.objects FOR DELETE USING (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

-- RLS Policies for profiles bucket
CREATE POLICY "Tenant profiles upload policy"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

CREATE POLICY "Tenant profiles select policy"
ON storage.objects FOR SELECT USING (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

CREATE POLICY "Tenant profiles update policy"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

CREATE POLICY "Tenant profiles delete policy"
ON storage.objects FOR DELETE USING (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

-- RLS Policies for logos bucket (public read, tenant-restricted write)
CREATE POLICY "Public logos read policy"
ON storage.objects FOR SELECT USING (
  bucket_id = 'logos'
);

CREATE POLICY "Tenant logos upload policy"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

CREATE POLICY "Tenant logos update policy"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

CREATE POLICY "Tenant logos delete policy"
ON storage.objects FOR DELETE USING (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

-- Add storage URL columns to existing tables
-- Receipt table - add file storage URL
ALTER TABLE receipt 
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS storage_url TEXT,
ADD COLUMN IF NOT EXISTS file_metadata JSONB DEFAULT '{}';

-- Invoice table - add attachment storage URL
ALTER TABLE invoice 
ADD COLUMN IF NOT EXISTS attachment_storage_path TEXT,
ADD COLUMN IF NOT EXISTS attachment_storage_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_metadata JSONB DEFAULT '{}';

-- User table - add profile image storage
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS profile_image_storage_path TEXT,
ADD COLUMN IF NOT EXISTS profile_image_storage_url TEXT,
ADD COLUMN IF NOT EXISTS profile_image_metadata JSONB DEFAULT '{}';

-- Tenant table - add logo storage (update existing columns if needed)
ALTER TABLE tenant 
ADD COLUMN IF NOT EXISTS logo_storage_path TEXT,
ADD COLUMN IF NOT EXISTS logo_storage_url TEXT,
ADD COLUMN IF NOT EXISTS logo_metadata JSONB DEFAULT '{}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_receipt_storage_path ON receipt(storage_path);
CREATE INDEX IF NOT EXISTS idx_invoice_attachment_storage_path ON invoice(attachment_storage_path);
CREATE INDEX IF NOT EXISTS idx_user_profile_storage_path ON "user"(profile_image_storage_path);
CREATE INDEX IF NOT EXISTS idx_tenant_logo_storage_path ON tenant(logo_storage_path);

-- Create function to clean up storage when records are deleted
CREATE OR REPLACE FUNCTION cleanup_storage_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called by triggers to clean up associated storage files
  -- We'll store the storage paths in a cleanup table for background processing
  
  -- Create cleanup table if it doesn't exist
  CREATE TABLE IF NOT EXISTS storage_cleanup_queue (
    id SERIAL PRIMARY KEY,
    bucket_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
  );
  
  -- Add entries to cleanup queue based on table
  IF TG_TABLE_NAME = 'receipt' AND OLD.storage_path IS NOT NULL THEN
    INSERT INTO storage_cleanup_queue (bucket_name, file_path)
    VALUES ('receipts', OLD.storage_path);
  ELSIF TG_TABLE_NAME = 'invoice' AND OLD.attachment_storage_path IS NOT NULL THEN
    INSERT INTO storage_cleanup_queue (bucket_name, file_path)
    VALUES ('invoices', OLD.attachment_storage_path);
  ELSIF TG_TABLE_NAME = 'user' AND OLD.profile_image_storage_path IS NOT NULL THEN
    INSERT INTO storage_cleanup_queue (bucket_name, file_path)
    VALUES ('profiles', OLD.profile_image_storage_path);
  ELSIF TG_TABLE_NAME = 'tenant' AND OLD.logo_storage_path IS NOT NULL THEN
    INSERT INTO storage_cleanup_queue (bucket_name, file_path)
    VALUES ('logos', OLD.logo_storage_path);
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic cleanup
CREATE TRIGGER receipt_storage_cleanup
  AFTER DELETE ON receipt
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_storage_on_delete();

CREATE TRIGGER invoice_storage_cleanup
  AFTER DELETE ON invoice
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_storage_on_delete();

CREATE TRIGGER user_storage_cleanup
  AFTER DELETE ON "user"
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_storage_on_delete();

CREATE TRIGGER tenant_storage_cleanup
  AFTER DELETE ON tenant
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_storage_on_delete();

-- Create function to get storage statistics
CREATE OR REPLACE FUNCTION get_tenant_storage_stats(tenant_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  receipt_count INTEGER;
  invoice_count INTEGER;
  profile_count INTEGER;
  logo_count INTEGER;
BEGIN
  -- Count files with storage paths
  SELECT COUNT(*) INTO receipt_count 
  FROM receipt 
  WHERE tenant_id = tenant_uuid AND storage_path IS NOT NULL;
  
  SELECT COUNT(*) INTO invoice_count 
  FROM invoice 
  WHERE tenant_id = tenant_uuid AND attachment_storage_path IS NOT NULL;
  
  SELECT COUNT(*) INTO profile_count 
  FROM "user" u
  JOIN membership m ON u.id = m.user_id
  WHERE m.tenant_id = tenant_uuid AND u.profile_image_storage_path IS NOT NULL;
  
  SELECT COUNT(*) INTO logo_count 
  FROM tenant 
  WHERE id = tenant_uuid AND logo_storage_path IS NOT NULL;
  
  RETURN jsonb_build_object(
    'receipts', receipt_count,
    'invoices', invoice_count,
    'profiles', profile_count,
    'logos', logo_count,
    'total', receipt_count + invoice_count + profile_count + logo_count
  );
END;
$$ LANGUAGE plpgsql;

-- Create storage cleanup queue table
CREATE TABLE IF NOT EXISTS storage_cleanup_queue (
  id SERIAL PRIMARY KEY,
  bucket_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_storage_cleanup_queue_processed ON storage_cleanup_queue(processed, created_at);

COMMENT ON TABLE storage_cleanup_queue IS 'Queue for cleaning up orphaned storage files when database records are deleted';