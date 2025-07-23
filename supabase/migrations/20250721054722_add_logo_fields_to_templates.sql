-- Add ALL missing logo and company fields to invoice_template table
ALTER TABLE public.invoice_template 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS logo_position VARCHAR(10) DEFAULT 'left',
ADD COLUMN IF NOT EXISTS logo_size VARCHAR(10) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS company_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_email VARCHAR(255);

-- Update existing templates to have default logo settings
UPDATE public.invoice_template 
SET 
  logo_position = COALESCE(logo_position, 'left'),
  logo_size = COALESCE(logo_size, 'medium'),
  company_name = COALESCE(company_name, 'Your Company Name'),
  company_address = COALESCE(company_address, '123 Your Street\nYour City, State 12345'),
  company_phone = COALESCE(company_phone, '(555) 123-4567'),
  company_email = COALESCE(company_email, 'contact@yourcompany.com');