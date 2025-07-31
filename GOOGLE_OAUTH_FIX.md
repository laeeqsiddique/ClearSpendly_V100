# Fix Google OAuth "Authentication Service Unavailable" Error

## Root Cause
The error occurs because the Supabase environment variables are not properly set in your Railway deployment. The `.env.railway` file contains placeholder values that need to be replaced with actual credentials.

## Immediate Fix Steps

### 1. Get Your Supabase Credentials
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy these values:
   - **Project URL**: `https://[YOUR-PROJECT-ID].supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 2. Configure Railway Environment Variables
1. Go to your [Railway Dashboard](https://railway.app)
2. Select your ClearSpendly project
3. Click on your service
4. Go to the **Variables** tab
5. Add these variables with your actual values:

```bash
# CRITICAL - Replace with your actual Supabase values
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Your deployed app URL
NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
```

### 3. Enable Google OAuth in Supabase
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable **Google** provider
3. Add your Google OAuth credentials (if you have them)
4. Add this to **Redirect URLs**:
   ```
   https://your-app.up.railway.app/auth/callback
   ```

### 4. (Optional) Configure Google OAuth
If you want Google sign-in to work:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add these to Railway:
   ```bash
   GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```
6. Add authorized redirect URI in Google Console:
   ```
   https://your-app.up.railway.app/auth/callback
   ```

### 5. Redeploy Your Service
After adding all environment variables, redeploy your Railway service for changes to take effect.

## Verification Steps

### Local Testing
Run this command locally with your production env vars:
```bash
npm run railway:check-env
```

### Production Testing
1. Visit your deployed app
2. Try signing in with email first (should work if Supabase is configured)
3. Try Google sign-in (will work only if Google OAuth is configured)

## Common Issues

### Issue: Still seeing "Authentication Service Unavailable"
- **Cause**: Environment variables not loaded in production
- **Fix**: Ensure variables are added in Railway dashboard, not just in files

### Issue: Google sign-in redirects but fails
- **Cause**: Redirect URL mismatch
- **Fix**: Ensure the redirect URL in Supabase matches your Railway app URL exactly

### Issue: Build fails after adding variables
- **Cause**: Invalid environment variable format
- **Fix**: Ensure no quotes around values in Railway dashboard

## Debugging Commands

Check environment in production:
```bash
# SSH into Railway (if available) and run:
node scripts/check-railway-env.js
```

## Working Example Configuration

Here's what your Railway variables should look like (with your actual values):

```
NEXT_PUBLIC_SUPABASE_URL=https://chuhbgcwjjldivnwyvia.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodWhiZ2N3ampqbGRpdm53eXZpYSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM3NDkyNDc4LCJleHAiOjIwNTMwNjg0Nzh9.Wk3K5M6789QaBcDeFgHiJk012
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
NEXT_PUBLIC_APP_URL=https://clearspendly.up.railway.app
```

## Need More Help?

1. Check Railway logs: `railway logs`
2. Check browser console for client-side errors
3. Use the debug endpoint (in development): `/api/debug/auth-config`