-- Add invited_email column to membership table
-- This allows us to store invitation emails even when the user doesn't exist yet
ALTER TABLE public.membership 
ADD COLUMN IF NOT EXISTS invited_email VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_membership_invited_email 
ON public.membership(invited_email) 
WHERE invited_email IS NOT NULL;

-- Update existing pending invitations to have email from user table
UPDATE public.membership m
SET invited_email = u.email
FROM public."user" u
WHERE m.user_id = u.id
  AND m.invitation_status = 'pending'
  AND m.invited_email IS NULL;