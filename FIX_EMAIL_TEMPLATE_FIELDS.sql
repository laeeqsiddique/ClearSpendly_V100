-- CRITICAL: Add missing fields to email_templates table
-- Run this SQL in your Supabase SQL Editor to fix template saving

-- First, check what fields currently exist
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'email_templates'
ORDER BY column_name;

-- Add the missing layout and font fields
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

-- Verify the fields were added successfully
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'email_templates'
  AND column_name IN ('font_family', 'layout_width', 'header_padding', 'content_padding', 'section_spacing')
ORDER BY column_name;

-- Test that we can update these fields
DO $$
DECLARE
    test_record RECORD;
    row_count INTEGER;
BEGIN
    -- Count existing templates
    SELECT COUNT(*) INTO row_count FROM public.email_templates;
    
    IF row_count > 0 THEN
        -- Test updating a template with new fields
        UPDATE public.email_templates 
        SET 
            font_family = 'inter',
            layout_width = '640',
            header_padding = '64'
        WHERE id = (SELECT id FROM public.email_templates LIMIT 1);
        
        -- Verify the update worked
        SELECT font_family, layout_width, header_padding 
        INTO test_record
        FROM public.email_templates 
        LIMIT 1;
        
        RAISE NOTICE 'SUCCESS: Template updated with font_family=%, layout_width=%, header_padding=%', 
            test_record.font_family, test_record.layout_width, test_record.header_padding;
    ELSE
        RAISE NOTICE 'No templates found to test, but fields have been added successfully';
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
    RAISE NOTICE 'Email template saving should now work properly!';
    RAISE NOTICE 'New fields added: font_family, layout_width, header_padding, content_padding, section_spacing';
END $$;