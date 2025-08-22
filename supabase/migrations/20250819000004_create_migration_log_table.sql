-- Create migration log table for tracking system migrations
-- Migration: 20250819000004_create_migration_log_table

CREATE TABLE IF NOT EXISTS migration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Migration details
    migration_type VARCHAR(100) NOT NULL,
    migration_version VARCHAR(50) NOT NULL,
    
    -- Statistics
    tenants_processed INTEGER DEFAULT 0,
    successful_migrations INTEGER DEFAULT 0,
    failed_migrations INTEGER DEFAULT 0,
    migration_time_ms BIGINT DEFAULT 0,
    
    -- Detailed results
    migration_data JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    triggered_by UUID REFERENCES auth.users(id),
    environment VARCHAR(50) DEFAULT 'production',
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_migration_log_type ON migration_log(migration_type);
CREATE INDEX IF NOT EXISTS idx_migration_log_created_at ON migration_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_migration_log_environment ON migration_log(environment);

-- Enable RLS (admin only access)
ALTER TABLE migration_log ENABLE ROW LEVEL SECURITY;

-- Only allow admin users to access migration logs
CREATE POLICY "Only system admins can access migration logs" ON migration_log
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM membership m
            JOIN tenant t ON m.tenant_id = t.id
            WHERE t.slug = 'system-admin' AND m.role = 'owner'
        )
    );

-- Grant permissions
GRANT ALL ON migration_log TO authenticated;

-- Add comment
COMMENT ON TABLE migration_log IS 'Tracks system-wide migrations and their results for auditing purposes';