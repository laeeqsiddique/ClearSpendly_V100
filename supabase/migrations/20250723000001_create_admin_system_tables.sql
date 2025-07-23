-- Administrative and system tables for ClearSpendly
-- Includes system health monitoring, support tickets, and administrative features

-- Support tickets table for user help requests
CREATE TABLE IF NOT EXISTS public.support_ticket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  subject VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System health monitoring table
CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  last_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time INTEGER, -- in milliseconds
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup log table for tracking automated backups
CREATE TABLE IF NOT EXISTS public.backup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenant(id) ON DELETE CASCADE,
  backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('full', 'incremental', 'schema_only', 'data_only')),
  file_path TEXT,
  file_size_bytes BIGINT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'aborted')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API usage log for monitoring and rate limiting
CREATE TABLE IF NOT EXISTS public.api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  response_code INTEGER NOT NULL,
  response_time INTEGER, -- in milliseconds
  request_size INTEGER, -- in bytes
  response_size INTEGER, -- in bytes
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences table for storing user-specific settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}',
  
  -- Notification preferences
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  notification_frequency VARCHAR(50) DEFAULT 'daily' CHECK (notification_frequency IN ('immediate', 'daily', 'weekly', 'never')),
  
  -- UI preferences
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  language VARCHAR(10) DEFAULT 'en',
  date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
  currency VARCHAR(3) DEFAULT 'USD',
  timezone VARCHAR(100) DEFAULT 'UTC',
  
  -- Feature preferences
  default_category VARCHAR(100),
  auto_categorize BOOLEAN DEFAULT true,
  privacy_mode BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Subscription usage tracking table
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  billing_period DATE NOT NULL,
  metric_name VARCHAR(100) NOT NULL, -- receipts_processed, storage_gb, api_calls, emails_sent
  usage_count INTEGER DEFAULT 0,
  limit_count INTEGER,
  overage_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, billing_period, metric_name)
);

-- Email connector table for email integration
CREATE TABLE IF NOT EXISTS public.email_connector (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('gmail', 'outlook', 'custom')),
  email_address VARCHAR(255) NOT NULL,
  forward_address VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email_address)
);

-- Training queue for AI/ML model improvements
CREATE TABLE IF NOT EXISTS public.training_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.receipt(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  training_type VARCHAR(50) NOT NULL CHECK (training_type IN ('ocr', 'categorization', 'vendor_matching')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Model registry for tracking ML model versions
CREATE TABLE IF NOT EXISTS public.model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('ocr', 'classification', 'ner')),
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('ollama', 'openai', 'custom')),
  is_active BOOLEAN DEFAULT false,
  performance_metrics JSONB DEFAULT '{}',
  configuration JSONB DEFAULT '{}',
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_name, model_version)
);

