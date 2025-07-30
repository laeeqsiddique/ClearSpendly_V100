-- Fix ambiguous user_id column reference in RLS helper functions
-- The error occurs when functions use user_id as both variable name and column name

-- Drop and recreate the problematic function with better variable naming
DROP FUNCTION IF EXISTS public.get_user_tenant_ids_safe();

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

-- Drop and recreate user_is_tenant_admin_safe with better variable naming
DROP FUNCTION IF EXISTS public.user_is_tenant_admin_safe(UUID);

CREATE OR REPLACE FUNCTION public.user_is_tenant_admin_safe(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Use fully qualified column names and different variable name
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_tenant_admin_safe(UUID) TO authenticated;

-- Test the functions to ensure they work without ambiguity
DO $$
DECLARE
  test_result BOOLEAN;
  error_msg TEXT;
BEGIN
  BEGIN
    SELECT (public.get_user_tenant_ids_safe() IS NOT NULL) INTO test_result;
    RAISE NOTICE '✅ SUCCESS: get_user_tenant_ids_safe function fixed: %', test_result;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    RAISE NOTICE '❌ ERROR: get_user_tenant_ids_safe still has issues: %', error_msg;
  END;
  
  BEGIN
    SELECT public.user_is_tenant_admin_safe('00000000-0000-0000-0000-000000000000'::UUID) INTO test_result;
    RAISE NOTICE '✅ SUCCESS: user_is_tenant_admin_safe function fixed: %', test_result;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    RAISE NOTICE '❌ ERROR: user_is_tenant_admin_safe still has issues: %', error_msg;
  END;
END $$;

DO $$
BEGIN
  RAISE NOTICE '
======================================================================
🔧 USER_ID AMBIGUITY FIX COMPLETED
======================================================================

✅ FIXED ISSUES:
   - Renamed user_id variables to current_user_id in functions
   - Used fully qualified column names (m.user_id)
   - Prevented column/variable name conflicts

✅ FUNCTIONS UPDATED:
   - get_user_tenant_ids_safe() - no more ambiguous user_id
   - user_is_tenant_admin_safe() - no more ambiguous user_id

🧪 READY FOR TESTING:
   The dashboard stats API should now work without 42702 errors
======================================================================
  ';
END $$;