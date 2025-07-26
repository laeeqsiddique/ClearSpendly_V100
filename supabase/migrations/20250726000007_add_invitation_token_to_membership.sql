-- Add invitation_token as VARCHAR to membership table
-- The previous migration might have created it as UUID, so we need to handle both cases

-- First, drop the column if it exists as UUID type
DO $$ 
BEGIN
    -- Check if column exists and is UUID type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'membership' 
        AND column_name = 'invitation_token'
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.membership DROP COLUMN invitation_token;
    END IF;
END $$;

-- Now add it as VARCHAR if it doesn't exist
ALTER TABLE public.membership 
ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(64);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_membership_invitation_token 
ON public.membership(invitation_token) 
WHERE invitation_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.membership.invitation_token IS 'Token for team invitation links (nanoid format)';