-- Check if layout fields exist in email_templates table
SELECT 
  column_name, 
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'email_templates'
  AND column_name IN ('font_family', 'header_style', 'layout_width', 'header_padding', 'content_padding', 'section_spacing')
ORDER BY column_name;

-- If no results show up, the fields don't exist and need to be added
-- Expected results: 6 rows showing all layout fields

-- Also check if any templates exist to test with
SELECT 
  id, 
  name,
  template_type,
  font_family,
  header_style,
  layout_width
FROM email_templates 
LIMIT 3;