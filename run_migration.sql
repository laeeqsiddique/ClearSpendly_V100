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