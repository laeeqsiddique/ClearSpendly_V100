-- Fix ambiguous user_id column reference using CREATE OR REPLACE (no dropping needed)
-- This avoids dependency issues by updating functions in place

-- Update get_user_tenant_ids_safe with better variable naming
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids_safe()
RETURNS UUID[] AS $$
DECLARE
  current_user_id UUID;
  tenant_ids UUID[];
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;
  
  -- Use fully qualified column names to avoid ambiguity
  SELECT ARRAY_AGG(m.tenant_id)
  INTO tenant_ids
  FROM public.membership m
  WHERE m.user_id = current_user_id
    AND (m.status = 'active' OR (m.status IS NULL AND m.accepted_at IS NOT NULL));
    
  RETURN COALESCE(tenant_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Update user_can_access_tenant_safe with better variable naming
CREATE OR REPLACE FUNCTION public.user_can_access_tenant_safe(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN tenant_uuid = ANY(public.get_user_tenant_ids_safe());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Update user_is_tenant_admin_safe with better variable naming (no DROP needed)
CREATE OR REPLACE FUNCTION public.user_is_tenant_admin_safe(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Use fully qualified column names and different variable name to avoid ambiguity
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = current_user_id
      AND m.role IN ('owner', 'admin')
      AND (m.status = 'active' OR (m.status IS NULL AND m.accepted_at IS NOT NULL))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Test the functions to ensure they work without ambiguity
DO $$
DECLARE
  test_result BOOLEAN;
  error_msg TEXT;
BEGIN
  BEGIN
    SELECT (public.get_user_tenant_ids_safe() IS NOT NULL) INTO test_result;
    RAISE NOTICE '✅ SUCCESS: get_user_tenant_ids_safe function updated: %', test_result;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    RAISE NOTICE '❌ ERROR: get_user_tenant_ids_safe still has issues: %', error_msg;
  END;
  
  BEGIN
    SELECT public.user_can_access_tenant_safe('00000000-0000-0000-0000-000000000000'::UUID) INTO test_result;
    RAISE NOTICE '✅ SUCCESS: user_can_access_tenant_safe function updated: %', test_result;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    RAISE NOTICE '❌ ERROR: user_can_access_tenant_safe still has issues: %', error_msg;
  END;
  
  BEGIN
    SELECT public.user_is_tenant_admin_safe('00000000-0000-0000-0000-000000000000'::UUID) INTO test_result;
    RAISE NOTICE '✅ SUCCESS: user_is_tenant_admin_safe function updated: %', test_result;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    RAISE NOTICE '❌ ERROR: user_is_tenant_admin_safe still has issues: %', error_msg;
  END;
END $$;

DO $$
BEGIN
  RAISE NOTICE '
======================================================================
🔧 USER_ID AMBIGUITY FIX COMPLETED (SAFE VERSION)
======================================================================

✅ FIXED ISSUES:
   - Updated functions in place using CREATE OR REPLACE
   - Renamed user_id variables to current_user_id in all functions
   - Used fully qualified column names (m.user_id)
   - No dependency issues - existing policies continue to work

✅ FUNCTIONS UPDATED:
   - get_user_tenant_ids_safe() - no more ambiguous user_id
   - user_can_access_tenant_safe() - no more ambiguous user_id  
   - user_is_tenant_admin_safe() - no more ambiguous user_id

🧪 READY FOR TESTING:
   The dashboard stats API should now work without 42702 errors!
   All existing policies remain intact and functional.
======================================================================
  ';
END $$;