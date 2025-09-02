# Google OAuth Production Testing Guide

## Overview
This guide provides a comprehensive strategy for testing Google OAuth functionality in production with proper cleanup procedures.

## Pre-Testing Checklist

### 1. Verify Configuration
```bash
# Test the auth config endpoint (development only)
curl https://your-domain.com/api/debug/auth-config
```

Expected response should show:
- `hasClientId: true`
- `hasClientSecret: true`  
- `googleAuthEnabled: true`

### 2. Verify OAuth URLs
Ensure these URLs are configured in Google Cloud Console:
- **Authorized JavaScript origins**: `https://www.flowvya.com`
- **Authorized redirect URIs**: 
  - `https://your-supabase-project.supabase.co/auth/v1/callback`
  - `https://www.flowvya.com/auth/callback`

## Testing Process

### Test Account Creation
1. **Use a dedicated test email**: Create emails like `test-oauth-1@yourdomain.com`
2. **Test the complete flow**:
   - Go to `https://www.flowvya.com/sign-up`
   - Click "Continue with Google"
   - Complete OAuth flow
   - Verify redirect to onboarding
   - Complete onboarding process
   - Verify dashboard access

### What to Verify
- [ ] OAuth redirect works without errors
- [ ] User is created in Supabase Auth
- [ ] Tenant is created with proper organization name
- [ ] User membership is created
- [ ] Onboarding flow completes
- [ ] User can access dashboard
- [ ] User data is properly associated with tenant

## Clean Deletion Process

### Option 1: SQL Cleanup Script
```sql
-- Clean up test user and related data
-- Replace 'test-oauth-1@yourdomain.com' with actual test email

BEGIN;

-- Get user ID from email
DO $$ 
DECLARE
    test_user_id uuid;
    test_tenant_id uuid;
BEGIN
    -- Find user by email in auth.users (if accessible)
    -- Note: You may need to do this through Supabase dashboard
    
    -- Get user ID from membership table instead
    SELECT user_id, tenant_id INTO test_user_id, test_tenant_id
    FROM membership 
    JOIN tenant ON membership.tenant_id = tenant.id
    WHERE tenant.slug LIKE '%test%' OR tenant.name LIKE '%test%'
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Delete in proper order to respect foreign keys
        DELETE FROM receipt_items WHERE receipt_id IN (
            SELECT id FROM receipts WHERE tenant_id = test_tenant_id
        );
        DELETE FROM receipts WHERE tenant_id = test_tenant_id;
        DELETE FROM invoices WHERE tenant_id = test_tenant_id;
        DELETE FROM membership WHERE user_id = test_user_id;
        DELETE FROM tenant WHERE id = test_tenant_id;
        
        RAISE NOTICE 'Deleted test data for user_id: %, tenant_id: %', test_user_id, test_tenant_id;
    ELSE
        RAISE NOTICE 'No test user found';
    END IF;
END $$;

COMMIT;
```

### Option 2: API Cleanup Endpoint
```typescript
// app/api/admin/cleanup-test-user/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  // Only allow in development or with admin token
  const adminToken = request.headers.get('x-admin-token')
  
  if (process.env.NODE_ENV === 'production' && adminToken !== process.env.ADMIN_CLEANUP_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { email } = await request.json()
  
  if (!email || !email.includes('test')) {
    return NextResponse.json({ error: 'Only test emails allowed' }, { status: 400 })
  }
  
  const supabase = await createClient()
  
  try {
    // Get user membership data
    const { data: membership } = await supabase
      .from('membership')
      .select('user_id, tenant_id, tenant:tenant_id(slug, name)')
      .eq('user_id', 'user-id') // You'll need to get this from auth
      .single()
    
    if (membership) {
      // Delete related data in proper order
      await supabase.from('receipt_items')
        .delete()
        .in('receipt_id', 
          supabase.from('receipts').select('id').eq('tenant_id', membership.tenant_id)
        )
      
      await supabase.from('receipts').delete().eq('tenant_id', membership.tenant_id)
      await supabase.from('invoices').delete().eq('tenant_id', membership.tenant_id)
      await supabase.from('membership').delete().eq('user_id', membership.user_id)
      await supabase.from('tenant').delete().eq('id', membership.tenant_id)
    }
    
    return NextResponse.json({ success: true, deletedUserId: membership?.user_id })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Manual Cleanup via Supabase Dashboard
1. **Go to Supabase Dashboard** > Authentication > Users
2. **Find test user by email** and note the User ID
3. **Go to Table Editor** and clean up in this order:
   - `receipt_items` (filter by receipts from test tenant)
   - `receipts` (filter by tenant_id)
   - `invoices` (filter by tenant_id)  
   - `membership` (filter by user_id)
   - `tenant` (filter by test tenant slug/name)
4. **Delete user** from Authentication > Users

## Automated Testing Script

```bash
#!/bin/bash
# test-oauth-flow.sh

TEST_EMAIL="test-oauth-$(date +%s)@yourdomain.com"
BASE_URL="https://www.flowvya.com"

echo "Testing OAuth flow with email: $TEST_EMAIL"

# You would need to implement automated browser testing here
# using tools like Playwright or Cypress

echo "Manual test required:"
echo "1. Go to $BASE_URL/sign-up"
echo "2. Click 'Continue with Google'"
echo "3. Use email: $TEST_EMAIL"
echo "4. Complete flow and verify functionality"
echo "5. Run cleanup script with this email"
```

## Monitoring Test Success

### Key Metrics to Track
1. **OAuth Success Rate**: Monitor failed OAuth attempts
2. **Tenant Creation Success**: Ensure all OAuth users get tenants
3. **Onboarding Completion**: Track users completing onboarding
4. **Error Rates**: Monitor specific OAuth error types

### Log Analysis
Check Railway logs for:
```
Creating tenant for OAuth user: [Organization Name] ([slug])
Successfully created tenant for OAuth user: {tenantId: ..., userId: ..., organizationName: ..., slug: ...}
```

## Troubleshooting Common Issues

### "Unsupported provider: missing OAuth secret"
- **Cause**: OAuth credentials not configured in Supabase Dashboard
- **Fix**: Add Google Client ID and Secret in Supabase Auth Providers

### "redirect_uri_mismatch" 
- **Cause**: Redirect URI not whitelisted in Google Cloud Console
- **Fix**: Add proper redirect URIs to Google OAuth client

### Tenant creation fails
- **Cause**: Slug generation or database constraints
- **Fix**: Check tenant creation logs and database constraints

## Best Practices

1. **Always use test emails** containing "test" in the address
2. **Test regularly** after any OAuth-related changes
3. **Clean up immediately** after testing
4. **Monitor production logs** for OAuth-related errors
5. **Keep test data minimal** to avoid cluttering production database
6. **Document test scenarios** for consistent testing

## Emergency Rollback

If OAuth breaks in production:
1. **Disable Google Auth**: Set feature flag to false in env config
2. **Redirect users**: Show message directing to email sign-up
3. **Investigate logs**: Check Railway and Supabase logs
4. **Fix and test**: Apply fixes and test thoroughly before re-enabling