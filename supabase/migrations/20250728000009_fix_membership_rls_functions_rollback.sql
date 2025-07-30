-- Rollback script for non-recursive SECURITY DEFINER functions
-- This removes the new secure functions if needed

-- Drop the new secure functions
DROP FUNCTION IF EXISTS public.secure_user_has_tenant_access(UUID, UUID);
DROP FUNCTION IF EXISTS public.secure_get_user_tenant_ids(UUID);
DROP FUNCTION IF EXISTS public.secure_is_tenant_admin(UUID, UUID);