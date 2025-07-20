-- Reset onboarding status for testing
-- This will clear the onboarding_completed flag so you can test the flow

-- Check current user metadata
SELECT 
    email,
    raw_user_meta_data,
    user_metadata
FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your email

-- Reset onboarding completion (replace with your user ID)
UPDATE auth.users 
SET user_metadata = user_metadata - 'onboarding_completed'
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your email

-- Or if you want to explicitly set it to false:
-- UPDATE auth.users 
-- SET user_metadata = COALESCE(user_metadata, '{}'::jsonb) || '{"onboarding_completed": false}'::jsonb
-- WHERE email = 'YOUR_EMAIL_HERE';

-- Verify the change
SELECT 
    email,
    user_metadata->>'onboarding_completed' as onboarding_status
FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your email