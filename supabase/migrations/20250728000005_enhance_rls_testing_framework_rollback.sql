-- ROLLBACK: Enhanced Testing Framework for Comprehensive RLS Validation
-- This script removes the enhanced testing functions

-- Drop the enhanced testing functions
DROP FUNCTION IF EXISTS public.generate_rls_activation_script();
DROP FUNCTION IF EXISTS public.simulate_comprehensive_policy_tests();
DROP FUNCTION IF EXISTS public.test_helper_function_consistency();
DROP FUNCTION IF EXISTS public.identify_missing_rls_policies();
DROP FUNCTION IF EXISTS public.test_comprehensive_policy_definitions();

-- Restore to original testing framework state
-- (The original functions from 20250728000003 remain intact)