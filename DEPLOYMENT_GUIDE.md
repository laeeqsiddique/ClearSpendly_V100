# Flowvya Production Deployment Guide

## 🚨 CRITICAL: Read Security Audit First

**⚠️ STOP**: Before proceeding with deployment, you MUST address critical security vulnerabilities:

1. **Remove exposed API keys** from `test-vision-api.js` and `test-openai-direct.js`
2. **Fix client-side API key exposure** in AI components
3. **Rotate compromised OpenAI API keys**

See `SECURITY_AUDIT.md` for complete details.

## 📋 Prerequisites

### Required Accounts & Services
- [ ] **Railway Account** (primary deployment platform)
- [ ] **Supabase Project** (database and authentication)
- [ ] **Domain Name** (for production URL)
- [ ] **Payment Providers** (at least one):
  - Stripe account (recommended)
  - PayPal business account
- [ ] **Email Service** (recommended):
  - Resend account for transactional emails

### Optional Services
- [ ] **OpenAI API** (for enhanced OCR)
- [ ] **Google Cloud Console** (for OAuth)
- [ ] **PostHog** (for analytics)
- [ ] **Error Monitoring** (Sentry, LogRocket, etc.)

## 🗄️ Database Setup (Supabase)

### 1. Create Supabase Project

```bash
# 1. Create new project at supabase.com
# 2. Note down your project details:
#    - Project URL: https://your-project.supabase.co
#    - Anon Key: eyJhbGciOiJIUzI1NiIs...
#    - Service Role Key: eyJhbGciOiJIUzI1NiIs... (keep secret!)
```

### 2. Database Configuration

```sql
-- Apply database migrations
-- These should be in your supabase/migrations/ directory

-- Check required tables exist:
-- - tenants
-- - invoices
-- - payment_provider
-- - email_templates
-- - receipt_items
-- And other application tables
```

### 3. Authentication Setup

```bash
# Configure OAuth providers in Supabase Dashboard:
# 1. Go to Authentication > Providers
# 2. Enable Google OAuth (if using)
# 3. Set authorized domains: your-domain.com
# 4. Configure redirect URLs: https://your-domain.com/auth/callback
```

## 🚀 Railway Deployment

### 1. Initial Setup

```bash
# 1. Fork/clone your repository
# 2. Connect to Railway:
#    - Go to railway.app
#    - Create new project
#    - Connect GitHub repository
#    - Select main/master branch
```

### 2. Environment Variables Configuration

**In Railway Dashboard > Variables, add:**

#### Core Required Variables
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
RAILWAY_ENVIRONMENT=production

# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Authentication (REQUIRED)
BETTER_AUTH_SECRET=minimum-32-character-secret-key-here
BETTER_AUTH_URL=https://your-domain.com
```

#### Payment Configuration (Choose at least one)
```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret

# PayPal
PAYPAL_CLIENT_ID=your-paypal-live-client-id
PAYPAL_CLIENT_SECRET=your-paypal-live-client-secret
PAYPAL_BUSINESS_EMAIL=business@your-domain.com
```

#### Optional Services
```bash
# AI Features
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Email Service
RESEND_API_KEY=re_your-resend-api-key
RESEND_FROM_EMAIL=invoices@your-domain.com

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Security
CRON_SECRET=your-cron-job-secret-key
```

### 3. Build & Deployment Settings

**In Railway Dashboard > Settings:**

```yaml
Build Configuration:
  Build Command: npm run railway:build
  Start Command: npm run railway:start
  
Resource Allocation:
  Memory: 2GB (minimum 1GB)
  CPU: Shared (upgrade if needed)
  
Health Check:
  Path: /api/health
  Timeout: 30s
  
Auto-Deploy:
  Branch: main
  Auto-deploy: enabled
