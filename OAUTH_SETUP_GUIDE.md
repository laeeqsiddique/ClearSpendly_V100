# OAuth Setup Guide for Production

The OAuth flow is still redirecting to localhost because the redirect URI needs to be configured in both Supabase and Google Cloud Console.

## Issue Analysis

You're seeing:
```
http://localhost:3000/dashboard#error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user
```

This indicates two problems:
1. **Redirect URI Mismatch**: OAuth is redirecting to `localhost:3000` instead of `flowvya.com`
2. **Database Error**: Supabase can't save the new user due to configuration issues

## Required Fixes

### 1. Configure Supabase OAuth Redirect URLs

In your Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Update the **Site URL** to: `https://www.flowvya.com`
3. Add **Redirect URLs**:
   - `https://www.flowvya.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

### 2. Configure Google OAuth in Supabase

In your Supabase Dashboard:

1. Go to **Authentication** → **Providers** → **Google**
2. Enable Google provider
3. Add your Google OAuth credentials:
   - **Client ID**: (from Google Cloud Console)
   - **Client Secret**: (from Google Cloud Console)

### 3. Configure Google Cloud Console

In your Google Cloud Console:

1. Go to **APIs & Services** → **Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add **Authorized redirect URIs**:
   - `https://supabase.co/auth/v1/callback`
   - `https://[your-project-id].supabase.co/auth/v1/callback`
   
   (Replace `[your-project-id]` with your actual Supabase project ID)

### 4. Set Environment Variables in Railway

Make sure these environment variables are set in Railway:

```
NEXT_PUBLIC_APP_URL=https://www.flowvya.com
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
```

### 5. Test the Flow

1. Deploy the updated code to Railway
2. Visit `https://www.flowvya.com/sign-up`
3. Click "Continue with Google"
4. Complete the OAuth flow
5. Should redirect back to `https://www.flowvya.com/auth/callback` and then to onboarding

## Debugging

If you're still having issues:

1. Check Railway logs: `railway logs`
2. Check Supabase logs in the Dashboard
3. Verify environment variables: `railway variables`

## Current Code Changes

I've updated the code to:
- Always use `NEXT_PUBLIC_APP_URL` when set
- Fallback to Railway domain construction
- Better error logging in auth callback
- Consistent URL handling across all OAuth flows

The main issue is likely the Supabase redirect URI configuration, not the code itself.