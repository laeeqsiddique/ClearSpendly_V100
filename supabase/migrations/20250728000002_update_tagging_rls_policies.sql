-- Phase 1: Update tagging system RLS policies to use membership-based approach
-- This migration updates policy definitions WITHOUT enabling RLS
-- Converts from current_setting approach to membership-based approach

-- NOTE: RLS remains DISABLED during this migration for safety
-- These are policy definition updates only

-- Drop existing policies that use current_setting approach
DROP POLICY IF EXISTS "Users can view tag categories for their tenant" ON tag_category;
DROP POLICY IF EXISTS "Users can manage tag categories for their tenant" ON tag_category;
DROP POLICY IF EXISTS "Users can view tags for their tenant" ON tag;
DROP POLICY IF EXISTS "Users can manage tags for their tenant" ON tag;
DROP POLICY IF EXISTS "Users can view receipt tags for their tenant" ON receipt_tag;
DROP POLICY IF EXISTS "Users can manage receipt tags for their tenant" ON receipt_tag;
DROP POLICY IF EXISTS "Users can view receipt item tags for their tenant" ON receipt_item_tag;
DROP POLICY IF EXISTS "Users can manage receipt item tags for their tenant" ON receipt_item_tag;

-- Create new membership-based policies for tag_category
CREATE POLICY "tag_category_select_membership" ON tag_category
    FOR SELECT USING (
        public.user_has_tenant_access(tenant_id)
    );

CREATE POLICY "tag_category_insert_membership" ON tag_category
    FOR INSERT WITH CHECK (
        public.user_has_tenant_access(tenant_id)
    );

CREATE POLICY "tag_category_update_membership" ON tag_category
    FOR UPDATE USING (
        public.user_has_tenant_access(tenant_id)
    ) WITH CHECK (
        public.user_has_tenant_access(tenant_id)
    );

CREATE POLICY "tag_category_delete_membership" ON tag_category
    FOR DELETE USING (
        public.user_has_tenant_access(tenant_id)
    );

-- Create new membership-based policies for tag
CREATE POLICY "tag_select_membership" ON tag
    FOR SELECT USING (
        public.user_has_tenant_access(tenant_id)
    );

CREATE POLICY "tag_insert_membership" ON tag
    FOR INSERT WITH CHECK (
        public.user_has_tenant_access(tenant_id)
    );

CREATE POLICY "tag_update_membership" ON tag
    FOR UPDATE USING (
        public.user_has_tenant_access(tenant_id)
    ) WITH CHECK (
        public.user_has_tenant_access(tenant_id)
    );

CREATE POLICY "tag_delete_membership" ON tag
    FOR DELETE USING (
        public.user_has_tenant_access(tenant_id)
    );

-- Create new membership-based policies for receipt_tag
CREATE POLICY "receipt_tag_select_membership" ON receipt_tag
    FOR SELECT USING (
        public.user_has_tenant_access(tenant_id)
    );

CREATE POLICY "receipt_tag_insert_membership" ON receipt_tag
    FOR INSERT WITH CHECK (
        public.user_has_tenant_access(tenant_id)
    );

CREATE POLICY "receipt_tag_update_membership" ON receipt_tag
    FOR UPDATE USING (
        public.user_has_tenant_access(tenant_id)
    ) WITH CHECK (
        public.user_has_tenant_access(tenant_id)
    );

CREATE POLICY "receipt_tag_delete_membership" ON receipt_tag
    FOR DELETE USING (
        public.user_has_tenant_access(tenant_id)
    );

-- Create new membership-based policies for receipt_item_tag
CREATE POLICY "receipt_item_tag_select_membership" ON receipt_item_tag
    FOR SELECT USING (
        public.user_has_tenant_access(tenant_id)
    );

CREATE POLICY "receipt_item_tag_insert_membership" ON receipt_item_tag
    FOR INSERT WITH CHECK (
        public.user_has_tenant_access(tenant_id)
    );

CREATE POLICY "receipt_item_tag_update_membership" ON receipt_item_tag
    FOR UPDATE USING (
        public.user_has_tenant_access(tenant_id)
    ) WITH CHECK (
        public.user_has_tenant_access(tenant_id)
    );

CREATE POLICY "receipt_item_tag_delete_membership" ON receipt_item_tag
    FOR DELETE USING (
        public.user_has_tenant_access(tenant_id)
    );

-- Ensure proper permissions are granted for the tagging system
GRANT ALL ON tag_category TO authenticated;
GRANT ALL ON tag TO authenticated;
GRANT ALL ON receipt_tag TO authenticated;
GRANT ALL ON receipt_item_tag TO authenticated;

-- Add comments for documentation
COMMENT ON POLICY "tag_category_select_membership" ON tag_category IS 'Allow users to view tag categories in their accessible tenants (membership-based)';
COMMENT ON POLICY "tag_category_insert_membership" ON tag_category IS 'Allow users to create tag categories in their accessible tenants (membership-based)';
COMMENT ON POLICY "tag_category_update_membership" ON tag_category IS 'Allow users to update tag categories in their accessible tenants (membership-based)';
COMMENT ON POLICY "tag_category_delete_membership" ON tag_category IS 'Allow users to delete tag categories in their accessible tenants (membership-based)';

COMMENT ON POLICY "tag_select_membership" ON tag IS 'Allow users to view tags in their accessible tenants (membership-based)';
COMMENT ON POLICY "tag_insert_membership" ON tag IS 'Allow users to create tags in their accessible tenants (membership-based)';
COMMENT ON POLICY "tag_update_membership" ON tag IS 'Allow users to update tags in their accessible tenants (membership-based)';
COMMENT ON POLICY "tag_delete_membership" ON tag IS 'Allow users to delete tags in their accessible tenants (membership-based)';

COMMENT ON POLICY "receipt_tag_select_membership" ON receipt_tag IS 'Allow users to view receipt tags in their accessible tenants (membership-based)';
COMMENT ON POLICY "receipt_tag_insert_membership" ON receipt_tag IS 'Allow users to create receipt tags in their accessible tenants (membership-based)';
COMMENT ON POLICY "receipt_tag_update_membership" ON receipt_tag IS 'Allow users to update receipt tags in their accessible tenants (membership-based)';
COMMENT ON POLICY "receipt_tag_delete_membership" ON receipt_tag IS 'Allow users to delete receipt tags in their accessible tenants (membership-based)';

COMMENT ON POLICY "receipt_item_tag_select_membership" ON receipt_item_tag IS 'Allow users to view receipt item tags in their accessible tenants (membership-based)';
COMMENT ON POLICY "receipt_item_tag_insert_membership" ON receipt_item_tag IS 'Allow users to create receipt item tags in their accessible tenants (membership-based)';
COMMENT ON POLICY "receipt_item_tag_update_membership" ON receipt_item_tag IS 'Allow users to update receipt item tags in their accessible tenants (membership-based)';
COMMENT ON POLICY "receipt_item_tag_delete_membership" ON receipt_item_tag IS 'Allow users to delete receipt item tags in their accessible tenants (membership-based)';

-- NOTE: RLS remains DISABLED for these tables during Phase 1
-- These policies will become active when RLS is re-enabled in Phase 2