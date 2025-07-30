# Railway Deployment Solution for ClearSpendly

## Overview
This document provides a comprehensive solution for deploying ClearSpendly (a Next.js 15.3.1 multi-tenant SaaS application) to Railway, addressing npm installation failures and providing production-grade deployment configurations.

## Problem Summary
- npm install works locally but fails on Railway with exit code 1
- Minimal error information makes debugging difficult
- Multiple deployment strategies have failed
- Need production-ready solution with proper error handling

## Solution Components

### 1. Enhanced Production Dockerfile (`Dockerfile.production`)
- **Multi-stage build** with comprehensive error logging
- **System dependencies** for native modules (canvas, puppeteer)
- **Error capture** at every stage with detailed logs
- **Multiple fallback strategies** for npm install
- **Health checks** and proper user permissions

Key features:
- Verbose logging to `/app/logs/` directory
- System information capture before install
- Package analysis for problematic dependencies
- Multiple npm install attempts with different strategies
- Build verification steps

### 2. Debug Dockerfile (`Dockerfile.debug`)
- Minimal container focused on npm debugging
- Runs comprehensive debug script
- Captures all possible error information
- Tests multiple installation methods
- Keeps container running for inspection

### 3. npm Debug Script (`scripts/debug-npm-install.js`)
- Node.js script for local debugging
- Analyzes package.json for issues
- Tests multiple installation strategies
- Generates comprehensive debug report
- Identifies common error patterns

### 4. Railway Configuration (`railway.json`)
- Explicit Dockerfile specification
- Health check configuration
- Restart policies for resilience
- Environment-specific settings

## Deployment Steps

### Step 1: Local Debugging
```bash
# Run the debug script locally first
node scripts/debug-npm-install.js

# Review the generated logs in npm-debug-logs/
```

### Step 2: Test with Debug Container
```bash
# Build and run the debug container locally
docker build -f Dockerfile.debug -t clearspendly-debug .
docker run -it clearspendly-debug

# This will show exactly what's failing
```

### Step 3: Deploy to Railway
```bash
# Ensure railway.json points to Dockerfile.production
railway up

# Monitor the build logs - they will now include detailed error information
```

### Step 4: If Build Fails
1. Check Railway build logs for the enhanced error output
2. Look for specific sections:
   - "System Information" - Verify Node/npm versions
   - "Package Analysis" - Check for problematic packages
   - "npm Install Attempt" - See which strategy failed
   - "Build Error Details" - TypeScript or build-specific issues

## Common Issues and Solutions

### 1. EBUSY Errors
**Cause**: File system locks or cache conflicts
**Solution**: 
- Our Dockerfile cleans cache before install
- Uses `--force` flag as fallback

### 2. Native Module Compilation
**Cause**: Missing build tools for canvas, puppeteer
**Solution**: 
- Dockerfile includes all required system dependencies
- Proper environment variables set

### 3. Peer Dependency Conflicts
**Cause**: React 19 and other version mismatches
**Solution**: 
- Multiple install strategies including `--legacy-peer-deps`
- Force install as last resort

### 4. Memory Issues
**Cause**: Large dependency tree
**Solution**: 
- `NODE_OPTIONS="--max-old-space-size=4096"` set
- Efficient multi-stage build

## Production Considerations

### Security
- Non-root user (nextjs) for runtime
- Minimal runtime image
- No development dependencies in production

### Performance
- Multi-stage build for smaller images
- Standalone Next.js output
- Efficient layer caching

### Monitoring
- Health check endpoint configured
- Comprehensive logging
- Restart policies for resilience

## Troubleshooting Workflow

1. **First Deploy Attempt**
   ```bash
   railway up
   ```

2. **If Fails - Check Enhanced Logs**
   - Railway will now show detailed error logs
   - Look for specific error patterns

3. **Run Local Debug**
   ```bash
   node scripts/debug-npm-install.js
   docker build -f Dockerfile.debug -t debug . && docker run -it debug
   ```

4. **Apply Fix and Retry**
   - Update Dockerfile.production based on findings
   - Commit changes
   - Deploy again

## Environment Variables
Ensure these are set in Railway:
```
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

## Next Steps if Still Failing

1. **Enable Railway Build Logs**
   - Go to Railway dashboard
   - Enable verbose build logging
   - Share the full output

2. **Try Minimal Deployment**
   - Remove non-essential dependencies temporarily
   - Deploy core functionality first
   - Add dependencies incrementally

3. **Contact Railway Support**
   - Provide the enhanced error logs
   - Share the debug report
   - Ask about specific npm registry issues

## Conclusion
This solution provides comprehensive error capturing and multiple fallback strategies. The enhanced logging will reveal the actual npm failure reason, allowing for targeted fixes rather than guesswork.