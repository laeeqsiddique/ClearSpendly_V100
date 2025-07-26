-- Phase 1: User Attribution System Implementation
-- This migration ensures all main tables have proper user attribution fields
-- and adds invitation system enhancements for multi-user support

-- Ensure all main tables have user attribution fields
-- (Most tables already have these fields, but we'll add them if missing)

-- Receipt table (already has created_by/updated_by)
ALTER TABLE receipt ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES "user"(id);
ALTER TABLE receipt ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES "user"(id);

-- Check if other main tables exist and add user attribution
DO $$ 
BEGIN
    -- Invoice table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoice') THEN
        ALTER TABLE invoice ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES "user"(id);
        ALTER TABLE invoice ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES "user"(id);
    END IF;
    
    -- Payment table  
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment') THEN
        ALTER TABLE payment ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES "user"(id);
        ALTER TABLE payment ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES "user"(id);
    END IF;
    
    -- Mileage entry table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mileage_entry') THEN
        ALTER TABLE mileage_entry ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES "user"(id);
        ALTER TABLE mileage_entry ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES "user"(id);
    END IF;
    
    -- Tag table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tag') THEN
        ALTER TABLE tag ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES "user"(id);
        ALTER TABLE tag ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES "user"(id);
    END IF;
    
    -- Tag category table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tag_category') THEN
        ALTER TABLE tag_category ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES "user"(id);
        ALTER TABLE tag_category ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES "user"(id);
    END IF;
    
    -- Vendor table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vendor') THEN
        ALTER TABLE vendor ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES "user"(id);
        ALTER TABLE vendor ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES "user"(id);
    END IF;
    
    -- Client table (for invoices)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'client') THEN
        ALTER TABLE client ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES "user"(id);
        ALTER TABLE client ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES "user"(id);
    END IF;
END $$;

-- Add invitation system enhancements to membership table
-- (Some fields may already exist from previous migrations)
ALTER TABLE membership ADD COLUMN IF NOT EXISTS invitation_token UUID;
ALTER TABLE membership ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;
ALTER TABLE membership ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(20) DEFAULT 'accepted';

-- Add check constraint for invitation status
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'membership_invitation_status_check'
    ) THEN
        ALTER TABLE membership ADD CONSTRAINT membership_invitation_status_check 
        CHECK (invitation_status IN ('pending', 'accepted', 'expired', 'revoked'));
    END IF;
END $$;

-- Create indexes for performance on user attribution fields
CREATE INDEX IF NOT EXISTS idx_receipt_created_by ON receipt(created_by);
CREATE INDEX IF NOT EXISTS idx_receipt_updated_by ON receipt(updated_by);

DO $$ 
BEGIN
    -- Create indexes for other tables if they exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoice') THEN
        CREATE INDEX IF NOT EXISTS idx_invoice_created_by ON invoice(created_by);
        CREATE INDEX IF NOT EXISTS idx_invoice_updated_by ON invoice(updated_by);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment') THEN
        CREATE INDEX IF NOT EXISTS idx_payment_created_by ON payment(created_by);
        CREATE INDEX IF NOT EXISTS idx_payment_updated_by ON payment(updated_by);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mileage_entry') THEN
        CREATE INDEX IF NOT EXISTS idx_mileage_entry_created_by ON mileage_entry(created_by);
        CREATE INDEX IF NOT EXISTS idx_mileage_entry_updated_by ON mileage_entry(updated_by);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tag') THEN
        CREATE INDEX IF NOT EXISTS idx_tag_created_by ON tag(created_by);
        CREATE INDEX IF NOT EXISTS idx_tag_updated_by ON tag(updated_by);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tag_category') THEN
        CREATE INDEX IF NOT EXISTS idx_tag_category_created_by ON tag_category(created_by);
        CREATE INDEX IF NOT EXISTS idx_tag_category_updated_by ON tag_category(updated_by);
    END IF;
