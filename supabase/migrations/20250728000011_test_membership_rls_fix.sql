-- Test script to verify the membership RLS fix works without infinite recursion
-- This should be run after applying the membership RLS fixes

-- Test the new secure functions
DO $$ 
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    test_tenant_id UUID := '00000000-0000-0000-0000-000000000002';
    result BOOLEAN;
    tenant_count INTEGER;
BEGIN
    -- Test 1: secure_user_has_tenant_access function
    RAISE NOTICE 'Testing secure_user_has_tenant_access function...';
    
    -- This should return FALSE for non-existent user/tenant combination
    SELECT public.secure_user_has_tenant_access(test_tenant_id, test_user_id) INTO result;
    RAISE NOTICE 'secure_user_has_tenant_access result: %', result;
    
    -- Test 2: secure_get_user_tenant_ids function
    RAISE NOTICE 'Testing secure_get_user_tenant_ids function...';
    
    -- Count tenant IDs for test user (should be 0 for non-existent user)
    SELECT COUNT(*) FROM public.secure_get_user_tenant_ids(test_user_id) INTO tenant_count;
    RAISE NOTICE 'secure_get_user_tenant_ids count: %', tenant_count;
    
    -- Test 3: secure_is_tenant_admin function
    RAISE NOTICE 'Testing secure_is_tenant_admin function...';
    
    -- This should return FALSE for non-existent user/tenant combination
    SELECT public.secure_is_tenant_admin(test_tenant_id, test_user_id) INTO result;
    RAISE NOTICE 'secure_is_tenant_admin result: %', result;
    
    RAISE NOTICE 'All secure functions tested successfully - no infinite recursion detected!';
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR during testing: % - %', SQLSTATE, SQLERRM;
        
        -- Check if this is the infinite recursion error
        IF SQLSTATE = '42P17' THEN
            RAISE NOTICE 'INFINITE RECURSION ERROR (42P17) detected - fix did not work!';
        ELSE
            RAISE NOTICE 'Other error detected during testing';
        END IF;
        
        -- Re-raise the error
        RAISE;
END $$;

-- Test that membership policies work with the new functions
-- (This requires RLS to be enabled and will test the actual policies)
DO $$
BEGIN
    RAISE NOTICE 'Testing membership table access patterns...';
    
    -- Try to query membership table (this will trigger RLS policies)
    -- If there's infinite recursion, this will fail with 42P17
    PERFORM COUNT(*) FROM public.membership WHERE false; -- Safe query that returns no data
    
    RAISE NOTICE 'Membership table access test passed - no recursion in RLS policies!';
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR during membership table access test: % - %', SQLSTATE, SQLERRM;
        
        -- Check if this is the infinite recursion error
        IF SQLSTATE = '42P17' THEN
            RAISE NOTICE 'INFINITE RECURSION ERROR (42P17) still exists in membership policies!';
        END IF;
        
        -- Re-raise the error
        RAISE;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '=== MEMBERSHIP RLS FIX TEST COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE 'No infinite recursion errors detected. The fix appears to be working.';
END $$;