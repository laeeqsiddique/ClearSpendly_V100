# Google OAuth Setup for Supabase

## Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Open: https://console.cloud.google.com
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click and Enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - If prompted, configure OAuth consent screen first:
     - User Type: External
     - App name: ClearSpendly (or your app name)
     - User support email: Your email
     - Developer contact: Your email
     - Save and continue through scopes (no special scopes needed)

4. **Configure OAuth Client**
   - Application type: **Web application**
   - Name: "ClearSpendly OAuth" (or any name)
   - Authorized JavaScript origins:
     ```
     https://chuhbgcwjjldivnwyvia.supabase.co
     ```
   - Authorized redirect URIs (IMPORTANT - Add this exact URL):
     ```
     https://chuhbgcwjjldivnwyvia.supabase.co/auth/v1/callback
     ```
   - Click "CREATE"

5. **Copy Credentials**
   - You'll get:
     - Client ID: `1234567890-abcdefg.apps.googleusercontent.com`
     - Client Secret: `GOCSPX-xxxxxxxxxxxxx`

## Step 2: Add to Supabase

1. **Go to Supabase Dashboard**
   - Open: https://app.supabase.com
   - Select your project

2. **Configure Google Provider**
   - Go to Authentication → Providers
   - Find "Google" and toggle it ON
   - Add your credentials:
     - Client ID: (paste from Google)
     - Client Secret: (paste from Google)
   - Click "Save"

## Step 3: Verify Redirect URLs

In Supabase → Authentication → URL Configuration:

**Site URL** should be:
```
https://7qosagg6.up.railway.app
```

**Redirect URLs** should include:
```
https://7qosagg6.up.railway.app/auth/callback
https://www.flowvya.com/auth/callback
http://localhost:3000/auth/callback
```

## Step 4: Test

1. Go to your app: https://7qosagg6.up.railway.app/sign-in
2. Click "Continue with Google"
3. Should redirect to Google login
4. After login, redirects back to your app

## Common Issues

### "Error 400: redirect_uri_mismatch"
- Make sure the redirect URI in Google Console EXACTLY matches:
  ```
  https://chuhbgcwjjldivnwyvia.supabase.co/auth/v1/callback
  ```
- Note: This is Supabase's URL, not your app URL!

### "Access blocked: Authorization Error"
- OAuth consent screen not configured properly
- Go back to OAuth consent screen settings
- Make sure it's published (not in testing mode)

### Still not working?
- Clear browser cookies/cache
- Try incognito window
- Wait 5-10 minutes for Google changes to propagate