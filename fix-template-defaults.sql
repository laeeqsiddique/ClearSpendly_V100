-- Fix template defaults and existing data
-- This script fixes the template_type and tax settings

-- 1. Update existing templates that have the default 'modern' type to 'classic'
--    (unless they were explicitly set to modern)
UPDATE public.invoice_template 
SET template_type = 'classic'
WHERE template_type = 'modern' 
  AND name != 'Modern Clean'  -- Don't change templates that are actually meant to be modern
  AND created_at < NOW() - INTERVAL '1 day'; -- Only change older templates

-- 2. Fix templates where show_tax is true but tax_rate is 0
--    These should have show_tax = false
UPDATE public.invoice_template 
SET show_tax = false
WHERE show_tax = true 
  AND tax_rate = 0.0000;

-- 3. Update the default template_type for new templates
-- Note: This changes the column default for future inserts
ALTER TABLE public.invoice_template 
ALTER COLUMN template_type SET DEFAULT 'classic';

-- 4. Update the default show_tax to false (only show tax when rate > 0)
ALTER TABLE public.invoice_template 
ALTER COLUMN show_tax SET DEFAULT false;

-- 5. Check what templates exist and their current settings
SELECT 
  name,
  template_type,
  show_tax,
  tax_rate,
  tax_label,
  is_default,
  created_at
FROM public.invoice_template 
ORDER BY created_at DESC;