-- Create PRIVATE storage bucket for receipt images
-- Run this in your Supabase SQL editor

-- Create the bucket as PRIVATE (secure access only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts', 
  false, -- PRIVATE bucket - requires authentication
  10485760, -- 10MB file size limit per receipt
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']::text[]
);

-- RLS Policies for the private receipts bucket

-- Policy 1: Users can upload to their tenant's folder
CREATE POLICY "Users can upload receipts to their tenant folder"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

-- Policy 2: Users can view receipts from their tenant
CREATE POLICY "Users can view receipts from their tenant"
ON storage.objects FOR SELECT USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

-- Policy 3: Users can update receipts in their tenant
CREATE POLICY "Users can update receipts in their tenant"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

-- Policy 4: Users can delete receipts from their tenant
CREATE POLICY "Users can delete receipts from their tenant"
ON storage.objects FOR DELETE USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

-- Verify the bucket was created as private
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'receipts';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%receipts%';