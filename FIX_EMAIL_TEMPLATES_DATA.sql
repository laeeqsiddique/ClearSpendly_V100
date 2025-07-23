-- Run this SQL in your Supabase Dashboard > SQL Editor
-- This will check if email templates exist and create default ones if needed

-- First, let's check if we have any email templates
DO $$
BEGIN
    -- Insert default templates for existing tenants if they don't exist
    INSERT INTO email_templates (tenant_id, template_type, name, subject_template, greeting_message)
    SELECT 
        t.id,
        'invoice',
        'Default Invoice Template',
        'Invoice {{invoice_number}} from {{business_name}}',
        'We''ve prepared your invoice. Here''s a summary of the details:'
    FROM tenant t
    WHERE NOT EXISTS (
        SELECT 1 FROM email_templates et 
        WHERE et.tenant_id = t.id AND et.template_type = 'invoice'
    );

    INSERT INTO email_templates (tenant_id, template_type, name, subject_template, greeting_message, primary_color, secondary_color)
    SELECT 
        t.id,
        'payment_reminder',
        'Default Reminder Template',
        'Friendly Reminder: Invoice {{invoice_number}} is {{days_overdue}} days overdue',
        'We hope you''re doing well! This is a friendly reminder about an outstanding invoice that needs your attention.',
        '#f59e0b',
        '#dc2626'
    FROM tenant t
    WHERE NOT EXISTS (
        SELECT 1 FROM email_templates et 
        WHERE et.tenant_id = t.id AND et.template_type = 'payment_reminder'
    );

    INSERT INTO email_templates (tenant_id, template_type, name, subject_template, greeting_message, primary_color, secondary_color)
    SELECT 
        t.id,
        'payment_received',
        'Default Payment Confirmation',
        'Thank you! Payment received for Invoice {{invoice_number}}',
        'Thank you for your payment! We''ve successfully received and processed your payment.',
        '#10b981',
        '#059669'
    FROM tenant t
    WHERE NOT EXISTS (
        SELECT 1 FROM email_templates et 
        WHERE et.tenant_id = t.id AND et.template_type = 'payment_received'
    );

END $$;

-- Check what we have now
SELECT 
    et.template_type,
    et.name,
    et.is_active,
    t.name as tenant_name
FROM email_templates et
JOIN tenant t ON et.tenant_id = t.id
ORDER BY et.template_type, et.created_at;