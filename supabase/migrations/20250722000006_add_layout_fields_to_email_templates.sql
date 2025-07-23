-- Add layout and font customization fields to email_templates table
-- This migration adds missing fields for complete template customization

ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS layout_width TEXT DEFAULT '600',
ADD COLUMN IF NOT EXISTS header_padding TEXT DEFAULT '48',
ADD COLUMN IF NOT EXISTS content_padding TEXT DEFAULT '40',
ADD COLUMN IF NOT EXISTS section_spacing TEXT DEFAULT '32';

-- Update existing templates with default values if columns were just added
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

-- Add comment for documentation
COMMENT ON COLUMN public.email_templates.font_family IS 'Font family for email text (system, inter, poppins, helvetica, georgia)';
COMMENT ON COLUMN public.email_templates.layout_width IS 'Email content width in pixels (560, 600, 640, full)';
COMMENT ON COLUMN public.email_templates.header_padding IS 'Header section padding in pixels (32, 48, 64)';
COMMENT ON COLUMN public.email_templates.content_padding IS 'Content section padding in pixels (24, 40, 56)';
COMMENT ON COLUMN public.email_templates.section_spacing IS 'Spacing between sections in pixels (24, 32, 48)';

-- Verify the fields were added
DO $$
BEGIN
  RAISE NOTICE 'Email template layout fields migration complete.';
  RAISE NOTICE 'Added fields: font_family, layout_width, header_padding, content_padding, section_spacing';
END $$;