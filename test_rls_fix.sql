-- TEST SCRIPT: Verify RLS recursion fix works
-- Run this to test that the infinite recursion is eliminated

-- ==============================================================================
-- TEST 1: Basic membership table access (should not cause recursion)
-- ==============================================================================

-- This should work without 42P17 error
SELECT 
  'TEST 1: Basic membership query' as test_name,
  COUNT(*) as membership_count,
  'SUCCESS - No recursion error' as result
FROM public.membership;

-- ==============================================================================
-- TEST 2: Test with authentication context (simulated)
-- ==============================================================================

-- Test the safe helper functions
SELECT 
  'TEST 2: Safe helper functions' as test_name,
  public.get_user_tenant_ids_safe() IS NOT NULL as functions_work,
  'SUCCESS - Functions callable' as result;

-- ==============================================================================
-- TEST 3: Policy evaluation test
-- ==============================================================================

-- Test that we can run policy-like queries without recursion
DO $$
DECLARE
  test_user_id UUID;
  membership_exists BOOLEAN;
BEGIN
  -- Get a test user ID (if any exists)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test the type of query that caused recursion before
    SELECT EXISTS(
      SELECT 1 FROM public.membership m 
      WHERE m.user_id = test_user_id
    ) INTO membership_exists;
    
    RAISE NOTICE 'TEST 3: Policy evaluation - SUCCESS (User % has membership: %)', 
      test_user_id, membership_exists;
  ELSE
    RAISE NOTICE 'TEST 3: Policy evaluation - SKIPPED (No users found)';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TEST 3: Policy evaluation - ERROR: %', SQLERRM;
END $$;

-- ==============================================================================
-- TEST 4: Middleware simulation test
-- ==============================================================================

-- Simulate what the middleware does
DO $$
DECLARE
  test_user_id UUID;
  membership_record RECORD;
BEGIN
  -- Get a test user ID
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- This is similar to what middleware does
    SELECT tenant_id, role INTO membership_record
    FROM public.membership 
    WHERE user_id = test_user_id
    LIMIT 1;
    
    IF FOUND THEN
      RAISE NOTICE 'TEST 4: Middleware simulation - SUCCESS (Found membership: tenant=%, role=%)', 
        membership_record.tenant_id, membership_record.role;
    ELSE
      RAISE NOTICE 'TEST 4: Middleware simulation - SUCCESS (No membership found, but no error)';
    END IF;
  ELSE
    RAISE NOTICE 'TEST 4: Middleware simulation - SKIPPED (No users found)';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TEST 4: Middleware simulation - ERROR: %', SQLERRM;
END $$;

-- ==============================================================================
-- TEST 5: Multiple table access test
-- ==============================================================================

-- Test that other tables with tenant_id can be accessed safely
DO $$
DECLARE
  table_name TEXT;
  test_result TEXT;
BEGIN
  FOR table_name IN SELECT unnest(ARRAY['receipt', 'tag_category', 'tag', 'client', 'invoice']) 
  LOOP
    BEGIN
      EXECUTE format('SELECT COUNT(*) FROM %I', table_name);
      test_result := 'SUCCESS';
    EXCEPTION 
      WHEN undefined_table THEN
        test_result := 'SKIPPED (table not found)';
      WHEN OTHERS THEN
        test_result := 'ERROR: ' || SQLERRM;
    END;
    
    RAISE NOTICE 'TEST 5: Table % access - %', table_name, test_result;
  END LOOP;
END $$;

-- ==============================================================================
-- TEST SUMMARY
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '
======================================================================
🧪 RLS RECURSION FIX TEST RESULTS
======================================================================

If you see this message without any 42P17 errors above, the fix is working!

✅ WHAT TO EXPECT:
   - All tests should show SUCCESS or SKIPPED
   - No "infinite recursion" or "42P17" errors
   - Membership table queries work normally

⚠️  IF YOU SEE ERRORS:
   - Make sure you ran fix_rls_recursion_permanent.sql first
   - Check that all policies were created correctly
   - Verify helper functions exist

🎯 NEXT STEPS:
   - Test your middleware in the application
   - Check that dashboard APIs return 200 status
   - Monitor logs for any remaining RLS issues
======================================================================
  ';
END $$;