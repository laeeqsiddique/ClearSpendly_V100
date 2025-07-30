# Comprehensive Onboarding Flow Test Plan

## Overview
This test plan verifies that the onboarding flow completes successfully, users are redirected to the dashboard, and RLS policies work correctly with the implemented fixes.

## Prerequisites
- Clean test user account (no existing tenant/membership)
- Browser developer tools open for console monitoring
- Supabase dashboard access to verify database records

## Test Scenarios

### 1. New User Complete Onboarding Flow

**Test Steps:**
1. Create a new user account via sign-up
2. Verify redirect to `/onboarding` page
3. Complete all onboarding steps
4. Click "Get Started" on final step

**Expected Results:**
- User sees all 3 onboarding steps
- No console errors during navigation
- After clicking "Get Started":
  - Loading spinner appears
  - Success toast: "Welcome to ClearSpendly! Setting up your dashboard..."
  - Redirect to `/dashboard` within 1-3 seconds
  - Dashboard loads successfully without redirect loops

**Console Logs to Monitor:**
```
Setting up tenant for user: [email] [user_id]
Creating user record for: [email]
Creating tenant with slug: [slug]
Created new tenant: [tenant_id] [tenant_name]
Creating membership for user: [user_id] tenant: [tenant_id]
Membership created successfully: [membership_id]
Tenant setup successful: {success: true, ...}
User metadata updated: {...}
Session refreshed: {...}
Membership verified: [tenant_id]
```

**Database Verification:**
- Check `user` table: User record exists with correct ID
- Check `tenant` table: New tenant created with unique slug
- Check `membership` table: 
  - Membership exists linking user to tenant
  - Role is "owner"
  - status is "active"
  - accepted_at is set
- Check auth.users metadata: `onboarding_completed: true`

### 2. New User Skip Onboarding

**Test Steps:**
1. Create a new user account
2. On onboarding page, click "Skip to dashboard"

**Expected Results:**
- Loading spinner appears on skip button
- Success toast: "Account setup complete!"
- Redirect to `/dashboard` within 1 second
- Dashboard loads successfully

**Console Logs to Monitor:**
```
Setting up tenant and membership (skip)...
Tenant setup successful (skip): {success: true, ...}
```

### 3. Existing User with Completed Onboarding

**Test Steps:**
1. Sign in with user who has completed onboarding
2. Navigate to `/onboarding` directly

**Expected Results:**
- Immediate redirect to `/dashboard`
- No onboarding steps shown

**Console Logs to Monitor:**
```
User already has completed onboarding and has membership, redirecting to dashboard
```

### 4. User with Partial Setup (Edge Case)

**Test Steps:**
1. Manually set `onboarding_completed: true` in user metadata without membership
2. Sign in and navigate to dashboard

**Expected Results:**
- Middleware detects inconsistency
- Clears onboarding_completed flag
- Redirects to `/onboarding`
- User can complete setup normally

**Console Logs to Monitor (in middleware):**
```
No membership found but onboarding completed - data inconsistency
Attempting to fix by re-running tenant setup
```

### 5. RLS Policy Verification

**Test Steps:**
1. Complete onboarding for a test user
2. Navigate to dashboard
3. Upload a receipt
4. View receipts list

**Expected Results:**
- All operations succeed without RLS errors
- User can only see their own receipts
- No permission denied errors in console

**Console Logs to Monitor:**
- No errors with code `42501` (RLS policy violation)
- No errors with code `PGRST301` (permission denied)

## Error Scenarios to Test

### 1. Network Failure During Setup

**Test Steps:**
1. Use browser dev tools to throttle network
2. Complete onboarding steps
3. Click "Get Started"

**Expected Results:**
- Error toast appears with specific message
- User remains on onboarding page
- Can retry by clicking "Get Started" again

### 2. Duplicate Tenant Setup Attempt

**Test Steps:**
1. Complete onboarding successfully
2. Clear browser storage but keep auth session
3. Navigate to `/onboarding` again
4. Click "Get Started"

**Expected Results:**
- API returns success with message "Tenant setup already completed"
- User redirected to dashboard
- No duplicate records created

## Performance Monitoring

### Page Load Times
- Onboarding page: < 1 second
- Dashboard redirect: < 3 seconds total
- API setup-tenant call: < 2 seconds

### Console Warning Signs
Watch for these indicators of issues:
- Multiple redirect attempts
- RLS policy errors (42501, PGRST301)
- Repeated membership queries
- Session refresh failures

## Debugging Checklist

If onboarding fails or loops occur:

1. **Check Browser Console**
   - Look for specific error codes
   - Note the last successful log before failure
   - Check for network request failures

2. **Verify Database State**
   ```sql
   -- Check user exists
   SELECT * FROM auth.users WHERE email = 'test@example.com';
   
   -- Check user record
   SELECT * FROM public.user WHERE id = '[user_id]';
   
   -- Check membership
   SELECT * FROM public.membership WHERE user_id = '[user_id]';
   
   -- Check tenant
   SELECT * FROM public.tenant WHERE id = '[tenant_id]';
   ```

3. **Check User Metadata**
   ```sql
   SELECT raw_user_meta_data FROM auth.users WHERE id = '[user_id]';
   ```

4. **Test RLS Policies**
   ```sql
   -- Test as specific user
   SET LOCAL role TO authenticated;
   SET LOCAL request.jwt.claims.sub TO '[user_id]';
   
   -- Try to query membership
   SELECT * FROM public.membership WHERE user_id = '[user_id]';
   ```

## Success Criteria

The onboarding flow is considered successful when:

1. ✅ New users can complete onboarding without errors
2. ✅ Users are redirected to dashboard after completion
3. ✅ No redirect loops occur
4. ✅ Skip functionality works correctly
5. ✅ Existing users bypass onboarding appropriately
6. ✅ All database records are created correctly
7. ✅ RLS policies don't block legitimate access
8. ✅ User metadata is updated properly
9. ✅ Dashboard loads and functions normally after onboarding
10. ✅ No console errors during the entire flow

## Post-Test Cleanup

After testing, clean up test data:

```sql
-- Remove test user and cascade delete related records
DELETE FROM auth.users WHERE email = 'test@example.com';
```

This will cascade delete:
- User record in public.user
- Membership records
- Tenant (if no other members)
- All related receipts and tags