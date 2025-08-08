-- Add PayPal support fields to email_templates table
-- These fields control PayPal payment options in database email templates

-- Add PayPal configuration fields
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS enable_paypal_payments BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS paypal_button_text TEXT DEFAULT 'Pay with PayPal',
ADD COLUMN IF NOT EXISTS paypal_instructions_text TEXT DEFAULT 'Pay securely using PayPal:',
ADD COLUMN IF NOT EXISTS show_paypal_email BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_paypal_me_link BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS paypal_button_color TEXT DEFAULT '#0070ba';

-- Add comments for clarity
COMMENT ON COLUMN email_templates.enable_paypal_payments IS 'Controls whether PayPal payment options are shown in emails';
COMMENT ON COLUMN email_templates.paypal_button_text IS 'Customizable text for PayPal payment button';
COMMENT ON COLUMN email_templates.paypal_instructions_text IS 'Text shown above PayPal payment options';
COMMENT ON COLUMN email_templates.show_paypal_email IS 'Show PayPal email payment instructions';
COMMENT ON COLUMN email_templates.show_paypal_me_link IS 'Show PayPal.me quick payment button';
COMMENT ON COLUMN email_templates.paypal_button_color IS 'Hex color code for PayPal button styling';

-- Update existing templates to maintain compatibility (no breaking changes)
-- PayPal is disabled by default, so existing templates continue working unchanged