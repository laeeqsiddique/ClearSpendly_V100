# Migration Automation Implementation Checklist

## ✅ Pre-Implementation Checklist

### GitHub Repository Setup
- [ ] **Add Repository Secrets** (Settings → Secrets and variables → Actions)
  - [ ] `SUPABASE_ACCESS_TOKEN` - Your Supabase CLI access token
  - [ ] `SUPABASE_STAGING_PROJECT_ID` - Staging project ID from Supabase dashboard  
  - [ ] `SUPABASE_STAGING_DB_PASSWORD` - Staging database password
  - [ ] `SUPABASE_PRODUCTION_PROJECT_ID` - Production project ID from Supabase dashboard
  - [ ] `SUPABASE_PRODUCTION_DB_PASSWORD` - Production database password

### GitHub Environments Setup
- [ ] **Create "staging" environment** (Settings → Environments → New environment)
  - [ ] No protection rules needed for staging
- [ ] **Create "production" environment** 
  - [ ] Add required reviewers (your team members)
  - [ ] Restrict to protected branches only (`main`)
- [ ] **Create "production-approval" environment**
  - [ ] Add senior engineers as required reviewers
  - [ ] For high-risk migration approvals

### Branch Protection Rules
- [ ] **Protect `main` branch** (Settings → Branches)
  - [ ] Require pull request reviews
  - [ ] Require status checks to pass
  - [ ] Include migration safety checks

## 🚀 Quick Start (5 Minutes)

### 1. Update Configuration Files
- [ ] **Edit `supabase/config.staging.toml`**
  - [ ] Update `site_url` with your staging domain
  - [ ] Update `additional_redirect_urls` with your callback URLs
- [ ] **Edit `supabase/config.production.toml`**  
  - [ ] Update `site_url` with your production domain
  - [ ] Update `additional_redirect_urls` with your callback URLs

### 2. Test the Setup
- [ ] **Create test migration:**
  ```bash
  # Create test migration file
  cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_test_automation.sql << EOF
  -- Test migration for automation setup
  CREATE TABLE IF NOT EXISTS automation_test (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  EOF
  ```

- [ ] **Push to staging:**
  ```bash
  git add supabase/migrations/
  git commit -m "test: Add automation test migration"
  git push origin develop  # or staging branch
  ```

- [ ] **Watch GitHub Actions:**
  - [ ] Go to repository → Actions tab
  - [ ] Verify "Staging - Database Migrations" workflow runs
  - [ ] Check all steps complete successfully

### 3. Test Production Flow
- [ ] **Merge to main:**
  ```bash
  git checkout main
  git merge develop
  git push origin main
  ```
- [ ] **Verify approval gate:**
  - [ ] Check that workflow waits for approval
  - [ ] Approve the deployment
  - [ ] Verify production deployment completes

## 📋 Implementation Validation

### Staging Deployment Validation
- [ ] **Automatic triggers work**
  - [ ] Push to `develop` triggers staging deployment
  - [ ] Push to `staging` triggers staging deployment
  - [ ] Only migration file changes trigger the workflow
- [ ] **Safety checks pass**
  - [ ] Migration file validation works
  - [ ] SQL syntax checking passes
  - [ ] Duplicate timestamp detection works
- [ ] **Backup creation works**
  - [ ] Database backup is created before migration
  - [ ] Backup is uploaded to GitHub artifacts
  - [ ] Backup file is non-empty and valid
- [ ] **Migration execution works**
  - [ ] Migrations apply successfully to staging
  - [ ] Post-migration health checks pass
  - [ ] RLS policy tests pass (if applicable)
- [ ] **Rollback on failure**
  - [ ] Test with intentionally broken migration
  - [ ] Verify automatic rollback triggers
  - [ ] Confirm staging database is restored

### Production Deployment Validation  
- [ ] **Risk assessment works**
  - [ ] Low-risk migrations auto-deploy
  - [ ] High-risk migrations require approval
  - [ ] Critical migrations are blocked
- [ ] **Approval gates work**
  - [ ] High-risk migrations wait for approval
  - [ ] Only authorized users can approve
  - [ ] Deployment proceeds after approval
- [ ] **Production safety**
  - [ ] Comprehensive backup created (90-day retention)
  - [ ] Pre-migration health checks pass
  - [ ] Post-migration verification works
  - [ ] Critical functionality tests pass
- [ ] **Emergency rollback**
  - [ ] Test rollback with failed migration
  - [ ] Verify emergency procedures work
  - [ ] Confirm incident reporting works

## 🔧 Advanced Configuration

### Custom Risk Rules
- [ ] **Review and customize risk patterns in `scripts/ci-migration-safety.js`:**
  - [ ] Add your application-specific dangerous patterns
  - [ ] Adjust risk score thresholds
  - [ ] Customize approval requirements

