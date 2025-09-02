-- Add email verification support to user table
-- This migration adds email verification tracking for OAuth and regular users

-- Add email verification columns to user table
ALTER TABLE public."user" 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

-- Create index for email verification lookups
CREATE INDEX IF NOT EXISTS idx_user_email_verification_token ON public."user"(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_email_verified ON public."user"(email_verified) WHERE email_verified = false;

-- Create function to generate verification token
CREATE OR REPLACE FUNCTION generate_verification_token()
RETURNS VARCHAR(255) AS $$
DECLARE
  token VARCHAR(255);
BEGIN
  -- Generate a secure random token
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark email as verified
CREATE OR REPLACE FUNCTION verify_user_email(verification_token VARCHAR(255))
RETURNS TABLE(success BOOLEAN, user_id UUID, email VARCHAR(255)) AS $$
DECLARE
  target_user_id UUID;
  target_email VARCHAR(255);
BEGIN
  -- Find user with this token
  SELECT u.id, u.email INTO target_user_id, target_email
  FROM public."user" u
  WHERE u.email_verification_token = verification_token
    AND u.email_verified = false
    AND u.email_verification_sent_at > NOW() - INTERVAL '24 hours'; -- Token expires in 24 hours

  IF target_user_id IS NOT NULL THEN
    -- Mark email as verified
    UPDATE public."user"
    SET 
      email_verified = true,
      email_verified_at = NOW(),
      email_verification_token = NULL,
      updated_at = NOW()
    WHERE id = target_user_id;

    RETURN QUERY SELECT true, target_user_id, target_email;
  ELSE
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(255);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user needs email verification
CREATE OR REPLACE FUNCTION user_needs_verification(user_email VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
  needs_verification BOOLEAN;
BEGIN
  SELECT NOT COALESCE(u.email_verified, false) INTO needs_verification
  FROM public."user" u
  WHERE u.email = user_email;
  
  RETURN COALESCE(needs_verification, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- For existing OAuth users, mark them as verified since they already have access
-- This ensures the verification system doesn't break existing functionality
UPDATE public."user" 
SET 
  email_verified = true,
  email_verified_at = NOW(),
  updated_at = NOW()
WHERE email_verified IS NULL OR email_verified = false;

-- Add comment explaining the system
COMMENT ON COLUMN public."user".email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN public."user".email_verified_at IS 'When the email was verified';
COMMENT ON COLUMN public."user".email_verification_token IS 'Token used for email verification (expires in 24 hours)';
COMMENT ON COLUMN public."user".email_verification_sent_at IS 'When the verification email was last sent';
COMMENT ON COLUMN public."user".welcome_email_sent IS 'Whether welcome email has been sent to this user';
COMMENT ON COLUMN public."user".welcome_email_sent_at IS 'When the welcome email was sent';