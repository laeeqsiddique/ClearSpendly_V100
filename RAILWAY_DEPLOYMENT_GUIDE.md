# Railway Deployment Guide for ClearSpendly

This guide provides step-by-step instructions for deploying your Next.js 15.3.1 multi-tenant SaaS application to Railway.

## Prerequisites

1. **Railway CLI installed**: `npm install -g @railway/cli`
2. **Railway account**: Sign up at [railway.app](https://railway.app)
3. **Git repository**: Ensure your code is committed to Git

## Configuration Files Overview

### 1. Dockerfile
- **Multi-stage build** for optimal performance
- **Alpine Linux** base for smaller image size
- **Node.js 20** with all required native dependencies
- **Security hardening** with non-root user
- **Health checks** built-in

### 2. .dockerignore
- Reduces build context by ~80%
- Excludes unnecessary files and directories
- Speeds up build process significantly

### 3. railway.toml
- **Build configuration** with Dockerfile builder
- **Environment variables** for optimization
- **Health check** configuration
- **Auto-scaling** settings

### 4. package.json Updates
- **Node.js version pinning** to 20.x
- **Railway-specific scripts** added
- **Engine requirements** specified

## Deployment Steps

### Step 1: Login to Railway
```bash
railway login
```

### Step 2: Create Railway Project
```bash
railway create clearspendly-production
```

### Step 3: Link Local Repository
```bash
railway link
```

### Step 4: Set Environment Variables
Copy `.env.railway` to `.env.production` and configure:

```bash
# Essential variables (replace with your actual values)
railway variables set NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
railway variables set OPENAI_API_KEY=your_openai_key
railway variables set NEXTAUTH_SECRET=your_32_char_secret
railway variables set NEXT_PUBLIC_APP_URL=https://your-app.railway.app
```

### Step 5: Deploy Application
```bash
railway up
```

## Environment Variables Checklist

Mark each variable as configured:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_PROJECT_REF`
- [ ] `POLAR_CLIENT_ID`
- [ ] `POLAR_CLIENT_SECRET`
- [ ] `OPENAI_API_KEY`
- [ ] `UPLOADTHING_SECRET`
- [ ] `UPLOADTHING_APP_ID`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `RESEND_API_KEY`

## Troubleshooting Common Issues

### Build Failures

#### Issue: npm ci fails with exit code 1
**Solution**: The new Dockerfile uses specific npm flags to handle this:
- `--no-audit --no-fund --prefer-offline --maxsockets 1`
- Multi-stage build separates dependencies

#### Issue: Out of memory during build
**Solution**: Configured in railway.toml:
- Build: `NODE_OPTIONS="--max-old-space-size=4096"`
- Runtime: `NODE_OPTIONS="--max-old-space-size=2048"`

#### Issue: Native module compilation failures
**Solution**: Dockerfile includes all required Alpine packages:
- `python3`, `make`, `g++`
- Canvas dependencies: `cairo-dev`, `pango-dev`, etc.

### Runtime Issues

#### Issue: Application won't start
**Solution**: Check logs with:
```bash
railway logs
```

Common fixes:
- Ensure `output: 'standalone'` in next.config.ts
- Verify all environment variables are set
- Check health endpoint is accessible

#### Issue: Database connection failures
**Solution**: 
- Verify Supabase connection string
- Ensure service role key has proper permissions
- Check RLS policies are configured correctly

## Post-Deployment Verification

### 1. Health Checks
```bash
# Check main health endpoint
curl https://your-app.railway.app/api/health

# Check database connectivity
curl https://your-app.railway.app/api/health/db

# Check tenant system
curl https://your-app.railway.app/api/health/tenant
```

### 2. Application Features
- [ ] User registration/login works
- [ ] Tenant creation functions
- [ ] File upload operational
- [ ] AI/OCR processing active
- [ ] Dashboard loads correctly

### 3. Performance Monitoring
- Monitor CPU/Memory usage in Railway dashboard
- Check response times
- Verify auto-scaling triggers properly

## Scaling Configuration

Current configuration in `railway.toml`:
- **Min replicas**: 1
- **Max replicas**: 3
- **CPU threshold**: 80%
- **Memory threshold**: 85%

Adjust based on your traffic patterns.

## Cost Optimization

### Build Optimization
- Multi-stage builds reduce final image size
- `.dockerignore` reduces build context
- Build caching enabled

### Runtime Optimization
- Standalone output for smaller footprint
- Memory limits prevent runaway processes
- Auto-scaling prevents over-provisioning

## Support

If you encounter issues:

1. **Check Railway logs**: `railway logs --tail`
2. **Review build logs**: Available in Railway dashboard
3. **Test locally**: Ensure `npm run build` works locally
4. **Environment variables**: Double-check all required variables are set

## Maintenance

### Regular Tasks
- Monitor application logs weekly
- Update dependencies monthly
- Review scaling metrics
- Backup database regularly (handled by Supabase)

### Updates
To deploy updates:
```bash
git add .
git commit -m "Your update message"
git push
railway up
```

Railway will automatically trigger a new build and deployment.