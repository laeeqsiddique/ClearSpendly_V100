-- Emergency reset script for user stuck in onboarding loop
-- User ID: 53fdc491-6855-49d1-81a8-9ac847445274

-- First, check current state
SELECT 'Current User State:' as info;
SELECT id, email, user_metadata FROM auth.users WHERE id = '53fdc491-6855-49d1-81a8-9ac847445274';

SELECT 'Current User Record:' as info;
SELECT * FROM public."user" WHERE id = '53fdc491-6855-49d1-81a8-9ac847445274';

SELECT 'Current Memberships:' as info;
SELECT * FROM public.membership WHERE user_id = '53fdc491-6855-49d1-81a8-9ac847445274';

-- Option 1: Complete the setup (preferred solution)
-- Create user record if doesn't exist
INSERT INTO public."user" (id, email, full_name)
SELECT '53fdc491-6855-49d1-81a8-9ac847445274', 
       u.email, 
       COALESCE(u.user_metadata->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u 
WHERE u.id = '53fdc491-6855-49d1-81a8-9ac847445274'
ON CONFLICT (id) DO NOTHING;

-- Create or get tenant (assuming single tenant setup)
INSERT INTO public.tenant (name, slug, settings)
VALUES ('My Company', 'my-company', '{}')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
RETURNING id;

-- Create membership (replace TENANT_ID with actual tenant ID from above)
INSERT INTO public.membership (user_id, tenant_id, role, invitation_status, accepted_at)
SELECT '53fdc491-6855-49d1-81a8-9ac847445274', 
       t.id, 
       'owner', 
       'accepted', 
       NOW()
FROM public.tenant t 
WHERE t.slug = 'my-company'
ON CONFLICT (user_id, tenant_id) DO UPDATE SET 
  invitation_status = 'accepted',
  accepted_at = NOW();

-- Verify the fix
SELECT 'Verification - User Setup Complete:' as info;
SELECT u.id, u.email, m.tenant_id, m.role, t.name as tenant_name
FROM public."user" u
JOIN public.membership m ON u.id = m.user_id
JOIN public.tenant t ON m.tenant_id = t.id
WHERE u.id = '53fdc491-6855-49d1-81a8-9ac847445274';

-- Option 2: Reset onboarding (alternative solution)
-- UPDATE auth.users 
-- SET user_metadata = user_metadata - 'onboarding_completed'
-- WHERE id = '53fdc491-6855-49d1-81a8-9ac847445274';