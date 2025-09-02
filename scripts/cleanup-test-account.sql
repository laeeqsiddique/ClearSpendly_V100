-- Cleanup Test Account Script for Flowvya
-- Run this in Supabase SQL Editor to completely remove test accounts

-- IMPORTANT: Change this email to the test account you want to delete
DO $$
DECLARE
  test_email TEXT := 'test.example@gmail.com'; -- CHANGE THIS!
  test_user_id UUID;
  test_tenant_id UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE email = test_email;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'User not found: %', test_email;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found user: % with ID: %', test_email, test_user_id;
  
  -- Get the tenant ID(s) for this user
  SELECT tenant_id INTO test_tenant_id
  FROM membership
  WHERE user_id = test_user_id
  AND role = 'owner'
  LIMIT 1;
  
  IF test_tenant_id IS NOT NULL THEN
    RAISE NOTICE 'Found tenant: %', test_tenant_id;
    
    -- Delete all tenant data (cascade will handle related records)
    DELETE FROM tenant WHERE id = test_tenant_id;
    RAISE NOTICE 'Deleted tenant and all related data';
  END IF;
  
  -- Delete user record from public.user table
  DELETE FROM public.user WHERE id = test_user_id;
  RAISE NOTICE 'Deleted user from public.user table';
  
  -- Note: Cannot delete from auth.users via SQL
  RAISE NOTICE '';
  RAISE NOTICE '✅ Database cleanup complete!';
  RAISE NOTICE '⚠️  IMPORTANT: Now go to Supabase Dashboard > Authentication > Users';
  RAISE NOTICE '    and manually delete the user: %', test_email;
  
END $$;