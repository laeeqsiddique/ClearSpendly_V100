-- Create tables for comprehensive tenant setup system (FIXED VERSION)
-- Migration: 20250819000003_create_tenant_setup_tables
-- Fixed: Handles existing policies and tables gracefully

-- User Preferences table (only create if doesn't exist)
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

-- Note: invoice_template table already exists from previous migration
-- We'll skip creating it and just ensure policies are correct

-- Tenant Usage Tracking table
CREATE TABLE IF NOT EXISTS tenant_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    
    -- Plan information
    plan_type VARCHAR(50) NOT NULL DEFAULT 'free',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    
    -- Usage metrics
    usage_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one usage record per tenant
    UNIQUE(tenant_id)
);

-- Vendor Category table
CREATE TABLE IF NOT EXISTS vendor_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    
    -- Category details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, name)
);

-- Tenant Setup Log table
CREATE TABLE IF NOT EXISTS tenant_setup_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenant(id) ON DELETE CASCADE,
    
    -- Setup details
    setup_step VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'pending', 'in_progress', 'completed', 'failed'
    details JSONB,
    error_message TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_setup_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DO $$ 
BEGIN
    -- Drop existing invoice_template policies if they exist
    DROP POLICY IF EXISTS "Users can view their tenant's invoice templates" ON invoice_template;
    DROP POLICY IF EXISTS "Users can manage their tenant's invoice templates" ON invoice_template;
    
    -- Drop other policies if they exist
    DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can view their tenant's usage" ON tenant_usage;
    DROP POLICY IF EXISTS "Only owners and admins can manage usage" ON tenant_usage;
    DROP POLICY IF EXISTS "Users can view their tenant's vendor categories" ON vendor_category;
    DROP POLICY IF EXISTS "Users can manage their tenant's vendor categories" ON vendor_category;
    DROP POLICY IF EXISTS "Users can view their tenant's setup logs" ON tenant_setup_log;
    DROP POLICY IF EXISTS "Only owners and admins can view setup logs" ON tenant_setup_log;
END $$;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (
        user_id = auth.uid() AND
        tenant_id IN (
            SELECT tenant_id FROM membership 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (
        user_id = auth.uid() AND
        tenant_id IN (
            SELECT tenant_id FROM membership 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for invoice_template (recreate with proper checks)
-- Note: These might already exist from previous migration, but we're ensuring they're correct
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
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Only owners and admins can view setup logs" ON tenant_setup_log
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM membership 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_tenant ON user_preferences(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_tenant ON user_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant ON tenant_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_category_tenant ON vendor_category(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_setup_log_tenant ON tenant_setup_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_setup_log_status ON tenant_setup_log(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$ 
BEGIN
    -- Only create triggers if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_preferences_updated_at') THEN
        CREATE TRIGGER update_user_preferences_updated_at 
        BEFORE UPDATE ON user_preferences 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tenant_usage_updated_at') THEN
        CREATE TRIGGER update_tenant_usage_updated_at 
        BEFORE UPDATE ON tenant_usage 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_vendor_category_updated_at') THEN
        CREATE TRIGGER update_vendor_category_updated_at 
        BEFORE UPDATE ON vendor_category 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE user_preferences IS 'Stores user-specific preferences per tenant';
COMMENT ON TABLE tenant_usage IS 'Tracks usage metrics and plan information for each tenant';
COMMENT ON TABLE vendor_category IS 'Manages vendor categories for each tenant';
COMMENT ON TABLE tenant_setup_log IS 'Logs the setup process for each tenant for debugging and audit';