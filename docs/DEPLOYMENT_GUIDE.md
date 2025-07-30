# ClearSpendly SaaS Deployment Guide

This comprehensive guide covers the deployment architecture, setup procedures, and operational guidelines for ClearSpendly's multi-tenant SaaS application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Database Migrations](#database-migrations)
5. [Deployment Process](#deployment-process)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Cost Optimization](#cost-optimization)
8. [Troubleshooting](#troubleshooting)
9. [Emergency Procedures](#emergency-procedures)

## Architecture Overview

ClearSpendly uses a modern, cloud-native architecture optimized for multi-tenant SaaS:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Actions │    │   Vercel        │    │   Supabase      │
│   CI/CD Pipeline │───▶│   Next.js App   │───▶│   PostgreSQL    │
└─────────────────┘    └─────────────────┘    │   Storage       │
                                              │   Auth          │
                                              └─────────────────┘
                                                      │
                                              ┌─────────────────┐
                                              │   AI Services   │
                                              │   OpenAI/Ollama │
                                              └─────────────────┘
```

### Key Components

- **Frontend**: Next.js 15 with TypeScript
- **Backend**: Next.js API routes + Supabase
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Storage**: Supabase Storage for receipts/documents
- **AI**: OpenAI/Ollama for OCR enhancement
- **Deployment**: Vercel for app, GitHub Actions for automation
- **Monitoring**: Health check endpoints, cost monitoring

## Prerequisites

### Required Accounts & Services

1. **GitHub** - Source control and CI/CD
2. **Vercel** - Application hosting
3. **Supabase** - Database and backend services
4. **OpenAI** (optional) - AI-enhanced OCR
5. **Monitoring services** (DataDog, New Relic, etc.)

### Local Development Setup

```bash
# Install dependencies
npm install

# Install Supabase CLI
npm install -g supabase

# Setup environment files
cp .env.local.example .env.local
cp .env.staging.example .env.staging
cp .env.production.example .env.production
```

### Required Environment Variables

#### Staging Environment
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_staging_service_role_key
NEXT_PUBLIC_OPENAI_API_KEY=your_staging_openai_key
# ... see .env.staging for complete list
```

#### Production Environment
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
NEXT_PUBLIC_OPENAI_API_KEY=your_production_openai_key
# ... see .env.production for complete list
```

## Environment Setup

### 1. Supabase Projects Setup

#### Create Projects
```bash
# Create staging project
supabase projects create clearspendly-staging

# Create production project
supabase projects create clearspendly-production
```

#### Link Projects
```bash
# Link staging
supabase link --project-ref your-staging-project-id

# Link production
supabase link --project-ref your-production-project-id
```

### 2. GitHub Secrets Configuration

Add the following secrets to your GitHub repository:

#### Supabase Secrets
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_STAGING_PROJECT_ID`
- `SUPABASE_PRODUCTION_PROJECT_ID`

#### Vercel Secrets
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_STAGING_PROJECT_ID`
- `VERCEL_PRODUCTION_PROJECT_ID`

#### Service Secrets
- `STAGING_URL`
- `PRODUCTION_URL`
- `SLACK_WEBHOOK` (for notifications)

### 3. Vercel Projects Setup

#### Create Projects
1. Create staging project in Vercel
2. Create production project in Vercel
3. Configure environment variables for each project
4. Set up custom domains

#### Environment Variables in Vercel
Upload your environment files to each Vercel project:
- Staging: Use `.env.staging` values
- Production: Use `.env.production` values

## Database Migrations

### Migration Safety System

Our deployment includes a comprehensive migration safety system:

```bash
# Check migration safety
node scripts/migration-safety-check.js

# Create backup before migration
node scripts/database-rollback.js backup production

# Run migrations with safety checks
supabase db push --linked
```

### Migration Process

#### 1. Development
```bash
# Create new migration
supabase migration new your_migration_name

# Test locally
supabase db reset
supabase db push

# Verify changes
npm run db:generate-types
```

#### 2. Staging Deployment
Migrations are automatically applied when pushing to `develop` branch:

1. GitHub Actions runs migration safety check
2. Creates pre-migration backup
3. Applies migrations to staging database
4. Runs post-migration verification
5. Updates TypeScript types

#### 3. Production Deployment
Migrations are applied when pushing to `main/master` branch:

1. **Validation**: Comprehensive safety checks
2. **Backup**: Full production database backup
3. **Migration**: Apply changes with rollback capability
4. **Verification**: Database integrity checks
5. **Monitoring**: Post-deployment health checks

### Rollback Procedures

#### Automatic Rollback
```bash
# List available backups
node scripts/database-rollback.js list

# Perform rollback (interactive)
node scripts/database-rollback.js rollback production
```

#### Manual Rollback
```bash
# Emergency rollback to specific backup
supabase db reset --linked --backup-file backup-prod-20240728-120000.sql
```

## Deployment Process

### Branch Strategy

```
main/master    → Production deployment
develop        → Staging deployment
feature/*      → Development builds
```

### Automated Deployment Flow

#### Staging Deployment (`develop` branch)
1. **Tests**: Unit tests, type checking, linting
2. **Security**: Vulnerability scanning
3. **Database**: Migration safety check and execution
4. **Deploy**: Application deployment to staging
5. **Health Checks**: Comprehensive system verification
6. **Notifications**: Team notification of deployment status

#### Production Deployment (`main/master` branch)
1. **Validation**: Production readiness checks
2. **Backup**: Full database and file backup
3. **Database**: Staged migration with rollback capability
4. **Deploy**: Blue-green deployment to production
5. **Verification**: Comprehensive health and performance checks
6. **Monitoring**: Enhanced monitoring activation
7. **Notifications**: Stakeholder notifications

### Manual Deployment Commands

#### Emergency Deployment
```bash
# Deploy specific commit to production
git checkout main
git merge --no-ff feature/emergency-fix
git push origin main
```

#### Hotfix Deployment
```bash
# Create and deploy hotfix
git checkout -b hotfix/critical-fix main
# Make changes
git commit -m "fix: critical issue"
git push origin hotfix/critical-fix
# Create PR to main
```

## Monitoring & Health Checks

### Health Check Endpoints

| Endpoint | Purpose | Status Codes |
|----------|---------|--------------|
| `/api/health` | Overall system health | 200, 503 |
| `/api/health/db` | Database connectivity | 200, 503 |
| `/api/health/tenant` | Multi-tenant system | 200, 503 |
| `/api/health/ai` | AI services | 200, 503 |

### Health Check Examples

```bash
# Basic health check
curl https://app.clearspendly.com/api/health

# Database health
curl https://app.clearspendly.com/api/health/db

# AI services health
curl https://app.clearspendly.com/api/health/ai
```

### Monitoring Dashboard

Monitor these key metrics:

#### Application Metrics
- Response time (< 500ms target)
- Error rate (< 1% target)
- Uptime (99.9% target)

#### Database Metrics
- Connection pool usage (< 80%)
- Query performance (< 1000ms average)
- Storage usage (< 90% capacity)

#### AI Service Metrics
- Token usage rate
- API response time
- Error rate and fallback usage

#### Multi-Tenant Metrics
- Tenant isolation verification
- Cross-tenant data leakage checks
- RLS policy performance

## Cost Optimization

### Automated Cost Monitoring

```bash
# Run cost analysis
node scripts/cost-monitoring.js

# Execute optimizations
node scripts/resource-optimization.js
```

### Cost Optimization Areas

#### Database Optimization
- Query performance tuning
- Index optimization
- Connection pooling
- Data archiving strategies

#### Storage Optimization
- Image compression
- File deduplication
- Cleanup policies
- CDN optimization

#### AI Service Optimization
- Response caching
- Prompt optimization
- Request batching
- Provider fallback strategies

#### Compute Optimization
- Function caching
- Bundle size optimization
- Auto-scaling policies
- Resource allocation tuning

### Cost Alerts & Thresholds

| Service | Warning Threshold | Critical Threshold |
|---------|------------------|-------------------|
| Database | 80% capacity | 95% capacity |
| Storage | 75% usage | 90% usage |
| AI Services | $50/day | $100/day |
| Compute | 70% CPU | 85% CPU |

## Troubleshooting

### Common Issues

#### 1. Migration Failures
```bash
# Check migration status
supabase db diff --linked

# Rollback to previous state
node scripts/database-rollback.js rollback production

# Re-apply with fixes
supabase db push --linked
```

#### 2. Health Check Failures
```bash
# Check specific service
curl https://app.clearspendly.com/api/health/db

# Review logs
vercel logs --tail

# Check database connectivity
supabase db inspect --linked
```

#### 3. Performance Issues
```bash
# Analyze slow queries
node scripts/cost-monitoring.js

# Run optimizations
node scripts/resource-optimization.js

# Check resource usage
vercel inspect
```

#### 4. AI Service Issues
```bash
# Test AI endpoints
curl https://app.clearspendly.com/api/health/ai

# Check provider status
# OpenAI: https://status.openai.com/
# Ollama: Check local deployment
```

### Debug Commands

#### Database Debugging
```bash
# Connect to database
supabase db connect --linked

# Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM receipts WHERE tenant_id = 'tenant-123';
```

#### Application Debugging
```bash
# Check deployment logs
vercel logs --project-id your-project-id

# Local development with production data
supabase link --project-ref production-project-id
supabase db pull
npm run dev
```

## Emergency Procedures

### Emergency Contacts

- **Development Team**: dev-team@clearspendly.com
- **Infrastructure Team**: ops@clearspendly.com
- **On-Call**: +1-xxx-xxx-xxxx

### Incident Response

#### Severity Levels

**P0 - Critical (< 15 min response)**
- Complete service outage
- Data breach or security incident
- Payment processing failure

**P1 - High (< 1 hour response)**
- Significant feature unavailability
- Performance degradation > 50%
- AI services completely down

**P2 - Medium (< 4 hours response)**
- Minor feature issues
- Performance degradation < 50%
- Non-critical integrations down

#### Emergency Rollback

```bash
# 1. Immediate application rollback
vercel rollback --token=$VERCEL_TOKEN

# 2. Database rollback (if needed)
node scripts/database-rollback.js rollback production

# 3. Notify stakeholders
# Use Slack webhook or emergency communication system

# 4. Post-incident analysis
# Document in post-mortem template
```

### Disaster Recovery

#### RTO/RPO Targets
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour

#### Backup Strategy
- **Database**: Daily automated backups + point-in-time recovery
- **Files**: Real-time replication across regions
- **Code**: Git repository with multiple remotes
- **Configuration**: Infrastructure as Code (IaC)

#### Recovery Procedures
1. **Assessment**: Determine scope and impact
2. **Communication**: Notify stakeholders and customers
3. **Recovery**: Execute appropriate recovery procedure
4. **Verification**: Comprehensive system testing
5. **Post-mortem**: Document lessons learned

---

## Support & Documentation

### Additional Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Security Guidelines](./SECURITY.md)
- [Performance Tuning](./PERFORMANCE.md)

### Getting Help

For deployment issues or questions:
1. Check this documentation
2. Review GitHub Actions logs
3. Check health endpoints
4. Contact the development team
5. Create GitHub issue with deployment label

---

**Document Version**: 1.0  
**Last Updated**: 2024-07-28  
**Next Review**: 2024-08-28