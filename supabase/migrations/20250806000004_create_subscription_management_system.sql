-- Subscription Management System for ClearSpendly
-- Migration: 20250806000004_create_subscription_management_system

-- Create subscription frequency enum
CREATE TYPE subscription_frequency AS ENUM ('monthly', 'yearly', 'quarterly', 'weekly', 'custom');
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'expired', 'upcoming');

-- Core subscriptions table
CREATE TABLE subscription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    
    -- Basic subscription details
    name VARCHAR(255) NOT NULL, -- e.g., "Netflix", "Spotify Premium"
    vendor_id UUID REFERENCES vendor(id),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Frequency and timing
    frequency subscription_frequency NOT NULL DEFAULT 'monthly',
    custom_frequency_days INTEGER, -- For custom frequency
    
    -- Status and lifecycle
    status subscription_status NOT NULL DEFAULT 'active',
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE, -- NULL means no end date
    next_charge_date DATE NOT NULL,
    last_charge_date DATE,
    
    -- Categorization (follows existing receipt pattern)
    category VARCHAR(100),
    tags TEXT[],
    
    -- Billing and account info
    account_number VARCHAR(255), -- Subscription account/membership number
    billing_cycle_anchor INTEGER DEFAULT 1, -- Day of month for monthly (1-31), day of year for yearly
    
    -- Payment tracking
    payment_method VARCHAR(50), -- credit_card, bank_account, paypal, etc.
    payment_account_last4 VARCHAR(4),
    
    -- Auto-expense generation
    auto_create_expenses BOOLEAN DEFAULT true,
    expense_category VARCHAR(100), -- Override category for generated expenses
    expense_notes_template TEXT, -- Template for generated expense notes
    
    -- Metadata
    description TEXT,
    notes TEXT,
    subscription_url TEXT, -- Link to manage subscription
    cancellation_url TEXT,
    
    -- Tracking fields
    created_by UUID REFERENCES "user"(id),
    updated_by UUID REFERENCES "user"(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Subscription charges history
CREATE TABLE subscription_charge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscription(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    
    -- Charge details
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    charge_date DATE NOT NULL,
    
    -- Generated expense reference
    receipt_id UUID REFERENCES receipt(id),
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'cancelled')),
    processed_at TIMESTAMPTZ,
    
    -- Metadata
    notes TEXT,
    external_transaction_id VARCHAR(255), -- For integration with banks/payment providers
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription reminders/notifications
CREATE TABLE subscription_reminder (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscription(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    
    -- Reminder details
    reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('upcoming_charge', 'overdue', 'renewal', 'cancellation')),
    days_before INTEGER DEFAULT 7, -- Days before charge date
    
    -- Notification settings
    email_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_sent_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_subscription_tenant_id ON subscription(tenant_id);
CREATE INDEX idx_subscription_status ON subscription(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_subscription_next_charge_date ON subscription(next_charge_date) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_subscription_vendor_id ON subscription(vendor_id);
CREATE INDEX idx_subscription_category ON subscription(tenant_id, category);
CREATE INDEX idx_subscription_frequency ON subscription(frequency);
CREATE INDEX idx_subscription_deleted ON subscription(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_subscription_charge_subscription_id ON subscription_charge(subscription_id);
CREATE INDEX idx_subscription_charge_tenant_id ON subscription_charge(tenant_id);
CREATE INDEX idx_subscription_charge_date ON subscription_charge(charge_date DESC);
CREATE INDEX idx_subscription_charge_status ON subscription_charge(status);

CREATE INDEX idx_subscription_reminder_subscription_id ON subscription_reminder(subscription_id);
CREATE INDEX idx_subscription_reminder_type ON subscription_reminder(reminder_type);
CREATE INDEX idx_subscription_reminder_active ON subscription_reminder(is_active) WHERE is_active = true;

-- Create updated_at triggers
CREATE TRIGGER update_subscription_updated_at 
    BEFORE UPDATE ON subscription
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscription_charge_updated_at 
    BEFORE UPDATE ON subscription_charge
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscription_reminder_updated_at 
    BEFORE UPDATE ON subscription_reminder
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate next charge date
CREATE OR REPLACE FUNCTION calculate_next_charge_date(
    p_frequency subscription_frequency,
    p_current_date DATE,
    p_billing_cycle_anchor INTEGER DEFAULT 1,
    p_custom_frequency_days INTEGER DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
    next_date DATE;
BEGIN
    CASE p_frequency
        WHEN 'weekly' THEN
            next_date := p_current_date + INTERVAL '7 days';
        WHEN 'monthly' THEN
            -- Anchor to specific day of month
            next_date := (p_current_date + INTERVAL '1 month')::DATE;
            -- Adjust to billing cycle anchor day
            next_date := DATE_TRUNC('month', next_date) + (p_billing_cycle_anchor - 1) * INTERVAL '1 day';
        WHEN 'quarterly' THEN
            next_date := p_current_date + INTERVAL '3 months';
        WHEN 'yearly' THEN
            next_date := p_current_date + INTERVAL '1 year';
        WHEN 'custom' THEN
            IF p_custom_frequency_days IS NOT NULL THEN
                next_date := p_current_date + (p_custom_frequency_days || ' days')::INTERVAL;
            ELSE
                RAISE EXCEPTION 'Custom frequency requires custom_frequency_days';
            END IF;
        ELSE
            RAISE EXCEPTION 'Invalid frequency: %', p_frequency;
    END CASE;
    
    RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Function to process subscription charges and create expense entries
CREATE OR REPLACE FUNCTION process_subscription_charges()
RETURNS INTEGER AS $$
DECLARE
    charge_record subscription_charge%ROWTYPE;
    subscription_record subscription%ROWTYPE;
    vendor_record vendor%ROWTYPE;
    receipt_record receipt%ROWTYPE;
    processed_count INTEGER := 0;
BEGIN
    -- Process pending charges that are due
    FOR charge_record IN 
        SELECT sc.* FROM subscription_charge sc
        JOIN subscription s ON sc.subscription_id = s.id
        WHERE sc.status = 'pending' 
          AND sc.charge_date <= CURRENT_DATE
          AND s.status = 'active'
          AND s.deleted_at IS NULL
          AND s.auto_create_expenses = true
    LOOP
        -- Get subscription details
        SELECT * INTO subscription_record 
        FROM subscription 
        WHERE id = charge_record.subscription_id;
        
        -- Get vendor if exists
        IF subscription_record.vendor_id IS NOT NULL THEN
            SELECT * INTO vendor_record 
            FROM vendor 
            WHERE id = subscription_record.vendor_id;
        END IF;
        
        -- Create expense entry
        INSERT INTO receipt (
            tenant_id,
            vendor_id,
            receipt_date,
            total_amount,
            subtotal_amount,
            tax_amount,
            currency,
            payment_method,
            category,
            tags,
            notes,
            source,
            source_metadata,
            created_by
        ) VALUES (
            charge_record.tenant_id,
            subscription_record.vendor_id,
            charge_record.charge_date,
            charge_record.amount,
            charge_record.amount,
            0,
            charge_record.currency,
            subscription_record.payment_method,
            COALESCE(subscription_record.expense_category, subscription_record.category),
            subscription_record.tags,
            COALESCE(
                subscription_record.expense_notes_template,
                'Auto-generated from subscription: ' || subscription_record.name
            ),
            'subscription',
            jsonb_build_object(
                'subscription_id', subscription_record.id,
                'subscription_name', subscription_record.name,
                'charge_id', charge_record.id,
                'auto_generated', true
            ),
            subscription_record.created_by
        ) RETURNING * INTO receipt_record;
        
        -- Update charge record
        UPDATE subscription_charge 
        SET 
            receipt_id = receipt_record.id,
            status = 'processed',
            processed_at = NOW()
        WHERE id = charge_record.id;
        
        -- Update subscription last charge date and calculate next charge
        UPDATE subscription 
        SET 
            last_charge_date = charge_record.charge_date,
            next_charge_date = calculate_next_charge_date(
                frequency,
                charge_record.charge_date,
                billing_cycle_anchor,
                custom_frequency_days
            ),
            updated_at = NOW()
        WHERE id = subscription_record.id;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate upcoming charges for active subscriptions
CREATE OR REPLACE FUNCTION generate_upcoming_charges(days_ahead INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    subscription_record subscription%ROWTYPE;
    charge_date DATE;
    generated_count INTEGER := 0;
BEGIN
    FOR subscription_record IN 
        SELECT * FROM subscription 
        WHERE status = 'active' 
          AND deleted_at IS NULL
          AND auto_create_expenses = true
          AND next_charge_date <= CURRENT_DATE + (days_ahead || ' days')::INTERVAL
    LOOP
        charge_date := subscription_record.next_charge_date;
        
        -- Generate charges until we're beyond the look-ahead period
        WHILE charge_date <= CURRENT_DATE + (days_ahead || ' days')::INTERVAL
        LOOP
            -- Check if charge already exists
            IF NOT EXISTS (
                SELECT 1 FROM subscription_charge 
                WHERE subscription_id = subscription_record.id 
                  AND charge_date = charge_date
            ) THEN
                -- Create the charge
                INSERT INTO subscription_charge (
                    subscription_id,
                    tenant_id,
                    amount,
                    currency,
                    charge_date,
                    status
                ) VALUES (
                    subscription_record.id,
                    subscription_record.tenant_id,
                    subscription_record.amount,
                    subscription_record.currency,
                    charge_date,
                    'pending'
                );
                
                generated_count := generated_count + 1;
            END IF;
            
            -- Calculate next charge date
            charge_date := calculate_next_charge_date(
                subscription_record.frequency,
                charge_date,
                subscription_record.billing_cycle_anchor,
                subscription_record.custom_frequency_days
            );
        END LOOP;
    END LOOP;
    
    RETURN generated_count;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_charge ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_reminder ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription table
CREATE POLICY subscription_select ON subscription
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY subscription_insert ON subscription
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY subscription_update ON subscription
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY subscription_delete ON subscription
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- RLS policies for subscription_charge table
CREATE POLICY subscription_charge_select ON subscription_charge
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY subscription_charge_insert ON subscription_charge
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

-- RLS policies for subscription_reminder table
CREATE POLICY subscription_reminder_select ON subscription_reminder
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY subscription_reminder_all ON subscription_reminder
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

COMMENT ON TABLE subscription IS 'Tracks recurring subscriptions and services for expense management';
COMMENT ON TABLE subscription_charge IS 'Individual charges/payments for subscriptions, used to generate expense entries';
COMMENT ON TABLE subscription_reminder IS 'Notification settings and tracking for subscription events';
COMMENT ON FUNCTION calculate_next_charge_date IS 'Calculates the next charge date based on frequency and billing cycle';
COMMENT ON FUNCTION process_subscription_charges IS 'Processes due charges and creates corresponding expense entries';
COMMENT ON FUNCTION generate_upcoming_charges IS 'Pre-generates upcoming charges for active subscriptions';