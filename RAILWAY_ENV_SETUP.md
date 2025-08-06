# Railway Environment Variables Setup Guide

## 🚨 CRITICAL: Required for Deployment

Your deployment failed because these environment variables are missing. Set them in your Railway dashboard:

### **Step 1: Get Supabase Credentials**

1. **Go to [supabase.com/dashboard](https://supabase.com/dashboard)**
2. **Select your Flowvya project**
3. **Go to Settings > API**
4. **Copy these values:**

```bash
# From Project Settings > General
SUPABASE_PROJECT_REF=your-project-id-here

# From Settings > API > Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# From Settings > API > anon public key
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# From Settings > API > service_role secret key (NEVER expose client-side)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

5. **Go to [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)**
6. **Create a new access token:**

```bash
# Personal access token for CLI operations
SUPABASE_ACCESS_TOKEN=sbp_your-access-token-here
```

### **Step 2: Set in Railway Dashboard**

1. **Open Railway Dashboard:**
   - Go to [railway.app/dashboard](https://railway.app/dashboard)
   - Select your Flowvya project
   - Go to your service settings

2. **Add Environment Variables:**

#### **Critical Variables (REQUIRED):**
```bash
NODE_ENV=production
SUPABASE_PROJECT_REF=your-project-id
SUPABASE_ACCESS_TOKEN=sbp_your-access-token
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BETTER_AUTH_SECRET=generate-32-character-secret-here
BETTER_AUTH_URL=https://your-railway-domain.up.railway.app
```

#### **Optional but Recommended:**
```bash
# Google OAuth (for sign-in)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Features (server-side only)
OPENAI_API_KEY=sk-proj-your-openai-key

# Payment Processing
STRIPE_SECRET_KEY=sk_live_or_sk_test_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Email Service
RESEND_API_KEY=re_your-resend-key
RESEND_FROM_EMAIL=invoices@yourdomain.com
```

### **Step 3: Generate Required Secrets**

#### **Generate BETTER_AUTH_SECRET:**
```bash
# Run this command to generate a secure secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### **Get Railway Domain:**
Your app URL will be: `https://your-app-name.up.railway.app`

### **Step 4: Railway CLI Setup (Alternative)**

If you prefer CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link your service
railway service

# Set environment variables
railway variables set SUPABASE_PROJECT_REF=your-project-id
railway variables set SUPABASE_ACCESS_TOKEN=sbp_your-token
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-key
railway variables set BETTER_AUTH_SECRET=your-32-char-secret
railway variables set NODE_ENV=production
```

### **Step 5: Apply Database Migrations**

After setting environment variables:

```bash
# Apply the new migrations
npm run deployment:migrate
```

### **Step 6: Deploy**

```bash
# Deploy to Railway
git push origin master
# OR
railway up
```

## ⚠️ Important Notes:

1. **Never commit secrets to git** - Only set them in Railway dashboard
2. **SUPABASE_SERVICE_ROLE_KEY** - Keep this secret, never expose client-side
3. **BETTER_AUTH_SECRET** - Must be at least 32 characters
4. **Domain consistency** - Make sure BETTER_AUTH_URL matches your actual Railway domain

## 🔧 Troubleshooting:

### If deployment still fails:
1. Check Railway logs for specific error messages
2. Verify all environment variables are set correctly
3. Make sure Supabase project is active and accessible
4. Test database connection from Supabase dashboard

### Common Issues:
- **Invalid Supabase URL** - Check the URL format and project status
- **Expired tokens** - Regenerate access token if needed
- **Wrong project reference** - Verify project ID in Supabase URL
- **Missing service role key** - Make sure you copied the secret key, not public key

## 🚀 After Successful Deployment:

1. Test authentication at: `https://your-domain.up.railway.app/sign-in`
2. Check health endpoint: `https://your-domain.up.railway.app/api/health`
3. Verify database migrations: Check Supabase > SQL Editor for new tables

Your app should be live and ready to use! 🎉