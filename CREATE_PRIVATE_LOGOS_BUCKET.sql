-- Create PRIVATE storage bucket for company logos
-- This ensures logos are only accessible to authenticated users

-- Create the bucket as PRIVATE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  false, -- PRIVATE bucket - requires authentication
  2097152, -- 2MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = false, -- Ensure it's private
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- RLS Policies for the private logos bucket

-- Allow authenticated users to view logos from their tenant
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

-- Allow authenticated users to upload logos if they are owner/admin
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

-- Allow authenticated users to update logos if they are owner/admin
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

-- Allow authenticated users to delete logos if they are owner/admin
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

-- Verify the bucket was created as private
SELECT id, name, public FROM storage.buckets WHERE id = 'logos';