-- Clean up OAuth test user and related data
-- This script safely deletes test users and all associated data
-- 
-- Usage: 
-- 1. Replace 'TEST_EMAIL_HERE' with actual test email
-- 2. Run in Supabase SQL editor or psql
-- 
-- IMPORTANT: Only use with test emails containing 'test' in the address

BEGIN;

-- Variables (replace with actual test email)
-- Change this email to match your test user
\set test_email '''test-oauth-1@yourdomain.com'''

DO $cleanup$ 
DECLARE
    test_user_uuid uuid;
    test_tenant_uuid uuid;
    test_tenant_name text;
    receipt_count int;
    invoice_count int;
    membership_count int;
BEGIN
    -- Safety check: only process emails containing 'test'
    IF NOT :test_email LIKE '%test%' THEN
        RAISE EXCEPTION 'Safety check failed: Email must contain "test" for cleanup';
    END IF;

    -- Find tenant associated with test patterns
    -- This works around not having direct access to auth.users
    SELECT t.id, t.name, m.user_id 
    INTO test_tenant_uuid, test_tenant_name, test_user_uuid
    FROM tenant t
    JOIN membership m ON t.id = m.tenant_id
    WHERE t.name LIKE '%test%' 
       OR t.slug LIKE '%test%'
       OR t.name LIKE '%Test%'
    ORDER BY t.created_at DESC
    LIMIT 1;
    
    IF test_tenant_uuid IS NULL THEN
        RAISE NOTICE 'No test tenant found. Search criteria:';
        RAISE NOTICE '- Tenant name contains "test" or "Test"';
        RAISE NOTICE '- Tenant slug contains "test"';
        RAISE NOTICE 'You may need to identify the tenant manually.';
        RETURN;
    END IF;

    RAISE NOTICE 'Found test data:';
    RAISE NOTICE '- Tenant ID: %', test_tenant_uuid;
    RAISE NOTICE '- Tenant Name: %', test_tenant_name;
    RAISE NOTICE '- User ID: %', test_user_uuid;
    
    -- Count data to be deleted
    SELECT COUNT(*) INTO receipt_count
    FROM receipts WHERE tenant_id = test_tenant_uuid;
    
    SELECT COUNT(*) INTO invoice_count  
    FROM invoices WHERE tenant_id = test_tenant_uuid;
    
    SELECT COUNT(*) INTO membership_count
    FROM membership WHERE tenant_id = test_tenant_uuid;
    
    RAISE NOTICE 'Data to be deleted:';
    RAISE NOTICE '- Receipts: %', receipt_count;
    RAISE NOTICE '- Invoices: %', invoice_count;
    RAISE NOTICE '- Memberships: %', membership_count;
    
    -- Delete in proper order to respect foreign key constraints
    
    -- 1. Delete receipt items first
    DELETE FROM receipt_items 
    WHERE receipt_id IN (
        SELECT id FROM receipts WHERE tenant_id = test_tenant_uuid
    );
    GET DIAGNOSTICS receipt_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % receipt items', receipt_count;
    
    -- 2. Delete receipts  
    DELETE FROM receipts WHERE tenant_id = test_tenant_uuid;
    GET DIAGNOSTICS receipt_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % receipts', receipt_count;
    
    -- 3. Delete invoices
    DELETE FROM invoices WHERE tenant_id = test_tenant_uuid;
    GET DIAGNOSTICS invoice_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % invoices', invoice_count;
    
    -- 4. Delete any other tenant-related data
    -- Add more DELETE statements here for other tables as needed
    -- DELETE FROM other_table WHERE tenant_id = test_tenant_uuid;
    
    -- 5. Delete team memberships
    DELETE FROM membership WHERE tenant_id = test_tenant_uuid;
    GET DIAGNOSTICS membership_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % memberships', membership_count;
    
    -- 6. Finally delete the tenant
    DELETE FROM tenant WHERE id = test_tenant_uuid;
    RAISE NOTICE 'Deleted tenant: %', test_tenant_name;
    
    RAISE NOTICE '=== CLEANUP COMPLETED ===';
    RAISE NOTICE 'Next step: Delete user from Supabase Auth dashboard';
    RAISE NOTICE 'User ID to delete: %', test_user_uuid;
    RAISE NOTICE 'Go to: Supabase Dashboard > Authentication > Users';
    
END $cleanup$;

-- Uncomment the next line if you want to actually commit the changes
COMMIT;

-- If you want to see what would be deleted without actually deleting:
-- ROLLBACK;