END $$;

-- Create indexes for invitation system
CREATE INDEX IF NOT EXISTS idx_membership_invitation_token ON membership(invitation_token);
CREATE INDEX IF NOT EXISTS idx_membership_invitation_status ON membership(invitation_status);
CREATE INDEX IF NOT EXISTS idx_membership_invitation_expires_at ON membership(invitation_expires_at);

-- Create function to automatically set updated_by field
CREATE OR REPLACE FUNCTION public.set_updated_by_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to get the current user ID from the session
    -- This will work when the user is authenticated via Supabase Auth
    NEW.updated_by := auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatically setting updated_by on record updates
-- (We'll add triggers for tables that exist)
DO $$ 
BEGIN
    -- Receipt table
    DROP TRIGGER IF EXISTS set_receipt_updated_by ON receipt;
    CREATE TRIGGER set_receipt_updated_by
        BEFORE UPDATE ON receipt
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_by_user();
    
    -- Other tables (if they exist)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoice') THEN
        DROP TRIGGER IF EXISTS set_invoice_updated_by ON invoice;
        CREATE TRIGGER set_invoice_updated_by
            BEFORE UPDATE ON invoice
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_by_user();
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment') THEN
        DROP TRIGGER IF EXISTS set_payment_updated_by ON payment;
        CREATE TRIGGER set_payment_updated_by
            BEFORE UPDATE ON payment
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_by_user();
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mileage_entry') THEN
        DROP TRIGGER IF EXISTS set_mileage_entry_updated_by ON mileage_entry;
        CREATE TRIGGER set_mileage_entry_updated_by
            BEFORE UPDATE ON mileage_entry
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_by_user();
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tag') THEN
        DROP TRIGGER IF EXISTS set_tag_updated_by ON tag;
        CREATE TRIGGER set_tag_updated_by
            BEFORE UPDATE ON tag
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_by_user();
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tag_category') THEN
        DROP TRIGGER IF EXISTS set_tag_category_updated_by ON tag_category;
        CREATE TRIGGER set_tag_category_updated_by
            BEFORE UPDATE ON tag_category
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_by_user();
    END IF;
END $$;

-- Migration for existing data: Set owner as creator for historical data
-- This handles the case where existing records have created_by = null
DO $$ 
BEGIN
    -- Update receipt records
    UPDATE receipt SET created_by = (
        SELECT user_id FROM membership 
        WHERE tenant_id = receipt.tenant_id AND role = 'owner'
        LIMIT 1
    ) WHERE created_by IS NULL;
    
    -- Update other tables if they exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoice') THEN
        UPDATE invoice SET created_by = (
            SELECT user_id FROM membership 
            WHERE tenant_id = invoice.tenant_id AND role = 'owner'
            LIMIT 1
        ) WHERE created_by IS NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment') THEN
        UPDATE payment SET created_by = (
            SELECT user_id FROM membership 
            WHERE tenant_id = payment.tenant_id AND role = 'owner'
            LIMIT 1
        ) WHERE created_by IS NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tag') THEN
        UPDATE tag SET created_by = (
            SELECT user_id FROM membership 
            WHERE tenant_id = tag.tenant_id AND role = 'owner'
            LIMIT 1
        ) WHERE created_by IS NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tag_category') THEN
        UPDATE tag_category SET created_by = (
            SELECT user_id FROM membership 
            WHERE tenant_id = tag_category.tenant_id AND role = 'owner'
            LIMIT 1
        ) WHERE created_by IS NULL;
    END IF;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION public.set_updated_by_user() IS 'Automatically sets updated_by field to current authenticated user';
COMMENT ON COLUMN membership.invitation_token IS 'UUID token for email invitation links';
COMMENT ON COLUMN membership.invitation_expires_at IS 'When the invitation token expires';
COMMENT ON COLUMN membership.invitation_status IS 'Status of the invitation: pending, accepted, expired, revoked';