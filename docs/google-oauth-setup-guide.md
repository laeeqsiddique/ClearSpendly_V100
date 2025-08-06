# Google OAuth Setup Guide for Flowvya

This guide walks through setting up Google OAuth authentication for the Flowvya application.

## Prerequisites

- Google Cloud Console access
- Supabase project configured
- Domain names configured (production and staging)

## Step 1: Google Cloud Console Setup

1. **Create or Select a Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing project

2. **Enable Google+ API**
   - Go to APIs & Services > Library
   - Search for "Google+ API" or "People API"
   - Enable the API

3. **Create OAuth 2.0 Credentials**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application" as application type

4. **Configure OAuth Consent Screen**
   - Go to APIs & Services > OAuth consent screen
   - Fill in application name: "Flowvya"
   - Add your domain: www.flowvya.com
   - Add scopes: email, profile, openid

## Step 2: Configure Authorized Redirect URIs

Add these redirect URIs to your Google OAuth client:

### Development
```
http://localhost:54321/auth/v1/callback
```

### Staging
```
https://[your-supabase-staging-url]/auth/v1/callback
```

### Production
```
https://[your-supabase-production-url]/auth/v1/callback
```

## Step 3: Environment Variables

Add these to your environment files:

### .env.local (Development)
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Production Environment (Railway/Vercel)
Set the same environment variables in your deployment platform.

## Step 4: Supabase Configuration

The application is already configured to use Google OAuth. Ensure your Supabase project has:

1. **Auth Settings**
   - Site URL configured correctly for each environment
   - Additional redirect URLs added

2. **External Providers**
   - Google OAuth enabled with your client ID and secret

## Step 5: Testing

### Development Testing
1. Start local Supabase: `supabase start`
2. Run the application: `npm run dev`
3. Test Google sign-in at: http://localhost:3000/sign-in

### Production Testing
1. Deploy with environment variables set
2. Test at your production URL

## Troubleshooting

### Common Issues

1. **"Redirect URI mismatch"**
   - Ensure all redirect URIs are exactly configured in Google Console
   - Check for trailing slashes and http vs https

2. **"OAuth client not found"**
   - Verify GOOGLE_CLIENT_ID is correct
   - Ensure the OAuth client exists in Google Console

3. **"Invalid client secret"**
   - Verify GOOGLE_CLIENT_SECRET is correct
   - Regenerate client secret if needed

4. **Silent failures**
   - Check browser dev tools for errors
   - Verify Supabase configuration matches environment

### Debug Steps

1. **Check Environment Variables**
   ```bash
   # In development
   echo $GOOGLE_CLIENT_ID
   echo $GOOGLE_CLIENT_SECRET
   ```

2. **Verify Supabase Auth Settings**
   - Check Supabase Dashboard > Authentication > Settings
   - Ensure Google provider is enabled

3. **Test OAuth Flow**
   - Use browser dev tools to trace network requests
   - Check for any 4xx/5xx responses

## Security Considerations

1. **Environment Variables**
   - Never commit OAuth secrets to version control
   - Use different credentials for staging and production

2. **Redirect URIs**
   - Only add necessary redirect URIs
   - Use HTTPS in production

3. **Scopes**
   - Request only necessary OAuth scopes
   - Review permissions requested from users

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)