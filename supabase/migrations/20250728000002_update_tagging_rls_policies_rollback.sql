-- ROLLBACK: Phase 1 Tagging System RLS Policies Migration
-- This script undoes the policy updates from 20250728000002

-- Drop the new membership-based policies
DROP POLICY IF EXISTS "tag_category_select_membership" ON tag_category;
DROP POLICY IF EXISTS "tag_category_insert_membership" ON tag_category;
DROP POLICY IF EXISTS "tag_category_update_membership" ON tag_category;
DROP POLICY IF EXISTS "tag_category_delete_membership" ON tag_category;

DROP POLICY IF EXISTS "tag_select_membership" ON tag;
DROP POLICY IF EXISTS "tag_insert_membership" ON tag;
DROP POLICY IF EXISTS "tag_update_membership" ON tag;
DROP POLICY IF EXISTS "tag_delete_membership" ON tag;

DROP POLICY IF EXISTS "receipt_tag_select_membership" ON receipt_tag;
DROP POLICY IF EXISTS "receipt_tag_insert_membership" ON receipt_tag;
DROP POLICY IF EXISTS "receipt_tag_update_membership" ON receipt_tag;
DROP POLICY IF EXISTS "receipt_tag_delete_membership" ON receipt_tag;

DROP POLICY IF EXISTS "receipt_item_tag_select_membership" ON receipt_item_tag;
DROP POLICY IF EXISTS "receipt_item_tag_insert_membership" ON receipt_item_tag;
DROP POLICY IF EXISTS "receipt_item_tag_update_membership" ON receipt_item_tag;
DROP POLICY IF EXISTS "receipt_item_tag_delete_membership" ON receipt_item_tag;

-- Restore original current_setting-based policies from tagging-schema.sql
CREATE POLICY "Users can view tag categories for their tenant" ON tag_category
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can manage tag categories for their tenant" ON tag_category
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can view tags for their tenant" ON tag
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can manage tags for their tenant" ON tag
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can view receipt tags for their tenant" ON receipt_tag
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can manage receipt tags for their tenant" ON receipt_tag
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can view receipt item tags for their tenant" ON receipt_item_tag
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can manage receipt item tags for their tenant" ON receipt_item_tag
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Maintain permissions
GRANT ALL ON tag_category TO authenticated;
GRANT ALL ON tag TO authenticated;
GRANT ALL ON receipt_tag TO authenticated;
GRANT ALL ON receipt_item_tag TO authenticated;