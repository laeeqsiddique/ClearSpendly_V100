# Supabase CI/CD Migration Setup Guide

This guide provides complete instructions for setting up automated database migrations with GitHub Actions for your ClearSpendly multi-tenant SaaS application.

## 🎯 Overview

This CI/CD system provides:
- **Automated staging deployments** on push to `develop`/`staging` branches
- **Production deployments** with approval gates and comprehensive safety checks
- **Automatic rollback** capabilities for failed migrations
- **Multi-tenant safety** validation and RLS policy testing
- **Comprehensive backup** and recovery procedures

## 📁 Files Created

### GitHub Actions Workflows
- `.github/workflows/staging-migrations.yml` - Staging environment automation
- `.github/workflows/production-migrations.yml` - Production deployment with approvals

### Enhanced Scripts
- `scripts/ci-migration-safety.js` - CI/CD-optimized safety validation
- `scripts/ci-database-rollback.js` - Automated rollback for CI environments
- `scripts/migration-safety-check.js` - Enhanced (existing file)
- `scripts/database-rollback.js` - Enhanced (existing file)

### Environment Configurations
- `supabase/config.staging.toml` - Staging-specific Supabase configuration
- `supabase/config.production.toml` - Production-optimized configuration

## 🚀 Quick Setup (5 Minutes)

### 1. GitHub Repository Secrets

Add these secrets to your GitHub repository (`Settings` → `Secrets and variables` → `Actions`):

```bash
# Required for all environments
SUPABASE_ACCESS_TOKEN=your_supabase_access_token

# Staging environment
SUPABASE_STAGING_PROJECT_ID=your_staging_project_id
SUPABASE_STAGING_DB_PASSWORD=your_staging_db_password

# Production environment  
SUPABASE_PRODUCTION_PROJECT_ID=your_production_project_id
SUPABASE_PRODUCTION_DB_PASSWORD=your_production_db_password
```

### 2. GitHub Environments Setup

Create environments in GitHub (`Settings` → `Environments`):

1. **staging** - No protection rules needed
2. **production** - Add protection rules:
   - ✅ Required reviewers (add your team)
   - ✅ Restrict to protected branches only (`main`)
3. **production-approval** - For high-risk migrations:
   - ✅ Required reviewers (senior engineers only)

### 3. Update Package.json Scripts

Your `package.json` already includes the required scripts. Verify these exist:

```json
{
  "scripts": {
    "deploy:check-migrations": "node scripts/migration-safety-check.js",
    "deploy:backup": "node scripts/database-rollback.js backup",
    "deploy:rollback": "node scripts/database-rollback.js rollback"
  }
}
```

### 4. Update Environment URLs

Edit the config files with your actual domains:

**`supabase/config.staging.toml`:**
```toml
site_url = "https://staging.yourdomain.com"  # Update this
```

**`supabase/config.production.toml`:**
```toml
site_url = "https://yourdomain.com"  # Update this
```

## 📋 Detailed Setup Instructions

### Getting Supabase Credentials

1. **Access Token:**
   ```bash
   # Login to Supabase CLI
   supabase login
   
   # Get your access token
   supabase projects list
   ```

2. **Project IDs:**
   - Go to your Supabase dashboard
   - Select your project
   - Find Project ID in Settings → General

3. **Database Passwords:**
   - Supabase Dashboard → Settings → Database
   - Use the database password you set during project creation

### Branch Strategy

This setup assumes the following git workflow:

```
main (production) ← merge with approval
 ↑
develop/staging (staging) ← active development
 ↑
feature branches ← individual features
```

**Migration Flow:**
1. Develop on feature branches
2. Merge to `develop` → triggers staging deployment
3. Merge to `main` → triggers production deployment (with approval)

## 🔄 How It Works

### Staging Deployment (Automatic)

**Triggered by:** Push to `develop` or `staging` branches with migration changes

**Process:**
1. **Validation** - Check migration file syntax and naming
2. **Backup** - Create database backup (30-day retention)
3. **Deploy** - Run migrations on staging environment  
4. **Verify** - Test database health and RLS policies
5. **Rollback** - Automatic rollback if any step fails

### Production Deployment (Manual Approval)

**Triggered by:** Push to `main` branch with migration changes

**Process:**
1. **Safety Analysis** - Deep risk assessment of all changes
2. **Approval Gate** - Manual approval for high-risk migrations
3. **Backup** - Comprehensive production backup (90-day retention)
4. **Deploy** - Careful migration execution with monitoring
5. **Verification** - Multi-layer health checks and functionality tests
6. **Emergency Rollback** - Automated rollback on any failure

## 🎛️ Migration Risk Levels

The system automatically categorizes migrations:

### 🟢 LOW RISK (Auto-deploy)
- Adding new tables
- Adding new columns (nullable)
- Creating indexes with `CONCURRENTLY`
- Adding new RLS policies

### 🟡 MEDIUM RISK (Review recommended)
- Adding NOT NULL columns with defaults
- RLS policy changes
- Function/trigger modifications
- Large batch operations

### 🟠 HIGH RISK (Approval required)
- Performance-impacting operations
- Non-concurrent index creation
- Column type changes
- Trigger disabling

### 🔴 CRITICAL (Blocked)
- DROP TABLE/DATABASE
- TRUNCATE operations
- Bulk DELETE without WHERE
- Security-sensitive changes

## 🧪 Testing Your Setup

### 1. Test Staging Deployment

