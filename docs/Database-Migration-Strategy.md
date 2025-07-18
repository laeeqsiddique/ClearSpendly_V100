# Database Migration Strategy for Production Deployment

## Current Situation
- **Development**: Manual SQL execution in Supabase dashboard
- **Production**: Need automated, versioned migrations
- **Challenge**: Tagging system schema needs to be deployed safely

## Migration Approaches for Supabase

### 1. **Supabase CLI Migrations (Recommended)**

#### Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize in project
supabase init

# Link to remote project
supabase link --project-ref YOUR_PROJECT_REF
```

#### Migration Workflow
```bash
# Create migration file
supabase migration new add_tagging_system

# Edit the generated file with our schema
# File: supabase/migrations/YYYYMMDDHHMMSS_add_tagging_system.sql

# Apply to local development
supabase db push

# Deploy to production
supabase db push --linked
```

#### Advantages
- Version controlled migrations
- Rollback capabilities  
- Automatic schema diffing
- CI/CD integration ready

### 2. **Manual Production Deployment**

#### Process
1. **Staging Deployment**
   - Test full schema on staging Supabase project
   - Validate all APIs work with new tables
   - Run integration tests

2. **Production Deployment**
   - Maintenance window announcement
   - Execute schema in production Supabase
   - Deploy application code
   - Validate functionality

3. **Rollback Plan**
   - Keep backup of current schema
   - Prepared rollback SQL scripts
   - Application rollback ready

### 3. **Zero-Downtime Migration Strategy**

#### Phase 1: Schema Addition (Non-breaking)
```sql
-- Add new tables without dependencies
CREATE TABLE tag_category (...);
CREATE TABLE tag (...);
-- Add indexes
-- Add RLS policies
```

#### Phase 2: Application Deployment
- Deploy new code that can work with/without tagging
- Feature flags for tagging functionality
- Gradual rollout

#### Phase 3: Data Population
```sql
-- Insert default categories and tags
-- Migrate existing data if needed
```

#### Phase 4: Enable Features
- Turn on tagging features via feature flags
- Monitor performance and errors

## Migration Files Structure

### Primary Migration: Core Schema
**File**: `supabase/migrations/001_add_tagging_system.sql`
```sql
-- Core tables (tag_category, tag, receipt_tag, receipt_item_tag)
-- Indexes for performance
-- Basic RLS policies
```

### Secondary Migration: Default Data
**File**: `supabase/migrations/002_add_default_tags.sql`
```sql
-- Default categories (Project, Department, etc.)
-- Sample tags
-- Tenant-specific data
```

### Trigger Migration: Advanced Features
**File**: `supabase/migrations/003_add_tag_triggers.sql`
```sql
-- Usage count triggers
-- Updated_at triggers
-- Business logic functions
```

## Production Deployment Checklist

### Pre-Deployment
- [ ] Test complete schema on staging environment
- [ ] Validate all API endpoints work
- [ ] Run performance tests on tag queries
- [ ] Prepare rollback scripts
- [ ] Schedule maintenance window (if needed)

### Deployment Steps
1. [ ] **Backup current database** (Supabase automatic backups)
2. [ ] **Execute core schema migration**
   - Create tables and indexes
   - Add RLS policies
3. [ ] **Deploy application code**
   - Feature flags OFF initially
   - Graceful degradation if tables missing
4. [ ] **Populate default data**
   - Insert categories and tags
   - Validate data integrity
5. [ ] **Enable features**
   - Turn on tagging in UI
   - Monitor error rates
6. [ ] **Performance validation**
   - Check query performance
   - Monitor database metrics

### Post-Deployment
- [ ] Validate all tagging functionality works
- [ ] Monitor application performance
- [ ] Check error rates and logs
- [ ] User acceptance testing
- [ ] Update documentation

## Environment-Specific Considerations

### Development
- Manual SQL execution in dashboard
- Frequent schema changes allowed
- Reset database as needed

### Staging
- Mirror production deployment process
- Full integration testing
- Performance benchmarking

### Production
- Automated migration execution
- Zero-downtime deployment
- Comprehensive monitoring
- Rollback plan ready

## Supabase-Specific Best Practices

### 1. **RLS Policy Deployment**
```sql
-- Deploy RLS policies AFTER tables
-- Test with actual user tokens
-- Validate tenant isolation works
```

### 2. **Index Strategy**
```sql
-- Add indexes BEFORE enabling features
-- Monitor index usage in production
-- Consider partial indexes for large datasets
```

### 3. **Data Seeding**
```sql
-- Use UPSERT for default data
-- Make seeding idempotent
-- Handle conflicts gracefully
```

### 4. **Monitoring**
- Supabase dashboard metrics
- Query performance monitoring
- RLS policy performance
- Connection pool usage

## Migration Rollback Strategy

### Automatic Rollback Triggers
- API error rate > 5%
- Database query timeout > 2s
- RLS policy failures

### Manual Rollback Process
1. **Disable new features** (feature flags)
2. **Revert application code** (previous deployment)
3. **Database rollback** (if absolutely necessary)
   ```sql
   -- Drop tables in reverse order
   DROP TABLE receipt_item_tag;
   DROP TABLE receipt_tag;
   DROP TABLE tag;
   DROP TABLE tag_category;
   ```

## Future Migration Considerations

### Tenant Onboarding
- Automatic tag category creation for new tenants
- Default tag creation workflow
- Migration scripts for existing tenants

### Schema Evolution
- Adding new tag categories
- Modifying existing constraints
- Performance optimizations

### Data Archival
- Old tag data cleanup
- Unused tag removal
- Performance maintenance

---

## Recommended Implementation

For ClearSpendly production deployment, we recommend:

1. **Use Supabase CLI migrations** for version control
2. **Implement feature flags** for gradual rollout
3. **Deploy in phases** to minimize risk
4. **Comprehensive testing** on staging first
5. **Monitor closely** during and after deployment

This ensures a safe, reversible, and monitored deployment of the tagging system to production.