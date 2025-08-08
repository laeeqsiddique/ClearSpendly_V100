-- Enhanced subscription processing audit and control tables
-- These tables provide SaaS-grade tracking, idempotency, and compliance features

-- Subscription processing events audit table
-- Tracks every expense generation event for compliance and debugging
CREATE TABLE IF NOT EXISTS public.subscription_processing_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.expense_subscription(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('generation_started', 'generation_completed', 'generation_failed', 'generation_skipped', 'subscription_paused', 'subscription_resumed', 'subscription_cancelled')),
  event_date DATE NOT NULL,
  processing_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Idempotency and batch tracking
  idempotency_key VARCHAR(255) NOT NULL, -- Format: {tenant_id}:{subscription_id}:{event_date}
  batch_id UUID, -- Groups related processing events
  
  -- Processing details
  expenses_generated INTEGER DEFAULT 0,
  total_amount DECIMAL(12,2),
  processing_duration_ms INTEGER,
  
  -- Error handling
  error_code VARCHAR(100),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  processor_version VARCHAR(50),
  processing_context JSONB DEFAULT '{}', -- Store additional processing context
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one event per subscription per date for idempotency
  CONSTRAINT subscription_processing_event_idempotency UNIQUE(idempotency_key)
);

-- Performance indexes
CREATE INDEX idx_subscription_processing_event_tenant ON public.subscription_processing_event(tenant_id);
CREATE INDEX idx_subscription_processing_event_subscription ON public.subscription_processing_event(subscription_id);
CREATE INDEX idx_subscription_processing_event_date ON public.subscription_processing_event(event_date);
CREATE INDEX idx_subscription_processing_event_type ON public.subscription_processing_event(event_type);
CREATE INDEX idx_subscription_processing_event_batch ON public.subscription_processing_event(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_subscription_processing_event_errors ON public.subscription_processing_event(tenant_id, error_code) WHERE error_code IS NOT NULL;

-- RLS for tenant isolation
ALTER TABLE public.subscription_processing_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_processing_event_select_policy" ON public.subscription_processing_event
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.membership m
      WHERE m.tenant_id = subscription_processing_event.tenant_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "subscription_processing_event_insert_policy" ON public.subscription_processing_event
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.membership m
      WHERE m.tenant_id = subscription_processing_event.tenant_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'member')
    )
  );

-- Subscription processing queue table
-- Manages processing order and prevents race conditions
CREATE TABLE IF NOT EXISTS public.subscription_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.expense_subscription(id) ON DELETE CASCADE,
  
  -- Processing details
  scheduled_for TIMESTAMPTZ NOT NULL,
  priority INTEGER DEFAULT 0, -- Higher numbers = higher priority
  processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Lock management
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(255), -- Process/worker identifier
  lock_expires_at TIMESTAMPTZ,
  
  -- Processing metadata
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_attempt_at TIMESTAMPTZ,
  
  -- Context
  processing_context JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure no duplicate queue entries
  CONSTRAINT subscription_processing_queue_unique UNIQUE(tenant_id, subscription_id, scheduled_for)
);

-- Performance indexes for queue processing
CREATE INDEX idx_subscription_processing_queue_scheduled ON public.subscription_processing_queue(scheduled_for) WHERE processing_status = 'pending';
CREATE INDEX idx_subscription_processing_queue_tenant ON public.subscription_processing_queue(tenant_id, processing_status);
CREATE INDEX idx_subscription_processing_queue_locks ON public.subscription_processing_queue(locked_at, lock_expires_at) WHERE processing_status = 'processing';

-- RLS for processing queue
ALTER TABLE public.subscription_processing_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_processing_queue_select_policy" ON public.subscription_processing_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.membership m
      WHERE m.tenant_id = subscription_processing_queue.tenant_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  );

-- Allow system-level operations for background processing
-- Note: In production, use a dedicated service role for these operations

-- Update trigger for processing queue
CREATE OR REPLACE FUNCTION update_subscription_processing_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_processing_queue_updated_at_trigger
  BEFORE UPDATE ON public.subscription_processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_processing_queue_updated_at();

-- Function to clean up old processing events (data retention)
CREATE OR REPLACE FUNCTION cleanup_old_processing_events(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.subscription_processing_event 
  WHERE created_at < (NOW() - (retention_days || ' days')::INTERVAL)
  AND event_type NOT IN ('generation_failed'); -- Keep failed events longer for analysis
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for expense tracking and reconciliation
CREATE INDEX IF NOT EXISTS idx_receipt_subscription_date ON public.receipt(source_subscription_id, receipt_date) 
  WHERE source_subscription_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE public.subscription_processing_event IS 'Audit trail for subscription expense generation events with idempotency protection';
COMMENT ON TABLE public.subscription_processing_queue IS 'Queue management for subscription expense processing with lock protection';
COMMENT ON COLUMN public.subscription_processing_event.idempotency_key IS 'Ensures no duplicate processing: format {tenant_id}:{subscription_id}:{event_date}';
COMMENT ON COLUMN public.subscription_processing_queue.locked_by IS 'Process identifier that acquired the processing lock';