# Railway Deployment Checklist for Flowvya

## Pre-Deployment Security & Configuration

### 🔒 Critical Security Tasks

- [ ] **URGENT: Remove hardcoded API keys from test files**
  - [ ] Delete or secure `test-vision-api.js` and `test-openai-direct.js`
  - [ ] These files contain exposed OpenAI API keys that MUST be removed before deployment

- [ ] **Environment Variables Setup**
  - [ ] All required environment variables configured in Railway dashboard
  - [ ] No sensitive data in `.env` files committed to git
  - [ ] Client-side variables properly prefixed with `NEXT_PUBLIC_`

### ⭐ Required Environment Variables (Railway Dashboard)

#### Core Application
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
RAILWAY_ENVIRONMENT=production
```

#### Database & Auth (REQUIRED)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BETTER_AUTH_SECRET=minimum-32-character-secret
BETTER_AUTH_URL=https://your-domain.com
```

#### Optional but Recommended
```bash
# Payment Processing
STRIPE_SECRET_KEY=sk_live_...
PAYPAL_CLIENT_ID=your-paypal-id
PAYPAL_CLIENT_SECRET=your-paypal-secret

# AI Features
OPENAI_API_KEY=sk-proj-...

# Email Service
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=invoices@your-domain.com

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
```

## Railway Platform Configuration

### 🚀 Deployment Settings

- [ ] **Build Configuration**
  - [ ] Build command: `npm run railway:build`
  - [ ] Start command: `npm run railway:start`
  - [ ] Node.js version: >= 20.0.0

- [ ] **Resource Allocation**
  - [ ] Memory: Minimum 1GB (recommended 2GB for AI features)
  - [ ] CPU: Shared CPU sufficient for most workloads
  - [ ] Auto-scaling enabled if available

- [ ] **Domain Configuration**
  - [ ] Custom domain configured and DNS pointing to Railway
  - [ ] SSL certificate automatically provisioned
  - [ ] NEXT_PUBLIC_APP_URL updated to production domain

### 📦 Build Optimization

- [ ] **Performance Settings**
  - [ ] Node options: `--max-old-space-size=4096`
  - [ ] Build timeout increased if needed (default 10 minutes)
  - [ ] Static asset optimization enabled

- [ ] **Dependencies**
  - [ ] All production dependencies installed
  - [ ] Dev dependencies excluded from production build
  - [ ] Package vulnerabilities checked and resolved

## Database & Services Setup

### 🗄️ Supabase Configuration

- [ ] **Database Setup**
  - [ ] Production Supabase project created
  - [ ] Database migrations applied
  - [ ] Row Level Security (RLS) policies configured
  - [ ] Service role key secured (server-side only)

- [ ] **Authentication Configuration**
  - [ ] OAuth providers configured (Google, etc.)
  - [ ] Redirect URLs updated for production domain
  - [ ] Email auth templates customized if needed

### 💳 Payment Provider Setup

- [ ] **Stripe Configuration (if used)**
  - [ ] Production Stripe account activated
  - [ ] Webhook endpoints configured: `https://your-domain.com/api/webhooks/stripe`
  - [ ] Live API keys configured in Railway
  - [ ] Test transactions verified

- [ ] **PayPal Configuration (if used)**
  - [ ] PayPal business account verified
  - [ ] Live API credentials obtained
  - [ ] Webhook endpoints configured for each tenant
  - [ ] IPN/webhook verification implemented

## Security & Monitoring

### 🔐 Security Checklist

- [ ] **API Security**
  - [ ] All API endpoints protected with proper authentication
  - [ ] Rate limiting implemented where needed
  - [ ] CORS configured for production domain only
  - [ ] Sensitive operations require additional verification

- [ ] **Data Protection**
  - [ ] Database connection encrypted (SSL)
  - [ ] Sensitive data encrypted at rest
  - [ ] User data access properly logged
  - [ ] GDPR/privacy compliance verified

### 📊 Monitoring & Logging

- [ ] **Error Tracking**
  - [ ] Error monitoring service configured (Sentry, LogRocket, etc.)
  - [ ] Critical error alerts set up
  - [ ] Performance monitoring enabled

- [ ] **Health Checks**
  - [ ] Health check endpoints responding: `/api/health`
  - [ ] Database connectivity verified: `/api/health/db`
  - [ ] External service checks configured: `/api/health/ai`

## Testing & Validation

### 🧪 Pre-Deployment Testing

- [ ] **Build Validation**
  - [ ] `npm run validate-deployment` passes
  - [ ] Production build completes without errors
  - [ ] No build-time environment variable dependencies

- [ ] **Core Functionality Testing**
  - [ ] User authentication (email, OAuth)
  - [ ] Database operations (CRUD)
  - [ ] File uploads and processing
  - [ ] Invoice generation and PDF creation
  - [ ] Payment processing (test mode first)

### 🚦 Deployment Validation

- [ ] **Post-Deployment Checks**
  - [ ] Application starts successfully
  - [ ] Database connections established
  - [ ] Health endpoints returning 200 OK
  - [ ] Static assets loading correctly
  - [ ] OAuth redirects working
  - [ ] Email sending functional (if configured)

## Post-Deployment Setup

### 🔧 Configuration

- [ ] **Application Settings**
  - [ ] Admin user accounts created
  - [ ] Default tenant/organization configured
  - [ ] Payment provider integrations tested
  - [ ] Email templates configured

- [ ] **Monitoring**
  - [ ] Application metrics baseline established
  - [ ] Log aggregation configured
  - [ ] Backup procedures tested
  - [ ] Incident response plan documented

### 📈 Performance Optimization

- [ ] **Initial Optimization**
  - [ ] Database query performance reviewed
  - [ ] Static asset caching verified
  - [ ] CDN configuration (if applicable)
  - [ ] Image optimization settings verified

## Rollback Plan

### 🔄 Emergency Procedures

- [ ] **Rollback Preparation**
  - [ ] Previous deployment snapshot available
  - [ ] Database rollback plan documented
  - [ ] DNS change procedures documented
  - [ ] Emergency contact list prepared

- [ ] **Monitoring First 24 Hours**
  - [ ] Error rates monitored
  - [ ] Performance metrics tracked
  - [ ] User feedback collected
  - [ ] Critical business functions verified

## Security Issues Found

### ⚠️ CRITICAL SECURITY VULNERABILITIES

1. **Exposed API Keys in Test Files**
   - Files: `test-vision-api.js`, `test-openai-direct.js`
   - Issue: Hardcoded OpenAI API keys committed to repository
   - **ACTION REQUIRED**: Remove these files or move keys to environment variables

2. **Client-Side Environment Variable Exposure**
   - Files using `NEXT_PUBLIC_OPENAI_API_KEY`
   - Issue: AI API keys should NEVER be exposed to client-side code
   - **ACTION REQUIRED**: Move OpenAI API calls to server-side only

3. **Missing Environment Variable Validation**
   - Multiple services lack proper fallback handling
   - Could cause deployment failures if variables are missing
   - **RECOMMENDED**: Implement comprehensive environment validation

## Contact & Support

- **Railway Documentation**: https://docs.railway.app/
- **Supabase Documentation**: https://supabase.com/docs
- **Next.js Deployment Guide**: https://nextjs.org/docs/deployment

---

**⚠️ CRITICAL**: Address all security issues before proceeding with production deployment.