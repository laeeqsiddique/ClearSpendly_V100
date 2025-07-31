# Fix Supabase OAuth Redirect URL Error

## Current Issue
- **Error**: 400 Bad Request when clicking "Sign in with Google"
- **Cause**: Redirect URL mismatch between your Railway app and Supabase configuration

## Your Current Setup
- **Railway App URL**: `https://7qosagg6.up.railway.app`
- **Configured Redirect**: `https://www.flowvya.com/auth/callback`
- **Status**: ❌ Mismatch causing 400 error

## Fix Steps

### 1. Update Supabase Dashboard (Required)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `chuhbgcwjjldivnwyvia`
3. Navigate to: **Authentication → URL Configuration**
4. In **Redirect URLs**, add ALL of these:
   ```
   https://7qosagg6.up.railway.app/auth/callback
   https://www.flowvya.com/auth/callback
   http://localhost:3000/auth/callback
   ```
5. Click **Save**

### 2. Update Google Cloud Console (If using custom OAuth)

If you configured Google OAuth directly (not just through Supabase):

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to: **APIs & Services → Credentials**
4. Click on your OAuth 2.0 Client ID
5. Add to **Authorized redirect URIs**:
   ```
   https://7qosagg6.up.railway.app/auth/callback
   ```
6. Save changes

### 3. Verify Railway Environment Variables

In Railway dashboard, ensure:
```
NEXT_PUBLIC_APP_URL=https://7qosagg6.up.railway.app
```

### 4. Test Authentication Flow

1. Clear browser cache/cookies
2. Go to: `https://7qosagg6.up.railway.app/sign-in`
3. Click "Continue with Google"
4. Should redirect to Google → then back to your app

## Alternative: Use Custom Domain

If you own `flowvya.com`:

1. Add custom domain in Railway:
   - Go to Railway project settings
   - Add domain: `www.flowvya.com`
   - Configure DNS records as instructed

2. Then OAuth will work with the flowvya.com URLs

## Debugging

Check browser console for:
```javascript
// Should show your Railway URL
console.log(window.location.origin)
// Output: https://7qosagg6.up.railway.app
```

## Common Issues

### Still getting 400 error?
- Wait 2-3 minutes for Supabase changes to propagate
- Clear browser cache completely
- Try incognito/private window

### Redirect loop?
- Check that `/auth/callback` route exists in your app
- Verify no middleware is blocking the callback

### Works locally but not in production?
- Double-check ALL redirect URLs are added in Supabase
- Ensure production environment variables are set correctly