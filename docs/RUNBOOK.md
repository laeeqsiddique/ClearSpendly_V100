# ClearSpendly Operations Runbook

This runbook provides step-by-step procedures for common operational tasks, troubleshooting, and emergency response for the ClearSpendly SaaS platform.

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Weekly Maintenance](#weekly-maintenance)
3. [Incident Response](#incident-response)
4. [Common Issues](#common-issues)
5. [Monitoring Procedures](#monitoring-procedures)
6. [Backup & Recovery](#backup--recovery)
7. [Performance Optimization](#performance-optimization)
8. [Security Procedures](#security-procedures)

## Daily Operations

### Morning Health Check (5 minutes)

**Frequency**: Every weekday at 9:00 AM  
**Owner**: DevOps/On-call engineer

```bash
#!/bin/bash
# Daily health check script

echo "🌅 Starting daily health check..."

# 1. Check application health
echo "1. Application Health:"
curl -f https://app.clearspendly.com/api/health || echo "❌ App health check failed"

# 2. Check database health
echo "2. Database Health:"
curl -f https://app.clearspendly.com/api/health/db || echo "❌ DB health check failed"

# 3. Check AI services
echo "3. AI Services Health:"
curl -f https://app.clearspendly.com/api/health/ai || echo "❌ AI health check failed"

# 4. Check multi-tenant system
echo "4. Multi-tenant System:"
curl -f https://app.clearspendly.com/api/health/tenant || echo "❌ Tenant health check failed"

# 5. Cost monitoring
echo "5. Cost Analysis:"
node scripts/cost-monitoring.js

echo "✅ Daily health check completed"
```

**Expected Results**:
- All health endpoints return 200 status
- No critical cost alerts
- All services operational

**If checks fail**:
1. Check detailed logs: `vercel logs --tail`
2. Review GitHub Actions for recent deployments
3. Check Supabase dashboard for database issues
4. Follow incident response procedures if critical

### System Metrics Review (10 minutes)

**What to check**:

1. **Application Metrics**
   - Response time trends
   - Error rate (should be < 1%)
   - Active user count
   - API request volume

2. **Database Metrics**
   - Connection pool usage (< 80%)
   - Query performance
   - Storage usage
   - Slow query logs

3. **AI Service Metrics**
   - Token usage rate
   - API response times
   - Error rates
   - Cost per day

4. **Infrastructure Metrics**
   - Vercel function invocations
   - Bandwidth usage
   - Storage usage trends

**Action items**:
- Document any anomalies
- Create tickets for performance issues
- Update capacity planning spreadsheet

## Weekly Maintenance

### Sunday Maintenance Window (30 minutes)

**Frequency**: Every Sunday at 2:00 AM UTC  
**Owner**: DevOps team

#### 1. Database Maintenance
```bash
# Run database optimization
node scripts/resource-optimization.js

# Clean up old data (if configured)
supabase db exec --linked "CALL cleanup_old_audit_logs();"

# Update table statistics
supabase db exec --linked "ANALYZE;"

# Check for long-running queries
supabase db exec --linked "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"
```

#### 2. Storage Cleanup
```bash
# Clean up temporary files
node scripts/resource-optimization.js optimizeStorage

# Check storage usage
supabase storage du --linked

# Remove orphaned files (if any)
# Manual review required for safety
```

#### 3. Security Updates
```bash
# Check for npm vulnerabilities
npm audit --audit-level high

# Update dependencies (if needed)
npm update

# Run security tests
npm run test:security  # if available
```

#### 4. Backup Verification
```bash
# Verify recent backups
node scripts/database-rollback.js list

# Test restore procedure (on staging)
node scripts/database-rollback.js rollback staging
```

### Monthly Tasks (1 hour)

**First Sunday of each month**:

#### 1. Capacity Planning Review
- Review growth trends
- Update resource projections
- Plan for scaling needs
- Budget review and optimization

#### 2. Security Review
- Review access logs
- Update security policies
- Rotate API keys (if required)
- Review compliance requirements

#### 3. Disaster Recovery Testing
- Test full backup/restore procedure
- Verify emergency procedures
- Update contact information
- Review and update runbooks

## Incident Response

### Incident Classification

#### P0 - Critical (Response: < 15 minutes)
**Symptoms**:
- Complete service outage
- Data breach indicators
- Payment processing failure
- Security compromise

**Response Procedure**:
1. **Immediate Actions** (0-5 minutes):
   ```bash
   # Check overall system status
   curl -I https://app.clearspendly.com/api/health
   
   # If down, check Vercel status
   curl -I https://vercel.com/api/v1/deployments
   
   # Alert team immediately
   # Use emergency communication channels
   ```

2. **Assessment** (5-10 minutes):
   - Determine scope of impact
   - Identify root cause
   - Estimate time to resolution

3. **Response** (10-15 minutes):
   - Execute appropriate recovery procedure
   - Communicate with stakeholders
   - Document incident timeline

#### P1 - High (Response: < 1 hour)
**Symptoms**:
- Significant feature unavailability
- Performance degradation > 50%
- AI services completely down
- Database connection issues

**Response Procedure**:
1. **Investigation** (0-15 minutes):
   ```bash
   # Check specific service health
   curl https://app.clearspendly.com/api/health/db
   curl https://app.clearspendly.com/api/health/ai
   curl https://app.clearspendly.com/api/health/tenant
   
   # Check recent deployments
   vercel deployments list
   
   # Review error logs
   vercel logs --tail
   ```

2. **Diagnosis** (15-30 minutes):
   - Analyze logs for error patterns
   - Check resource utilization
   - Review recent changes

3. **Resolution** (30-60 minutes):
   - Apply appropriate fix
   - Test resolution
   - Monitor for recurrence

#### P2 - Medium (Response: < 4 hours)
**Symptoms**:
- Minor feature issues
- Performance degradation < 50%
- Non-critical integrations down

**Response Procedure**:
- Standard troubleshooting process
- Schedule fix during next maintenance window
- Monitor for escalation

### Emergency Rollback Procedures

#### Application Rollback
```bash
# 1. Identify last known good deployment
vercel deployments list --limit 10

# 2. Rollback to previous deployment
vercel rollback [deployment-url] --token=$VERCEL_TOKEN

# 3. Verify rollback success
curl https://app.clearspendly.com/api/health

# 4. Update team and stakeholders
echo "Application rolled back to previous version at $(date)"
```

#### Database Rollback
```bash
# 1. List available backups
node scripts/database-rollback.js list

# 2. Select appropriate backup
# Interactive selection process

# 3. Execute rollback
node scripts/database-rollback.js rollback production

# 4. Verify database integrity
curl https://app.clearspendly.com/api/health/db
```

## Common Issues

### Issue: High Database Connection Usage

**Symptoms**:
- Health check showing high connection utilization
- Application timeouts
- "too many connections" errors

**Diagnosis**:
```bash
# Check current connections
supabase db exec --linked "
SELECT count(*) as connections, state 
FROM pg_stat_activity 
GROUP BY state;
"

# Check long-running connections
supabase db exec --linked "
SELECT pid, usename, application_name, state, 
       now() - state_change as duration
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY duration DESC;
"
```

**Resolution**:
```bash
# Option 1: Kill long-running queries (if safe)
supabase db exec --linked "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state != 'idle' AND now() - state_change > interval '10 minutes';"

# Option 2: Restart application (forces connection pool reset)
vercel env pull .env.production
vercel --prod

# Option 3: Scale up database (if persistent issue)
# Contact Supabase support or upgrade plan
```

### Issue: AI Service Quota Exceeded

**Symptoms**:
- AI health check failing
- 429 errors in logs
- OCR enhancement not working

**Diagnosis**:
```bash
# Check AI service status
curl https://app.clearspendly.com/api/health/ai

# Review cost monitoring
node scripts/cost-monitoring.js
```

**Resolution**:
```bash
# Option 1: Switch to backup provider (if configured)
# Update environment variable
vercel env add LLM_PROVIDER ollama --target production

# Option 2: Implement rate limiting
# Deploy rate limiting code

# Option 3: Upgrade service plan
# Contact OpenAI or service provider
```

### Issue: Storage Space Running Low

**Symptoms**:
- Storage health check warnings
- Upload failures
- Performance degradation

**Diagnosis**:
```bash
# Check storage usage
supabase storage du --linked

# Analyze storage by bucket
supabase storage ls receipts --linked
supabase storage ls logos --linked
```

**Resolution**:
```bash
# Option 1: Clean up old files
node scripts/resource-optimization.js optimizeStorage

# Option 2: Implement compression
node scripts/resource-optimization.js compressReceiptImages

# Option 3: Archive old data
# Run archival scripts (manual process)

# Option 4: Upgrade storage plan
# Contact Supabase support
```

### Issue: Multi-tenant Data Isolation Failure

**Symptoms**:
- Tenant health check failing
- Cross-tenant data visibility
- RLS policy violations

**Diagnosis**:
```bash
# Check RLS policies
supabase db exec --linked "
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
"

# Test tenant isolation
curl https://app.clearspendly.com/api/health/tenant
```

**Resolution**:
```bash
# Option 1: Re-apply RLS policies
supabase db push --linked

# Option 2: Run RLS fix migration
supabase migration new fix_rls_policies
# Add policy fixes to migration
supabase db push --linked

# Option 3: Emergency tenant isolation
# Disable affected features temporarily
# Deploy hotfix
```

## Monitoring Procedures

### Setting Up Alerts

#### Critical Alerts (Immediate notification)
```bash
# Health check failures
curl -f https://app.clearspendly.com/api/health || send_alert "CRITICAL: Health check failed"

# Database connection issues
if connection_usage > 95%; then send_alert "CRITICAL: Database connections at 95%"; fi

# Storage quota exceeded
if storage_usage > 90%; then send_alert "CRITICAL: Storage at 90% capacity"; fi
```

#### Warning Alerts (Next business day)
```bash
# Performance degradation
if avg_response_time > 1000ms; then send_alert "WARNING: Slow response times"; fi

# Cost thresholds
if daily_ai_cost > $50; then send_alert "WARNING: High AI costs"; fi

# Error rate increase
if error_rate > 1%; then send_alert "WARNING: Error rate elevated"; fi
```

### Custom Monitoring Scripts

#### Performance Monitoring
```bash
#!/bin/bash
# performance-monitor.sh

# Check response times
response_time=$(curl -o /dev/null -s -w "%{time_total}" https://app.clearspendly.com/api/health)
if (( $(echo "$response_time > 1.0" | bc -l) )); then
    echo "WARNING: Slow response time: ${response_time}s"
fi

# Check error rates
error_count=$(vercel logs | grep "ERROR" | wc -l)
total_requests=$(vercel logs | wc -l)
error_rate=$(echo "scale=2; $error_count * 100 / $total_requests" | bc)
if (( $(echo "$error_rate > 1.0" | bc -l) )); then
    echo "WARNING: High error rate: ${error_rate}%"
fi
```

#### Cost Monitoring
```bash
#!/bin/bash
# cost-monitor.sh

# Run automated cost check
node scripts/cost-monitoring.js > /tmp/cost-report.txt

# Check for critical alerts
if grep -q "CRITICAL" /tmp/cost-report.txt; then
    echo "CRITICAL COST ALERT DETECTED"
    # Send notification
    cat /tmp/cost-report.txt | mail -s "Critical Cost Alert" ops@clearspendly.com
fi
```

## Backup & Recovery

### Automated Backup Verification

```bash
#!/bin/bash
# verify-backups.sh

echo "🔍 Verifying backup integrity..."

# List recent backups
backups=$(node scripts/database-rollback.js list | grep "backup-prod" | head -5)

# Verify each backup file exists and is valid
for backup in $backups; do
    if [ -f "backups/$backup" ]; then
        size=$(du -h "backups/$backup" | cut -f1)
        echo "✅ $backup ($size)"
    else
        echo "❌ $backup - MISSING"
        # Alert on missing backup
        send_alert "CRITICAL: Backup file missing: $backup"
    fi
done

# Test restore on staging (weekly)
if [ "$(date +%u)" -eq 7 ]; then  # Sunday
    echo "🧪 Testing restore procedure on staging..."
    node scripts/database-rollback.js rollback staging
    
    # Verify restore success
    if curl -f https://staging.clearspendly.com/api/health/db; then
        echo "✅ Restore test successful"
    else
        echo "❌ Restore test failed"
        send_alert "CRITICAL: Backup restore test failed"
    fi
fi
```

### Recovery Time Objectives (RTO)

| Scenario | Target RTO | Recovery Procedure |
|----------|------------|-------------------|
| Application failure | 5 minutes | Vercel rollback |
| Database corruption | 1 hour | Point-in-time recovery |
| Complete infrastructure failure | 4 hours | Full disaster recovery |
| Security incident | 15 minutes | Immediate isolation + rollback |

### Recovery Point Objectives (RPO)

| Data Type | Target RPO | Backup Method |
|-----------|------------|---------------|
| Application data | 15 minutes | Continuous replication |
| User uploads | 1 hour | Real-time sync |
| System configuration | 1 day | Infrastructure as Code |
| Audit logs | 1 hour | Real-time streaming |

## Performance Optimization

### Weekly Performance Review

```bash
#!/bin/bash
# weekly-performance-review.sh

echo "📊 Weekly Performance Review - $(date)"

# 1. Database performance
echo "=== Database Performance ==="
supabase db exec --linked "
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
"

# 2. API endpoint performance
echo "=== API Performance ==="
# Analyze Vercel function logs for performance metrics

# 3. Storage performance
echo "=== Storage Performance ==="
supabase storage du --linked

# 4. AI service performance
echo "=== AI Service Performance ==="
node scripts/cost-monitoring.js | grep -A 10 "AI Service"

# 5. Generate optimization recommendations
echo "=== Optimization Recommendations ==="
node scripts/resource-optimization.js --analyze-only
```

### Automated Optimization

```bash
#!/bin/bash
# auto-optimize.sh (runs weekly)

echo "🔧 Running automated optimizations..."

# 1. Database optimizations
node scripts/resource-optimization.js optimizeDatabase

# 2. Storage optimizations  
node scripts/resource-optimization.js optimizeStorage

# 3. AI service optimizations
node scripts/resource-optimization.js optimizeAiServices

# 4. Generate report
node scripts/resource-optimization.js --report

echo "✅ Automated optimizations completed"
```

## Security Procedures

### Security Monitoring

```bash
#!/bin/bash
# security-monitor.sh (runs hourly)

echo "🔐 Security monitoring check - $(date)"

# 1. Check for suspicious activity
suspicious_logins=$(supabase db exec --linked "
SELECT count(*) FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '1 hour' 
AND ip_address NOT IN (SELECT ip FROM trusted_ips);
")

if [ "$suspicious_logins" -gt 10 ]; then
    send_alert "SECURITY: Unusual login activity detected: $suspicious_logins attempts"
fi

# 2. Check for unauthorized access attempts
failed_attempts=$(grep "401\|403" /var/log/access.log | wc -l)
if [ "$failed_attempts" -gt 100 ]; then
    send_alert "SECURITY: High number of unauthorized access attempts: $failed_attempts"
fi

# 3. Verify RLS policies are active
rls_status=$(curl -s https://app.clearspendly.com/api/health/tenant | jq -r '.checks.rlsEnforcement.status')
if [ "$rls_status" != "healthy" ]; then
    send_alert "CRITICAL SECURITY: RLS policies may be disabled or failing"
fi
```

### Incident Response - Security

#### Data Breach Response (P0)
1. **Immediate containment** (0-15 minutes):
   ```bash
   # Disable affected systems immediately
   vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY --target production
   
   # Block suspicious IP addresses
   # Contact Vercel/Supabase support for IP blocking
   
   # Notify security team
   send_alert "SECURITY INCIDENT: Potential data breach detected"
   ```

2. **Assessment** (15-60 minutes):
   - Determine scope of breach
   - Identify affected data
   - Preserve evidence
   - Contact legal/compliance team

3. **Recovery** (1-4 hours):
   - Apply security patches
   - Reset compromised credentials
   - Restore from clean backup if needed
   - Re-enable systems with enhanced monitoring

4. **Communication** (Throughout):
   - Internal stakeholders
   - Affected customers (if required)
   - Regulatory bodies (if required)
   - Public disclosure (if required)

---

## Contact Information

### Emergency Contacts
- **On-call Engineer**: +1-xxx-xxx-xxxx
- **Security Team**: security@clearspendly.com
- **Infrastructure Team**: ops@clearspendly.com

### Service Providers
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **OpenAI Support**: https://help.openai.com/

### Internal Escalation
1. On-call engineer
2. Team lead
3. Engineering manager
4. CTO

---

**Document Version**: 1.0  
**Last Updated**: 2024-07-28  
**Next Review**: 2024-08-28  
**Maintained by**: DevOps Team