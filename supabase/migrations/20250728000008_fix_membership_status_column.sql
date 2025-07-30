-- Fix membership status column issue
-- The RLS helper functions expect a 'status' column with 'active' value,
-- but the table has 'invitation_status' with 'accepted' as the default

-- First, add the status column if it doesn't exist
ALTER TABLE membership ADD COLUMN IF NOT EXISTS status VARCHAR(20);

-- Update existing records to set proper status based on invitation_status
UPDATE membership 
SET status = CASE 
    WHEN invitation_status = 'accepted' OR accepted_at IS NOT NULL THEN 'active'
    WHEN invitation_status = 'pending' THEN 'pending'
    WHEN invitation_status = 'expired' THEN 'inactive'
    WHEN invitation_status = 'revoked' THEN 'inactive'
    ELSE 'active'  -- Default to active for existing records
END
WHERE status IS NULL;

-- Set default value for new records
ALTER TABLE membership ALTER COLUMN status SET DEFAULT 'active';

-- Add NOT NULL constraint after populating data
ALTER TABLE membership ALTER COLUMN status SET NOT NULL;

-- Add check constraint for status values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE constraint_name = 'membership_status_check'
    ) THEN
        ALTER TABLE membership ADD CONSTRAINT membership_status_check 
        CHECK (status IN ('active', 'inactive', 'pending', 'suspended'));
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_membership_status ON membership(status);

-- Update the RLS helper functions to handle both old and new records gracefully
-- This ensures backward compatibility during migration
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID) AS $$
BEGIN
  -- Return empty if no user provided
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT m.tenant_id
  FROM public.membership m
  WHERE m.user_id = user_uuid
    AND (m.status = 'active' OR (m.status IS NULL AND m.accepted_at IS NOT NULL));  -- Handle both new and legacy records
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update can_access_tenant function
CREATE OR REPLACE FUNCTION public.can_access_tenant(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if no user or tenant provided
  IF user_uuid IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = user_uuid 
      AND (m.status = 'active' OR (m.status IS NULL AND m.accepted_at IS NOT NULL))  -- Handle both new and legacy records
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update is_tenant_admin function
CREATE OR REPLACE FUNCTION public.is_tenant_admin(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if no user or tenant provided
  IF user_uuid IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = user_uuid 
      AND m.role IN ('owner', 'admin')
      AND (m.status = 'active' OR (m.status IS NULL AND m.accepted_at IS NOT NULL))  -- Handle both new and legacy records
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Comments for documentation
COMMENT ON COLUMN membership.status IS 'Membership status: active, inactive, pending, suspended';
COMMENT ON COLUMN membership.invitation_status IS 'Invitation-specific status: pending, accepted, expired, revoked';