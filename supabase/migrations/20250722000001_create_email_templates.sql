-- Email Templates System for ClearSpendly
-- This migration creates tables to store customizable email templates for each tenant

-- Email Templates table to store template configurations
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    
    -- Template identification
    template_type TEXT NOT NULL CHECK (template_type IN ('invoice', 'payment_reminder', 'payment_received')),
    name TEXT NOT NULL DEFAULT 'Default Template',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Branding configuration
    primary_color TEXT NOT NULL DEFAULT '#667eea',
    secondary_color TEXT NOT NULL DEFAULT '#764ba2',
    accent_color TEXT NOT NULL DEFAULT '#10b981',
    text_color TEXT NOT NULL DEFAULT '#1a1a1a',
    background_color TEXT NOT NULL DEFAULT '#f5f5f5',
    
    -- Logo and branding assets
    logo_url TEXT,
    logo_width INTEGER DEFAULT 60,
    logo_height INTEGER DEFAULT 60,
    company_name TEXT,
    
    -- Email content customization
    subject_template TEXT,
    greeting_message TEXT,
    footer_message TEXT,
    
    -- Template structure
    header_style JSONB DEFAULT '{"gradient": true, "centerAlign": true}'::jsonb,
    body_style JSONB DEFAULT '{"padding": "48px 40px", "backgroundColor": "#ffffff"}'::jsonb,
    button_style JSONB DEFAULT '{"borderRadius": "50px", "padding": "18px 48px"}'::jsonb,
    
    -- Custom CSS (for advanced users)
    custom_css TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(tenant_id, template_type, name)
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's email templates" ON email_templates
    FOR SELECT USING (
        tenant_id IN (
            SELECT m.tenant_id FROM membership m 
            WHERE m.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create email templates for their tenant" ON email_templates
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT m.tenant_id FROM membership m 
            WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can update their tenant's email templates" ON email_templates
    FOR UPDATE USING (
        tenant_id IN (
            SELECT m.tenant_id FROM membership m 
            WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can delete their tenant's email templates" ON email_templates
    FOR DELETE USING (
        tenant_id IN (
            SELECT m.tenant_id FROM membership m 
            WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
        )
    );

-- Email Template Variables table for dynamic content
CREATE TABLE IF NOT EXISTS email_template_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    
    -- Variable definition
    variable_name TEXT NOT NULL,
    variable_type TEXT NOT NULL CHECK (variable_type IN ('text', 'number', 'currency', 'date', 'boolean', 'url')),
    display_name TEXT NOT NULL,
    description TEXT,
    default_value TEXT,
    is_required BOOLEAN NOT NULL DEFAULT false,
    
    -- Validation rules
    validation_rules JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    UNIQUE(template_id, variable_name)
);

-- Enable RLS
ALTER TABLE email_template_variables ENABLE ROW LEVEL SECURITY;

-- RLS Policies for variables
CREATE POLICY "Users can view template variables for their tenant" ON email_template_variables
    FOR SELECT USING (
        template_id IN (
            SELECT et.id FROM email_templates et
            INNER JOIN membership m ON et.tenant_id = m.tenant_id
            WHERE m.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage template variables for their tenant" ON email_template_variables
    FOR ALL USING (
        template_id IN (
            SELECT et.id FROM email_templates et
            INNER JOIN membership m ON et.tenant_id = m.tenant_id
            WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
        )
    );

-- Email Send Log table to track email usage and templates
CREATE TABLE IF NOT EXISTS email_send_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    
    -- Email details
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    template_type TEXT NOT NULL,
    
    -- Send status
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')) DEFAULT 'pending',
    provider_message_id TEXT,
    error_message TEXT,
    
    -- Template snapshot (for audit trail)
    template_snapshot JSONB,
    
    -- Metadata
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_by UUID REFERENCES auth.users(id),
    
    -- Related records
    invoice_id UUID, -- Could reference invoice table
    
    -- Indexes for performance
    CONSTRAINT valid_status CHECK (status IN ('sent', 'failed', 'pending'))
);

-- Enable RLS
ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy for email log
CREATE POLICY "Users can view their tenant's email logs" ON email_send_log
    FOR SELECT USING (
        tenant_id IN (
            SELECT m.tenant_id FROM membership m 
            WHERE m.user_id = auth.uid()
        )
    );

-- Indexes for performance
CREATE INDEX idx_email_templates_tenant_type ON email_templates(tenant_id, template_type);
CREATE INDEX idx_email_templates_active ON email_templates(tenant_id, template_type, is_active);
CREATE INDEX idx_email_send_log_tenant_date ON email_send_log(tenant_id, created_at DESC);
CREATE INDEX idx_email_send_log_status ON email_send_log(tenant_id, status);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_email_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_email_template_updated_at();

-- Insert default templates for existing tenants
INSERT INTO email_templates (tenant_id, template_type, name, subject_template, greeting_message)
SELECT 
    t.id,
    'invoice',
    'Default Invoice Template',
    'Invoice {{invoice_number}} from {{business_name}}',
    'We''ve prepared your invoice. Here''s a summary of the details:'
FROM tenant t
ON CONFLICT (tenant_id, template_type, name) DO NOTHING;

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
ON CONFLICT (tenant_id, template_type, name) DO NOTHING;

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
ON CONFLICT (tenant_id, template_type, name) DO NOTHING;