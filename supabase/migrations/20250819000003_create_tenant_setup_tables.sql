-- Create tables for comprehensive tenant setup system
-- Migration: 20250819000003_create_tenant_setup_tables

-- User Preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    
    -- Preference data stored as JSONB for flexibility
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one preference set per user per tenant
    UNIQUE(user_id, tenant_id)
);

-- Invoice Templates table
CREATE TABLE IF NOT EXISTS invoice_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    
    -- Template details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, name)
);

-- Tenant Usage Tracking table
CREATE TABLE IF NOT EXISTS tenant_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    
    -- Plan information
    plan_type VARCHAR(50) NOT NULL DEFAULT 'free',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    
    -- Usage limits for current plan
    limits JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Current usage counters
    usage JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one usage record per tenant
    UNIQUE(tenant_id)
);

-- Vendor Categories table
CREATE TABLE IF NOT EXISTS vendor_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    
    -- Category details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, name)
);

-- Tenant Setup Log table for tracking setup completion and auditing
CREATE TABLE IF NOT EXISTS tenant_setup_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Setup details
    setup_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    steps_completed INTEGER NOT NULL DEFAULT 0,
    setup_data JSONB DEFAULT '{}'::jsonb,
    
    -- Status tracking
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rollback_performed BOOLEAN DEFAULT false,
    rollback_reason TEXT,
    
    -- Audit trail
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS to all tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_setup_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (
        user_id = auth.uid() OR
        tenant_id IN (
            SELECT tenant_id FROM membership 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (
        user_id = auth.uid() OR
        tenant_id IN (
            SELECT tenant_id FROM membership 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- RLS Policies for invoice_template
CREATE POLICY "Users can view their tenant's invoice templates" ON invoice_template
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM membership 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their tenant's invoice templates" ON invoice_template
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM membership 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
        )
    );

-- RLS Policies for tenant_usage
CREATE POLICY "Users can view their tenant's usage" ON tenant_usage
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM membership 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Only owners and admins can manage usage" ON tenant_usage
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM membership 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- RLS Policies for vendor_category
CREATE POLICY "Users can view their tenant's vendor categories" ON vendor_category
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM membership 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their tenant's vendor categories" ON vendor_category
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM membership 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
        )
    );

-- RLS Policies for tenant_setup_log
CREATE POLICY "Users can view their tenant's setup logs" ON tenant_setup_log
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM membership 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_tenant ON user_preferences(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_template_tenant_default ON invoice_template(tenant_id, is_default) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant ON tenant_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_category_tenant_sort ON vendor_category(tenant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tenant_setup_log_tenant ON tenant_setup_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_setup_log_completed_at ON tenant_setup_log(completed_at DESC);

-- Create update triggers
CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_invoice_template_updated_at 
    BEFORE UPDATE ON invoice_template
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tenant_usage_updated_at 
    BEFORE UPDATE ON tenant_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vendor_category_updated_at 
    BEFORE UPDATE ON vendor_category
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Grant permissions
GRANT ALL ON user_preferences TO authenticated;
GRANT ALL ON invoice_template TO authenticated;
GRANT ALL ON tenant_usage TO authenticated;
GRANT ALL ON vendor_category TO authenticated;
GRANT ALL ON tenant_setup_log TO authenticated;

-- Function to update usage counters
CREATE OR REPLACE FUNCTION update_tenant_usage_counter(
    p_tenant_id UUID,
    p_counter_name TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage JSONB;
    new_usage JSONB;
    current_value INTEGER;
BEGIN
    -- Get current usage
    SELECT usage INTO current_usage
    FROM tenant_usage
    WHERE tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Extract current value
    current_value := COALESCE((current_usage ->> p_counter_name)::INTEGER, 0);
    
    -- Update the counter
    new_usage := jsonb_set(
        current_usage,
        ARRAY[p_counter_name],
        to_jsonb(current_value + p_increment)
    );
    
    -- Update the record
    UPDATE tenant_usage
    SET usage = new_usage,
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(
    p_tenant_id UUID,
    p_limit_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage INTEGER;
    usage_limit INTEGER;
    tenant_usage_record tenant_usage%ROWTYPE;
BEGIN
    -- Get tenant usage record
    SELECT * INTO tenant_usage_record
    FROM tenant_usage
    WHERE tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Extract current usage and limit
    current_usage := COALESCE((tenant_usage_record.usage ->> p_limit_name)::INTEGER, 0);
    usage_limit := COALESCE((tenant_usage_record.limits ->> p_limit_name)::INTEGER, 0);
    
    -- -1 means unlimited
    IF usage_limit = -1 THEN
        RETURN TRUE;
    END IF;
    
    -- Check if under limit
    RETURN current_usage < usage_limit;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE user_preferences IS 'Stores user-specific preferences and settings per tenant';
COMMENT ON TABLE invoice_template IS 'Customizable invoice templates for each tenant';
COMMENT ON TABLE tenant_usage IS 'Tracks usage limits and current usage for subscription billing';
COMMENT ON TABLE vendor_category IS 'Categorization system for vendors';
COMMENT ON TABLE tenant_setup_log IS 'Audit log for tenant setup completion and rollbacks';

COMMENT ON FUNCTION update_tenant_usage_counter IS 'Updates usage counters for billing and limit tracking';
COMMENT ON FUNCTION check_usage_limit IS 'Checks if tenant is within usage limits for a specific metric';