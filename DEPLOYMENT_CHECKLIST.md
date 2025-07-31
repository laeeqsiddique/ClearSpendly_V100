# 🚀 Deployment Checklist

Use this checklist before every deployment to ensure reliability and prevent failures.

## Pre-Development (Setup Once)

- [ ] Install Husky: `npm install --save-dev husky`
- [ ] Set up pre-commit hooks: `npm run prepare`
- [ ] Install deployment validation dependencies
- [ ] Configure ESLint deployment rules
- [ ] Set up GitHub Actions workflow (if using GitHub)

## Before Every Feature/Commit

### 🔍 Code Quality Checks
- [ ] No unsafe non-null assertions (`!`) on environment variables
- [ ] All database operations wrapped in build-time detection
- [ ] Client-side code guarded with `typeof window !== 'undefined'`
- [ ] Dynamic imports have error handling with `.catch()`
- [ ] All external service calls have fallback/mock implementations

### 🧪 Local Testing
- [ ] Run `npm run validate-deployment` - passes ✅
- [ ] Run `npm run build` - completes successfully ✅
- [ ] Test app locally with `npm run start`
- [ ] Test key user flows manually
- [ ] Check browser console for errors

### 📋 Environment Safety
- [ ] All required environment variables documented
- [ ] App works gracefully when env vars are missing
- [ ] Mock/fallback services respond appropriately
- [ ] No hardcoded secrets or URLs in code

## Pre-Deployment (Staging/Production)

### 🏗️ Build Validation
- [ ] `npm run pre-deploy` passes completely
- [ ] Build size is reasonable (< 50MB)
- [ ] No TypeScript errors in production build
- [ ] All pages generate successfully (X/X)
- [ ] Static assets are optimized

### 🔐 Security Check
- [ ] Environment variables set in hosting platform
- [ ] No secrets committed to repository
- [ ] API endpoints properly protected
- [ ] Database RLS policies working
- [ ] Authentication flows tested

### 🌐 Infrastructure Ready
- [ ] Domain/subdomain configured correctly
- [ ] SSL certificate provisioned
- [ ] CDN configured (if needed)
- [ ] Health check endpoint working
- [ ] Monitoring/alerting set up

## During Deployment

### 📊 Monitoring
- [ ] Watch deployment logs for errors
- [ ] Verify health check passes
- [ ] Check application startup time (< 2 minutes)
- [ ] Monitor memory and CPU usage
- [ ] Test critical user flows

### 🚨 Rollback Preparation
- [ ] Previous version tagged/backed up
- [ ] Database migrations are reversible
- [ ] Rollback plan documented and tested
- [ ] Team notified of deployment window

## Post-Deployment

### ✅ Verification
- [ ] All pages load correctly
- [ ] Authentication works
- [ ] Database operations function
- [ ] External integrations working
- [ ] Mobile responsiveness verified
- [ ] Performance metrics acceptable

### 📈 Monitoring
- [ ] Error rates normal (< 1%)
- [ ] Response times acceptable
- [ ] No memory leaks detected
- [ ] User feedback collected
- [ ] Analytics tracking working

## Emergency Procedures

### 🚨 If Deployment Fails
1. **Don't Panic** - Follow the rollback plan
2. **Check Logs** - Identify the root cause
3. **Quick Fix** - If simple, fix and redeploy
4. **Rollback** - If complex, rollback immediately
5. **Post-Mortem** - Document lessons learned

### 🔄 Rollback Steps
1. Stop current deployment
2. Revert to previous version: `git revert [commit-hash]`
3. Redeploy previous stable version
4. Verify rollback successful
5. Communicate status to stakeholders

## Automation Scripts

### Quick Commands
```bash
# Complete pre-deployment check
npm run pre-deploy

# Validate deployment safety
npm run validate-deployment

# Deploy to staging
npm run deploy:staging

# Deploy to production (with confirmation)
npm run deploy:production
```

### Manual Validation
```bash
# Test build without env vars
unset NEXT_PUBLIC_SUPABASE_URL && npm run build

# Test with minimal env vars
export NEXT_PUBLIC_SUPABASE_URL="mock" && npm run build

# Check bundle size
npx @next/bundle-analyzer
```

## Common Issues & Solutions

### Build Failures
| Error | Cause | Solution |
|-------|-------|----------|
| `process.env.X!` error | Unsafe non-null assertion | Use safe fallbacks |
| Static generation error | Server calls in components | Add `export const dynamic = 'force-dynamic'` |
| Import error during build | Missing error handling | Add `.catch()` to dynamic imports |
| Window is not defined | Client-side code on server | Add `typeof window !== 'undefined'` guard |

### Runtime Issues
| Issue | Cause | Solution |
|-------|-------|----------|
| White screen on load | JavaScript errors | Check browser console, fix errors |
| API calls failing | Environment variables missing | Verify env vars in hosting platform |
| Auth not working | Supabase config issues | Check Supabase client initialization |
| Slow page loads | Large bundle size | Optimize imports and assets |

## Success Metrics

### Deployment Health
- ✅ Zero deployment failures in last 10 deployments
- ✅ Average deployment time < 5 minutes
- ✅ Rollback capability tested monthly
- ✅ Health checks passing consistently

### Application Stability
- ✅ 99.9% uptime
- ✅ < 100ms average response time
- ✅ < 0.1% error rate
- ✅ Zero security incidents

---

**Remember**: A good deployment is boring - no surprises, no drama, just working software. 🎯