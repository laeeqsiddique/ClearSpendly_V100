-- Add PayPal payment link support to email templates
-- This migration adds fields to control when and how PayPal payment options are shown in email templates

-- Add PayPal configuration fields to email_templates table
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS enable_paypal_payments BOOLEAN DEFAULT false;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS paypal_button_text TEXT DEFAULT 'Pay with PayPal';
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS paypal_instructions_text TEXT DEFAULT 'You can also pay using PayPal:';
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS show_paypal_email BOOLEAN DEFAULT true;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS show_paypal_me_link BOOLEAN DEFAULT true;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS paypal_button_color TEXT DEFAULT '#0070ba';

-- Add comments for documentation
COMMENT ON COLUMN email_templates.enable_paypal_payments IS 'Whether to show PayPal payment options in emails generated from this template';
COMMENT ON COLUMN email_templates.paypal_button_text IS 'Text to display on PayPal payment buttons';
COMMENT ON COLUMN email_templates.paypal_instructions_text IS 'Instructional text to display above PayPal payment options';
COMMENT ON COLUMN email_templates.show_paypal_email IS 'Whether to show PayPal email payment instructions';
COMMENT ON COLUMN email_templates.show_paypal_me_link IS 'Whether to show PayPal.me payment button/link';
COMMENT ON COLUMN email_templates.paypal_button_color IS 'Color for PayPal payment buttons (hex color)';

-- Update existing templates to maintain backward compatibility
-- Set enable_paypal_payments to false for all existing templates to preserve current behavior
UPDATE email_templates 
SET enable_paypal_payments = false 
WHERE enable_paypal_payments IS NULL;

-- Create an index for performance when filtering templates by PayPal settings
CREATE INDEX IF NOT EXISTS idx_email_templates_paypal_enabled 
ON email_templates(tenant_id, template_type, enable_paypal_payments) 
WHERE enable_paypal_payments = true;