```bash
# Create a simple test migration
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_test_ci_setup.sql << EOF
-- Test migration for CI/CD setup
CREATE TABLE IF NOT EXISTS ci_test (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for multi-tenant safety
ALTER TABLE ci_test ENABLE ROW LEVEL SECURITY;

-- Test comment
COMMENT ON TABLE ci_test IS 'Test table for CI/CD setup validation';
EOF

# Commit and push to staging
git add supabase/migrations/
git commit -m "test: Add CI/CD setup validation migration"
git push origin develop
```

### 2. Monitor the Workflow

1. Go to your repository's **Actions** tab
2. Watch the "Staging - Database Migrations" workflow
3. Verify all steps complete successfully
4. Check that the test table was created in staging

### 3. Test Production Approval

```bash
# Merge to main to test production flow
git checkout main
git merge develop
git push origin main
```

This will trigger the production workflow with approval gates.

## 🚨 Emergency Procedures

### Manual Rollback

If automated rollback fails, use manual recovery:

```bash
# Connect to your environment
export SUPABASE_PROJECT_ID="your_project_id"
export SUPABASE_DB_PASSWORD="your_password"

# Run manual rollback
npm run deploy:rollback

# Or use the CI script directly
node scripts/ci-database-rollback.js execute production [backup_run_id]
```

### Emergency Hotfix

For critical production issues:

1. Create hotfix branch from `main`
2. Apply minimal fix
3. Use `workflow_dispatch` to force deployment:
   - Go to Actions → "Production - Database Migrations"
   - Click "Run workflow"
   - Select your hotfix branch
   - Enable force migration if needed

## 📊 Monitoring and Alerts

### Built-in Monitoring

The workflows provide:
- **Slack/Teams notifications** (configure webhooks in workflows)
- **GitHub issue creation** for failures
- **Deployment status badges**
- **Performance metrics** tracking

### Health Checks

After each deployment, the system runs:
- Database connectivity tests
- Table structure validation
- RLS policy verification  
- Basic functionality tests
- Performance benchmarks

## 🔧 Customization Options

### Modify Risk Thresholds

Edit `scripts/ci-migration-safety.js`:

```javascript
// Customize risk scoring
this.criticalPatterns = [
  // Add your custom critical patterns
];

// Adjust risk score thresholds
if (report.summary.riskScore > 50) { // Lower = more strict
  report.summary.requiresApproval = true;
}
```

### Add Custom Validation

Edit workflow files to add custom steps:

```yaml
- name: Custom Validation
  run: |
    # Add your custom validation logic
    npm run validate:custom
```

### Environment-Specific Settings

Modify `supabase/config.staging.toml` and `supabase/config.production.toml`:

```toml
[env]
YOUR_CUSTOM_SETTING = "value"
FEATURE_FLAGS = "enabled"
```

## 🛡️ Security Best Practices

### Secrets Management
- ✅ Use GitHub Secrets for all credentials
- ✅ Rotate database passwords regularly
- ✅ Use least-privilege access tokens
- ✅ Enable audit logging in Supabase

### Deployment Security
- ✅ Require approval for production
- ✅ Limit who can approve deployments
- ✅ Use signed commits for critical changes
- ✅ Enable branch protection rules

### Database Security
- ✅ Always backup before migrations
- ✅ Test RLS policies in staging
- ✅ Validate tenant isolation
- ✅ Monitor for security policy changes

## 📈 Performance Optimization

### Migration Performance
- Use `CONCURRENTLY` for index creation
- Batch large operations appropriately
- Consider maintenance windows for big changes
- Monitor migration execution time

### Backup Optimization
- Keep staging backups for 30 days
- Keep production backups for 90 days
- Use compressed backups for large databases
- Automate backup cleanup

## 🐛 Troubleshooting

### Common Issues

**❌ "Migration file not found"**
```bash
# Ensure migration files follow naming convention
# Format: YYYYMMDDHHMMSS_description.sql
```

**❌ "Backup download failed"**
```bash
# Check GitHub Actions artifacts retention
# Verify backup was created in previous workflow
```

**❌ "Database connection failed"**
```bash
# Verify project ID and password in secrets
# Check Supabase project status
```

**❌ "RLS policy test failed"**
```bash
# Review tenant isolation in staging
# Check policy syntax and logic
```

### Debug Mode

Enable verbose logging:

```yaml
# Add to workflow steps
- name: Enable Debug Mode
  run: echo "DEBUG=1" >> $GITHUB_ENV
```

### Support

For issues with this setup:
1. Check GitHub Actions logs
2. Review migration safety reports
3. Test manually with CLI first
4. Consult Supabase documentation

## 🎉 Next Steps

After successful setup:

1. **🔗 Integrate with monitoring** - Add Datadog, Sentry, or similar
2. **📱 Set up notifications** - Configure Slack/Teams webhooks  
3. **📝 Create runbooks** - Document your specific procedures
4. **🧪 Add more tests** - Extend validation for your use cases
5. **📊 Monitor performance** - Track migration execution times
6. **🔄 Automate cleanup** - Schedule backup cleanup jobs

---

## 📞 Emergency Contacts

Keep these handy for production issues:

- **Database Admin:** [Your DBA contact]
- **DevOps Team:** [Your DevOps contact]
- **Supabase Support:** [Support channel]
- **On-call Engineer:** [Current on-call]

**🚨 For production emergencies: Follow your incident response playbook first, then use automated rollback procedures.**