-- Fix existing membership records that are missing the 'status' field
-- This script updates all existing memberships to have 'active' status
-- Run this after applying the migration 20250728000008_fix_membership_status_column.sql

-- First, check current state of memberships
SELECT 
    id,
    user_id,
    tenant_id,
    role,
    status,
    invitation_status,
    accepted_at,
    CASE 
        WHEN status IS NULL AND accepted_at IS NOT NULL THEN 'Needs status = active'
        WHEN status IS NULL AND invitation_status = 'accepted' THEN 'Needs status = active'
        WHEN status IS NULL THEN 'Needs status determination'
        ELSE 'OK'
    END as fix_needed
FROM membership
ORDER BY created_at DESC;

-- Update memberships that need fixing
UPDATE membership 
SET status = 'active'
WHERE status IS NULL 
  AND (accepted_at IS NOT NULL OR invitation_status = 'accepted');

-- Verify the fix
SELECT 
    COUNT(*) as total_memberships,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_memberships,
    COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status_memberships
FROM membership;

-- Test the RLS helper functions with an actual user
-- Replace with an actual user_id from your system
SELECT * FROM public.get_user_tenant_ids('YOUR_USER_ID_HERE'::UUID);

-- Test if a specific user can access a specific tenant
-- Replace with actual user_id and tenant_id from your system
SELECT public.can_access_tenant('YOUR_TENANT_ID_HERE'::UUID, 'YOUR_USER_ID_HERE'::UUID);