### Notification Setup
- [ ] **Add Slack/Teams webhooks to workflows:**
  - [ ] Success notifications
  - [ ] Failure alerts
  - [ ] Approval requests
- [ ] **Configure email notifications:**
  - [ ] GitHub notifications for repository watchers
  - [ ] Custom email alerts for critical failures

### Monitoring Integration
- [ ] **Add monitoring hooks:**
  - [ ] Datadog/New Relic integration
  - [ ] Custom metrics collection
  - [ ] Performance monitoring
- [ ] **Health check endpoints:**  
  - [ ] Verify your existing health check endpoints work
  - [ ] Add database-specific health checks
  - [ ] Test tenant isolation checks

## 🛡️ Security Validation

### Secrets Management
- [ ] **Verify secrets are properly configured:**
  - [ ] Secrets are not exposed in logs
  - [ ] Access tokens have minimal required permissions
  - [ ] Database passwords are rotated regularly
- [ ] **Test secret access:**
  - [ ] Workflows can access all required secrets
  - [ ] Secrets work in both staging and production

### Database Security
- [ ] **RLS Policy Testing:**
  - [ ] Multi-tenant isolation is maintained
  - [ ] Policies are tested after each migration
  - [ ] Tenant data separation is verified
- [ ] **Access Control:**
  - [ ] Migration user has minimal required permissions
  - [ ] Production access is properly restricted
  - [ ] Audit logging is enabled

## 📊 Performance Optimization

### Migration Performance
- [ ] **Optimize large migrations:**
  - [ ] Use `CONCURRENTLY` for index creation
  - [ ] Break large migrations into smaller chunks
  - [ ] Schedule maintenance windows for major changes
- [ ] **Monitor execution times:**
  - [ ] Track migration duration
  - [ ] Set up alerts for slow migrations
  - [ ] Optimize frequently-used patterns

### Backup Performance  
- [ ] **Optimize backup strategy:**
  - [ ] Verify backup sizes are reasonable
  - [ ] Test backup/restore speed
  - [ ] Set up automated cleanup
- [ ] **Storage management:**
  - [ ] Monitor GitHub Actions storage usage
  - [ ] Implement backup retention policies
  - [ ] Archive old backups if needed

## 📚 Documentation and Training

### Team Onboarding
- [ ] **Document your specific procedures:**
  - [ ] Migration creation guidelines
  - [ ] Emergency response procedures
  - [ ] Approval workflows
- [ ] **Train team members:**
  - [ ] How to create safe migrations
  - [ ] How to respond to failures
  - [ ] How to use rollback procedures

### Runbook Creation
- [ ] **Create operation runbooks:**
  - [ ] Standard migration procedures
  - [ ] Emergency rollback procedures
  - [ ] Troubleshooting common issues
- [ ] **Update incident response:**
  - [ ] Include automated rollback in incident procedures
  - [ ] Update contact information
  - [ ] Test emergency procedures

## 🔍 Monitoring Setup

### Continuous Monitoring
- [ ] **Set up alerting:**
  - [ ] Migration failures
  - [ ] Backup failures  
  - [ ] Performance degradation
  - [ ] Security policy changes
- [ ] **Dashboard creation:**
  - [ ] Migration success rates
  - [ ] Deployment frequency
  - [ ] Rollback frequency
  - [ ] Performance metrics

### Regular Reviews
- [ ] **Schedule regular reviews:**
  - [ ] Weekly migration review meetings
  - [ ] Monthly security audits
  - [ ] Quarterly performance reviews
- [ ] **Continuous improvement:**
  - [ ] Collect feedback from team
  - [ ] Optimize based on usage patterns
  - [ ] Update procedures as needed

## ✅ Go-Live Checklist

### Final Validation
- [ ] **End-to-end testing complete**
- [ ] **All team members trained**
- [ ] **Emergency procedures documented**
- [ ] **Monitoring and alerting configured**
- [ ] **Backup and recovery tested**

### Production Cutover
- [ ] **Schedule initial cutover**
- [ ] **Notify stakeholders**
- [ ] **Monitor first few deployments closely**
- [ ] **Collect feedback and iterate**

---

## 🚨 Emergency Contacts

- **Primary On-Call:** [Your contact]
- **Database Admin:** [DBA contact]  
- **DevOps Lead:** [DevOps contact]
- **Supabase Support:** [Support channel]

## 📞 Support

For issues with this automation setup:
1. Check GitHub Actions logs for errors
2. Review the migration safety reports
3. Test commands manually with Supabase CLI
4. Consult the troubleshooting section in `SUPABASE_CI_CD_SETUP.md`

**🎉 Once this checklist is complete, your automated migration system is ready for production use!**