-- Make user_id nullable in membership table to support pending invitations
-- This allows inviting users who haven't signed up yet

-- First, drop the NOT NULL constraint on user_id
ALTER TABLE public.membership 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a check constraint to ensure either user_id or invited_email is present
ALTER TABLE public.membership 
ADD CONSTRAINT membership_user_or_email_check 
CHECK (
  (user_id IS NOT NULL) OR 
  (invited_email IS NOT NULL AND invitation_status = 'pending')
);

-- Add comment explaining the change
COMMENT ON COLUMN public.membership.user_id IS 'User ID - nullable for pending invitations where user has not signed up yet';

-- Create partial index for better query performance on pending invitations
CREATE INDEX IF NOT EXISTS idx_membership_pending_invitations 
ON public.membership(tenant_id, invited_email) 
WHERE user_id IS NULL AND invitation_status = 'pending';

-- Create partial index for accepted members
CREATE INDEX IF NOT EXISTS idx_membership_active_members 
ON public.membership(tenant_id, user_id) 
WHERE user_id IS NOT NULL AND invitation_status = 'accepted';