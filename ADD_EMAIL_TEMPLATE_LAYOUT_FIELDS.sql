-- Run this SQL in your Supabase SQL Editor to add layout fields to email templates
-- This adds font selection and layout customization options

-- Add new fields to email_templates table
ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS layout_width TEXT DEFAULT '600',
ADD COLUMN IF NOT EXISTS header_padding TEXT DEFAULT '48',
ADD COLUMN IF NOT EXISTS content_padding TEXT DEFAULT '40',
ADD COLUMN IF NOT EXISTS section_spacing TEXT DEFAULT '32';

-- Update existing templates with default values
UPDATE public.email_templates
SET 
  font_family = COALESCE(font_family, 'system'),
  layout_width = COALESCE(layout_width, '600'),
  header_padding = COALESCE(header_padding, '48'),
  content_padding = COALESCE(content_padding, '40'),
  section_spacing = COALESCE(section_spacing, '32')
WHERE 
  font_family IS NULL 
  OR layout_width IS NULL 
  OR header_padding IS NULL
  OR content_padding IS NULL
  OR section_spacing IS NULL;

-- Verify the fields were added
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'email_templates'
  AND column_name IN ('font_family', 'layout_width', 'header_padding', 'content_padding', 'section_spacing')
ORDER BY column_name;

-- Expected output:
-- column_name      | data_type | column_default
-- -----------------+-----------+----------------
-- content_padding  | text      | '40'::text
-- font_family      | text      | 'system'::text
-- header_padding   | text      | '48'::text
-- layout_width     | text      | '600'::text
-- section_spacing  | text      | '32'::text