```

### 4. Custom Domain Setup

```bash
# 1. In Railway Dashboard > Settings > Domains
# 2. Add custom domain: your-domain.com
# 3. Configure DNS records:
#    Type: CNAME
#    Name: @ (or subdomain)
#    Value: your-project.railway.app
# 4. Wait for SSL certificate provisioning (5-10 minutes)
```

## 💳 Payment Provider Configuration

### Stripe Setup

```bash
# 1. Create Stripe account and activate
# 2. Get live API keys from Stripe Dashboard
# 3. Configure webhooks:
#    URL: https://your-domain.com/api/webhooks/stripe
#    Events: payment_intent.succeeded, invoice.payment_succeeded
# 4. Add webhook secret to Railway environment
```

### PayPal Setup

```bash
# 1. Create PayPal Business account
# 2. Go to PayPal Developer Console
# 3. Create live application
# 4. Get Client ID and Secret
# 5. Webhooks configured per-tenant automatically
```

## 📧 Email Service Configuration

### Resend Setup (Recommended)

```bash
# 1. Create account at resend.com
# 2. Verify your domain
# 3. Get API key from dashboard
# 4. Configure DNS records for email authentication:
#    - SPF record
#    - DKIM record
#    - DMARC record (optional but recommended)
```

### Email Templates

```bash
# Email templates are stored in database
# Default templates will be created automatically
# Customize via application admin interface after deployment
```

## 🔐 Security Configuration

### 1. OAuth Providers

#### Google OAuth (Optional)
```bash
# 1. Go to Google Cloud Console
# 2. Create new project or select existing
# 3. Enable Google+ API
# 4. Create OAuth 2.0 credentials
# 5. Add authorized domains: your-domain.com
# 6. Redirect URIs: https://your-domain.com/auth/callback
```

### 2. Webhook Security

```bash
# All webhook endpoints should be secured:
# - Stripe: Uses webhook secrets for verification
# - PayPal: Implements signature verification
# - Custom webhooks: Protected with CRON_SECRET
```

### 3. CORS Configuration

```bash
# Automatically configured for production domain
# Additional domains can be added in next.config.ts if needed
```

## 📊 Monitoring & Analytics

### PostHog Analytics Setup

```bash
# 1. Create account at posthog.com
# 2. Get project key from dashboard
# 3. Add to Railway environment variables
# 4. Analytics automatically enabled for production
```

### Health Monitoring

```bash
# Built-in health check endpoints:
https://your-domain.com/api/health          # Application health
https://your-domain.com/api/health/db       # Database connectivity  
https://your-domain.com/api/health/tenant   # Tenant system
https://your-domain.com/api/health/ai       # AI services
```

## 🚀 Deployment Process

### 1. Pre-Deployment Checklist

```bash
# Run local validation
npm run validate-deployment

# Security audit
npm run security:audit  # (create this script)

# Build test
npm run build

# Environment test
npm run railway:check-env
```

### 2. Deploy to Railway

```bash
# Method 1: Automatic (Recommended)
# - Push to main branch
# - Railway automatically builds and deploys

# Method 2: Manual Deploy
# - Use Railway CLI
railway login
railway deploy
```

### 3. Post-Deployment Verification

```bash
# 1. Check application status
curl https://your-domain.com/api/health

# 2. Test authentication
# Visit your-domain.com and try sign up/sign in

# 3. Test core functionality
# - Create invoice
# - Process payment (test mode)
# - Send email (if configured)

# 4. Monitor logs
# Check Railway dashboard for errors
```

## 🔧 Configuration Management

### Environment Variable Management

```typescript
// Use this pattern for all environment variables
export const config = {
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    environment: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  // ... other config
}

// Validation function
export function validateConfig() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'BETTER_AUTH_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

### Feature Flags

```typescript
// Built-in feature detection
export const features = {
  payments: {
    stripe: !!process.env.STRIPE_SECRET_KEY,
    paypal: !!process.env.PAYPAL_CLIENT_ID,
  },
  ai: {
    openai: !!process.env.OPENAI_API_KEY,
    ollama: !!process.env.OLLAMA_API_URL,
  },
  email: {
    resend: !!process.env.RESEND_API_KEY,
  },
  oauth: {
    google: !!process.env.GOOGLE_CLIENT_ID,
  }
};
```

## 🔄 Backup & Recovery

### Database Backup

```bash
# Supabase provides automatic backups
# For additional security, set up manual backups:

# Daily backup script (add to cron job)
npx supabase db dump --file backup-$(date +%Y%m%d).sql
```

### Application Rollback

```bash
# Railway maintains deployment history
# Rollback via Dashboard > Deployments > Previous Version

# Or via CLI:
railway rollback
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check environment variables are set
# Verify Node.js version compatibility  
# Review build logs in Railway dashboard

# Common fixes:
NODE_OPTIONS=--max-old-space-size=4096
```

#### 2. Database Connection Issues
```bash
# Verify Supabase URLs and keys
# Check network connectivity
# Review RLS policies

# Test connection:
curl https://your-project.supabase.co/rest/v1/health
```

#### 3. Authentication Problems
```bash
# Check OAuth redirect URLs
# Verify domain configuration
# Review CORS settings

# Test auth endpoint:
curl https://your-domain.com/auth/callback
```

### Support Resources

- **Railway Support**: https://railway.app/help
- **Supabase Support**: https://supabase.com/support  
- **Application Logs**: Railway Dashboard > Logs
- **Error Monitoring**: Configure Sentry or similar

## ✅ Go-Live Checklist

### Final Verification

- [ ] **Security**
  - [ ] All API keys secured and rotated
  - [ ] No secrets exposed in client code
  - [ ] HTTPS enabled with valid SSL
  - [ ] Webhook endpoints secured

- [ ] **Functionality**  
  - [ ] User authentication working
  - [ ] Database operations functional
  - [ ] Payment processing tested
  - [ ] Email delivery verified
  - [ ] File uploads working

- [ ] **Performance**
  - [ ] Health checks passing
  - [ ] Response times acceptable (<2s)
  - [ ] Error rates minimal (<1%)
  - [ ] Monitoring alerts configured

- [ ] **Business Continuity**
  - [ ] Admin access configured
  - [ ] Backup procedures tested
  - [ ] Rollback plan documented
  - [ ] Support contacts updated

---

**🎉 Congratulations!** Your Flowvya application should now be live in production.

Remember to monitor the application closely during the first 24 hours and address any issues promptly.