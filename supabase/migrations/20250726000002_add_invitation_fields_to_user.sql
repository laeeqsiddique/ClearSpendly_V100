-- Add invitation system fields to user table for team invitations
-- This supports the team invitation email functionality

-- Add invitation token field (varchar instead of UUID for flexibility with nanoid)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(64);

-- Add invitation expiry timestamp
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_invitation_token ON "user"(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitation_expires_at ON "user"(invitation_expires_at);

-- Add helpful comments
COMMENT ON COLUMN "user".invitation_token IS 'Token for email invitation links (nanoid format)';
COMMENT ON COLUMN "user".invitation_expires_at IS 'When the invitation token expires (typically 7 days)';

-- Note: The user table already has invitation_status from previous schema
-- If it doesn't exist, we'll add it
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(20) DEFAULT 'accepted';

-- Add constraint for invitation status if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'user_invitation_status_check'
    ) THEN
        ALTER TABLE "user" ADD CONSTRAINT user_invitation_status_check 
        CHECK (invitation_status IN ('pending', 'accepted', 'expired', 'revoked'));
    END IF;
END $$;