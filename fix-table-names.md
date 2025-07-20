# Table Name Fixes Needed

## Files to Update (Singular → Plural):

1. **lib/supabase/auth.ts**
   - Change: `.from('user')` → `.from('users')`
   - 3 occurrences

2. **lib/supabase/tenant.ts**
   - Change: `.from('membership')` → `.from('memberships')`
   - 3 occurrences

3. **app/api/chat/route.ts**
   - Change: `.from('receipt')` → `.from('receipts')`
   - 2 occurrences

4. **app/api/debug/receipt-discrepancy/route.ts**
   - Change: `.from('receipt')` → `.from('receipts')`
   - 1 occurrence

5. **app/api/admin/stats/route.ts**
   - Change: `.from('receipt')` → `.from('receipts')`
   - 2 occurrences

6. **app/api/debug/tags/route.ts**
   - Change: `.from('receipt_item')` → `.from('receipt_items')`
   - Change: `.from('receipt_item_tag')` → `.from('receipt_item_tags')`

## Database Cleanup SQL:

```sql
-- After updating the code, run this to clean up singular tables:
DROP TABLE IF EXISTS public.user CASCADE;
DROP TABLE IF EXISTS public.tenant CASCADE;
DROP TABLE IF EXISTS public.membership CASCADE;
DROP TABLE IF EXISTS public.receipt CASCADE;
DROP TABLE IF EXISTS public.receipt_item CASCADE;
DROP TABLE IF EXISTS public.receipt_item_tag CASCADE;
```