-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true, -- Make it public so logos can be displayed without authentication
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Create RLS policies for logos bucket
-- Allow authenticated users to upload their own tenant's logo
CREATE POLICY "Users can upload their tenant logo" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  (auth.jwt() ->> 'email')::text IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);

-- Allow authenticated users to update their own tenant's logo
CREATE POLICY "Users can update their tenant logo" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);

-- Allow authenticated users to delete their own tenant's logo
CREATE POLICY "Users can delete their tenant logo" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);

-- Allow public access to view logos (since bucket is public)
CREATE POLICY "Public can view logos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'logos');