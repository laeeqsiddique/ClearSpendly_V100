-- Add font_family field to invoice_template table
ALTER TABLE public.invoice_template 
ADD COLUMN IF NOT EXISTS font_family VARCHAR(50) DEFAULT 'font-sans';

-- Update existing templates to have default font
UPDATE public.invoice_template 
SET font_family = COALESCE(font_family, 'font-sans')
WHERE font_family IS NULL;