-- Price book for tracking item prices over time
CREATE TABLE IF NOT EXISTS public.price_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendor(id),
  item_description TEXT NOT NULL,
  normalized_description TEXT NOT NULL,
  unit_price DECIMAL(12,4) NOT NULL,
  quantity DECIMAL(12,4) DEFAULT 1,
  unit_of_measure VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Statistics
  price_count INTEGER DEFAULT 1,
  avg_price DECIMAL(12,4),
  min_price DECIMAL(12,4),
  max_price DECIMAL(12,4),
  std_deviation DECIMAL(12,4),
  
  first_seen_date DATE NOT NULL,
  last_seen_date DATE NOT NULL,
  last_receipt_id UUID REFERENCES public.receipt(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price alerts for anomaly detection
CREATE TABLE IF NOT EXISTS public.price_alert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  receipt_item_id UUID NOT NULL REFERENCES public.receipt_item(id),
  price_book_id UUID REFERENCES public.price_book(id),
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('price_increase', 'new_high', 'unusual_quantity')),
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  
  current_price DECIMAL(12,4) NOT NULL,
  expected_price DECIMAL(12,4),
  variance_amount DECIMAL(12,4),
  variance_percent DECIMAL(5,2),
  
  message TEXT,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_ticket_tenant ON public.support_ticket(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_user ON public.support_ticket(user_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_status ON public.support_ticket(status) WHERE status != 'closed';
CREATE INDEX IF NOT EXISTS idx_support_ticket_priority ON public.support_ticket(priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_health_service ON public.system_health(service_name, last_check DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON public.system_health(status, last_check DESC);

CREATE INDEX IF NOT EXISTS idx_backup_log_tenant ON public.backup_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_backup_log_date ON public.backup_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_log_status ON public.backup_log(status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_tenant ON public.api_usage_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON public.api_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON public.api_usage_log(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_response_code ON public.api_usage_log(response_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_tenant ON public.user_preferences(tenant_id);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_tenant ON public.subscription_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_period ON public.subscription_usage(billing_period DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_metric ON public.subscription_usage(tenant_id, metric_name, billing_period DESC);

CREATE INDEX IF NOT EXISTS idx_email_connector_tenant ON public.email_connector(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_connector_user ON public.email_connector(user_id);
CREATE INDEX IF NOT EXISTS idx_email_connector_sync ON public.email_connector(sync_enabled) WHERE sync_enabled = true;

CREATE INDEX IF NOT EXISTS idx_training_queue_status ON public.training_queue(status, priority DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_training_queue_tenant ON public.training_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_queue_type ON public.training_queue(training_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_active ON public.model_registry(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_model_type ON public.model_registry(model_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_book_tenant ON public.price_book(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_book_vendor ON public.price_book(tenant_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_price_book_item ON public.price_book(tenant_id, normalized_description);
CREATE INDEX IF NOT EXISTS idx_price_book_dates ON public.price_book(tenant_id, last_seen_date DESC);

CREATE INDEX IF NOT EXISTS idx_price_alert_tenant ON public.price_alert(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_alert_unack ON public.price_alert(tenant_id, is_acknowledged) WHERE is_acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_price_alert_date ON public.price_alert(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_alert_severity ON public.price_alert(severity, created_at DESC) WHERE is_acknowledged = false;

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_support_ticket_updated_at 
    BEFORE UPDATE ON public.support_ticket 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON public.user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_connector_updated_at 
    BEFORE UPDATE ON public.email_connector 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_book_updated_at 
    BEFORE UPDATE ON public.price_book 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate support ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number := 'SUP-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('support_ticket_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1000;

-- Create trigger for automatic ticket number generation
CREATE TRIGGER generate_support_ticket_number 
    BEFORE INSERT ON public.support_ticket 
    FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Function to update system health status
CREATE OR REPLACE FUNCTION update_system_health(
    p_service_name VARCHAR(100),
    p_status VARCHAR(20),
    p_response_time INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    health_id UUID;
BEGIN
    INSERT INTO public.system_health (
        service_name,
        status,
        response_time,
        error_message,
        metadata
    ) VALUES (
        p_service_name,
        p_status,
        p_response_time,
        p_error_message,
        p_metadata
    ) RETURNING id INTO health_id;
    
    RETURN health_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
    p_tenant_id UUID,
    p_user_id UUID,
    p_endpoint VARCHAR(255),
    p_method VARCHAR(10),
    p_response_code INTEGER,
    p_response_time INTEGER DEFAULT NULL,
    p_request_size INTEGER DEFAULT NULL,
    p_response_size INTEGER DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.api_usage_log (
        tenant_id,
        user_id,
        endpoint,
        method,
        response_code,
        response_time,
        request_size,
        response_size,
        ip_address,
        user_agent,
        error_message
    ) VALUES (
        p_tenant_id,
        p_user_id,
        p_endpoint,
        p_method,
        p_response_code,
        p_response_time,
        p_request_size,
        p_response_size,
        p_ip_address,
        p_user_agent,
        p_error_message
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update subscription usage
CREATE OR REPLACE FUNCTION update_subscription_usage(
    p_tenant_id UUID,
    p_metric_name VARCHAR(100),
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
    current_period DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
BEGIN
    INSERT INTO public.subscription_usage (
        tenant_id,
        billing_period,
        metric_name,
        usage_count,
        last_updated
    ) VALUES (
        p_tenant_id,
        current_period,
        p_metric_name,
        p_increment,
        NOW()
    )
    ON CONFLICT (tenant_id, billing_period, metric_name)
    DO UPDATE SET
        usage_count = subscription_usage.usage_count + p_increment,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;