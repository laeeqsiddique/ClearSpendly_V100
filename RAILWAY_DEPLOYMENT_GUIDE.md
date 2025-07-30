# Railway Deployment Guide for ClearSpendly

## Build Issues Resolved

This guide documents the fixes applied to resolve Railway deployment build errors.

### 1. Syntax Errors Fixed
- **app/dashboard/receipts/page.tsx** - Removed extra closing brace
- **temp_end.tsx** - Deleted unnecessary file fragment

### 2. Next.js Configuration Updates
- Removed deprecated experimental options:
  - `instrumentationHook`
  - `staticWorkerRequestDeduping` 
  - `generateStaticParams`
- Simplified webpack configuration for Next.js 15.3.1 compatibility

### 3. Missing Dependencies Added
```json
"crypto-browserify": "^3.12.0",
"stream-browserify": "^3.0.0",
"stream-http": "^3.2.0",
"https-browserify": "^1.0.0",
"browserify-zlib": "^0.2.0",
"path-browserify": "^1.0.1",
"os-browserify": "^0.3.0"
```

### 4. Dynamic Page Configuration
Added `export const dynamic = 'force-dynamic'` to pages using authentication:
- `/pricing`
- `/dashboard`
- `/dashboard/payment`
- `/dashboard/expenses`
- `/dashboard/analytics`

### 5. Suspense Boundaries Added
Wrapped components using `useSearchParams()`:
- `/accept-invitation`
- `/dashboard/payments/record`
- `/dashboard/invoice-templates/create`
- `/dashboard/invoices/templates/create`

### 6. Edge Runtime Fix
- Changed `/api/process-receipt/route.ts` to use Node.js runtime
- Added `export const runtime = 'nodejs';`
- Removed PDF processing that requires native binaries

### 7. Railway Configuration
Created `railway.toml` with optimized settings:
```toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npm run build"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

[build.env]
CI = "true"
NEXT_TELEMETRY_DISABLED = "1"
NODE_ENV = "production"
```

## Deployment Steps

1. **Commit Changes**
```bash
git add -A
git commit -m "Fix Railway deployment build errors"
```

2. **Push to Repository**
```bash
git push origin master
```

3. **Railway will automatically deploy**
- Monitor deployment at: https://railway.app
- Check logs with: `railway logs --service Flowvya`

## Build Verification

The build now completes successfully with:
- ✅ 97 pages generated
- ✅ No syntax errors
- ✅ No missing dependencies
- ✅ Proper static/dynamic page handling
- ✅ Edge runtime compatibility

## Environment Variables

Ensure these are set in Railway:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_OPENAI_API_KEY`
- All other variables from `.env.production`

## Troubleshooting

If build fails again:
1. Check Railway logs: `railway logs --service Flowvya`
2. Verify environment variables are set
3. Ensure Supabase connection is working
4. Check for any new TypeScript errors

## Notes

- Build time may take 3-5 minutes due to static page generation
- The "Polar SDK not available" warnings are expected
- Dynamic pages will be server-rendered at request time