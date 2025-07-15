# ClearSpendly Database Structure

## Overview
This document defines the complete database schema for ClearSpendly, designed for multi-tenant SaaS architecture with row-level security (RLS) using Supabase/PostgreSQL.

## Database Design Principles

### Multi-Tenancy
- All tables include `tenant_id` for isolation
- Row-Level Security (RLS) policies enforce data separation
- JWT claims carry tenant context
- No cross-tenant data access possible

### Audit & Tracking
- All tables include `created_at` and `updated_at` timestamps
- Soft deletes with `deleted_at` where applicable
- User action tracking with `created_by` and `updated_by`

### Performance
- Strategic indexing on frequently queried columns
- Composite indexes for common query patterns
- Partial indexes for filtered queries
- pgvector indexes for semantic search

## Core Tables

### 1. tenant
Stores tenant (organization) information.

```sql
CREATE TABLE tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  subscription_status VARCHAR(50) DEFAULT 'trial',
  subscription_plan VARCHAR(50) DEFAULT 'free',
  privacy_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tenant_slug ON tenant(slug);
CREATE INDEX idx_tenant_subscription ON tenant(subscription_status, subscription_plan);
```

### 2. user
Stores user account information (extends Supabase auth.users).

```sql
CREATE TABLE user (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(50),
  timezone VARCHAR(100) DEFAULT 'UTC',
  locale VARCHAR(10) DEFAULT 'en',
  metadata JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_user_deleted ON user(deleted_at) WHERE deleted_at IS NULL;
```

### 3. membership
Links users to tenants with roles.

```sql
CREATE TABLE membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES user(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_membership_tenant ON membership(tenant_id);
CREATE INDEX idx_membership_user ON membership(user_id);
CREATE INDEX idx_membership_role ON membership(role);
```

### 4. vendor
Stores vendor/merchant information.

```sql
CREATE TABLE vendor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  tax_category VARCHAR(50),
  address JSONB,
  phone VARCHAR(50),
  website VARCHAR(500),
  email VARCHAR(255),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES user(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_tenant ON vendor(tenant_id);
CREATE INDEX idx_vendor_name ON vendor(tenant_id, normalized_name);
CREATE INDEX idx_vendor_category ON vendor(tenant_id, category);
```

### 5. receipt
Stores receipt header information.

```sql
CREATE TABLE receipt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendor(id),
  receipt_number VARCHAR(100),
  receipt_date DATE NOT NULL,
  receipt_time TIME,
  total_amount DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  subtotal_amount DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  category VARCHAR(100),
  tags TEXT[],
  notes TEXT,
  
  -- File storage
  original_file_url TEXT NOT NULL,
  original_file_name VARCHAR(255),
  file_size_bytes INTEGER,
  mime_type VARCHAR(100),
  
  -- OCR processing
  ocr_status VARCHAR(50) DEFAULT 'pending',
  ocr_processed_at TIMESTAMPTZ,
  ocr_confidence DECIMAL(3,2),
  ocr_provider VARCHAR(50),
  ocr_raw_data JSONB,
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'upload', -- upload, email, api, mobile
  source_metadata JSONB DEFAULT '{}',
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID REFERENCES receipt(id),
  
  created_by UUID REFERENCES user(id),
  updated_by UUID REFERENCES user(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_receipt_tenant ON receipt(tenant_id);
CREATE INDEX idx_receipt_vendor ON receipt(tenant_id, vendor_id);
CREATE INDEX idx_receipt_date ON receipt(tenant_id, receipt_date DESC);
CREATE INDEX idx_receipt_category ON receipt(tenant_id, category);
CREATE INDEX idx_receipt_ocr_status ON receipt(tenant_id, ocr_status) WHERE ocr_status = 'pending';
CREATE INDEX idx_receipt_tags ON receipt USING GIN(tags);
```

### 6. receipt_item
Stores line-item details from receipts.

```sql
CREATE TABLE receipt_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  receipt_id UUID NOT NULL REFERENCES receipt(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  normalized_description TEXT,
  quantity DECIMAL(12,4) DEFAULT 1,
  unit_price DECIMAL(12,4),
  total_price DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  sku VARCHAR(100),
  barcode VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  
  -- For price tracking
  is_price_anomaly BOOLEAN DEFAULT false,
  expected_price DECIMAL(12,4),
  price_variance_percent DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipt_item_receipt ON receipt_item(receipt_id);
CREATE INDEX idx_receipt_item_tenant ON receipt_item(tenant_id);
CREATE INDEX idx_receipt_item_description ON receipt_item(tenant_id, normalized_description);
CREATE INDEX idx_receipt_item_anomaly ON receipt_item(tenant_id, is_price_anomaly) WHERE is_price_anomaly = true;
```

## Analytics Tables

### 7. price_book
Tracks historical prices for items.

```sql
CREATE TABLE price_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendor(id),
  item_description TEXT NOT NULL,
  normalized_description TEXT NOT NULL,
  unit_price DECIMAL(12,4) NOT NULL,
  quantity DECIMAL(12,4) DEFAULT 1,
  unit_of_measure VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Statistics
  price_count INTEGER DEFAULT 1,
  avg_price DECIMAL(12,4),
  min_price DECIMAL(12,4),
  max_price DECIMAL(12,4),
  std_deviation DECIMAL(12,4),
  
  first_seen_date DATE NOT NULL,
  last_seen_date DATE NOT NULL,
  last_receipt_id UUID REFERENCES receipt(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_book_tenant ON price_book(tenant_id);
CREATE INDEX idx_price_book_vendor ON price_book(tenant_id, vendor_id);
CREATE INDEX idx_price_book_item ON price_book(tenant_id, normalized_description);
CREATE INDEX idx_price_book_dates ON price_book(tenant_id, last_seen_date DESC);
```

### 8. price_alert
Stores price anomaly alerts.

```sql
CREATE TABLE price_alert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  receipt_item_id UUID NOT NULL REFERENCES receipt_item(id),
  price_book_id UUID REFERENCES price_book(id),
  alert_type VARCHAR(50) NOT NULL, -- price_increase, new_high, unusual_quantity
  severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  
  current_price DECIMAL(12,4) NOT NULL,
  expected_price DECIMAL(12,4),
  variance_amount DECIMAL(12,4),
  variance_percent DECIMAL(5,2),
  
  message TEXT,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES user(id),
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_alert_tenant ON price_alert(tenant_id);
CREATE INDEX idx_price_alert_unack ON price_alert(tenant_id, is_acknowledged) WHERE is_acknowledged = false;
CREATE INDEX idx_price_alert_date ON price_alert(tenant_id, created_at DESC);
```

## Subscription Tables

### 9. subscription_mirror
Mirrors Polar subscription data.

```sql
CREATE TABLE subscription_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  polar_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  polar_customer_id VARCHAR(255) NOT NULL,
  plan_id VARCHAR(100) NOT NULL,
  plan_name VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_tenant ON subscription_mirror(tenant_id);
CREATE INDEX idx_subscription_polar ON subscription_mirror(polar_subscription_id);
CREATE INDEX idx_subscription_status ON subscription_mirror(status);
```

### 10. subscription_usage
Tracks usage against subscription limits.

```sql
CREATE TABLE subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  billing_period DATE NOT NULL,
  metric_name VARCHAR(100) NOT NULL, -- receipts_processed, storage_gb, api_calls
  usage_count INTEGER DEFAULT 0,
  limit_count INTEGER,
  overage_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, billing_period, metric_name)
);

CREATE INDEX idx_usage_tenant ON subscription_usage(tenant_id);
CREATE INDEX idx_usage_period ON subscription_usage(billing_period DESC);
```

## User Preference Tables

### 11. user_pref
Stores user-specific preferences.

```sql
CREATE TABLE user_pref (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}',
  
  -- Notification preferences
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  notification_frequency VARCHAR(50) DEFAULT 'daily',
  
  -- UI preferences
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Feature preferences
  default_category VARCHAR(100),
  auto_categorize BOOLEAN DEFAULT true,
  privacy_mode BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_user_pref_user ON user_pref(user_id);
CREATE INDEX idx_user_pref_tenant ON user_pref(tenant_id);
```

## Integration Tables

### 12. email_connector
Stores email integration configurations.

```sql
CREATE TABLE email_connector (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user(id),
  provider VARCHAR(50) NOT NULL, -- gmail, outlook, custom
  email_address VARCHAR(255) NOT NULL,
  forward_address VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email_address)
);

CREATE INDEX idx_email_connector_tenant ON email_connector(tenant_id);
CREATE INDEX idx_email_connector_user ON email_connector(user_id);
CREATE INDEX idx_email_connector_sync ON email_connector(sync_enabled) WHERE sync_enabled = true;
```

## AI/ML Tables

### 13. training_queue
Queues receipts for model training.

```sql
CREATE TABLE training_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipt(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  training_type VARCHAR(50) NOT NULL, -- ocr, categorization, vendor_matching
  priority INTEGER DEFAULT 5,
  status VARCHAR(50) DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_queue_status ON training_queue(status, priority DESC) WHERE status = 'pending';
CREATE INDEX idx_training_queue_tenant ON training_queue(tenant_id);
```

### 14. model_registry
Tracks ML model versions and performance.

```sql
CREATE TABLE model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  model_type VARCHAR(50) NOT NULL, -- ocr, classification, ner
  provider VARCHAR(50) NOT NULL, -- ollama, openai, custom
  is_active BOOLEAN DEFAULT false,
  performance_metrics JSONB DEFAULT '{}',
  configuration JSONB DEFAULT '{}',
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_name, model_version)
);

CREATE INDEX idx_model_active ON model_registry(is_active) WHERE is_active = true;
```

## Vector Search Tables

### 15. receipt_embeddings
Stores vector embeddings for semantic search.

```sql
CREATE TABLE receipt_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipt(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  embedding vector(768), -- Adjust dimension based on model
  embedding_model VARCHAR(100),
  content_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipt_embeddings_tenant ON receipt_embeddings(tenant_id);
CREATE INDEX idx_receipt_embeddings_vector ON receipt_embeddings USING ivfflat (embedding vector_l2_ops);
```

## Support Tables

### 16. support_ticket
Tracks user support requests.

```sql
CREATE TABLE support_ticket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user(id),
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  subject VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',
  assigned_to UUID REFERENCES user(id),
  resolved_at TIMESTAMPTZ,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_ticket_tenant ON support_ticket(tenant_id);
CREATE INDEX idx_support_ticket_user ON support_ticket(user_id);
CREATE INDEX idx_support_ticket_status ON support_ticket(status) WHERE status != 'closed';
```

## Row-Level Security Policies

### Example RLS Policy Structure

```sql
-- Enable RLS on all tables
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE user ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership ENABLE ROW LEVEL SECURITY;
-- ... (enable for all tables)

-- Tenant table policies
CREATE POLICY tenant_select ON tenant
  FOR SELECT USING (
    id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member', 'viewer')
    )
  );

CREATE POLICY tenant_insert ON tenant
  FOR INSERT WITH CHECK (false); -- Only system can create tenants

CREATE POLICY tenant_update ON tenant
  FOR UPDATE USING (
    id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Receipt table policies
CREATE POLICY receipt_select ON receipt
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY receipt_insert ON receipt
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY receipt_update ON receipt
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY receipt_delete ON receipt
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );
```

## Database Functions & Triggers

### Auto-update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_tenant_updated_at BEFORE UPDATE ON tenant
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ... (create for all tables)
```

### Tenant isolation function

```sql
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### Price anomaly detection

```sql
CREATE OR REPLACE FUNCTION check_price_anomaly()
RETURNS TRIGGER AS $$
DECLARE
  avg_price DECIMAL(12,4);
  std_dev DECIMAL(12,4);
BEGIN
  -- Get historical price data
  SELECT 
    AVG(unit_price),
    STDDEV(unit_price)
  INTO avg_price, std_dev
  FROM receipt_item
  WHERE tenant_id = NEW.tenant_id
    AND normalized_description = NEW.normalized_description
    AND created_at > NOW() - INTERVAL '90 days';
  
  -- Check if price is anomalous (> 2 std deviations)
  IF avg_price IS NOT NULL AND std_dev > 0 THEN
    IF ABS(NEW.unit_price - avg_price) > (2 * std_dev) THEN
      NEW.is_price_anomaly = true;
      NEW.expected_price = avg_price;
      NEW.price_variance_percent = ((NEW.unit_price - avg_price) / avg_price * 100);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_receipt_item_price_anomaly
  BEFORE INSERT OR UPDATE ON receipt_item
  FOR EACH ROW EXECUTE FUNCTION check_price_anomaly();
```

## Indexes Summary

### Performance-Critical Indexes
1. **Tenant isolation**: All tables indexed on tenant_id
2. **User lookups**: Indexed on user_id where applicable
3. **Date-based queries**: Receipt date, created_at indexes
4. **Search operations**: GIN indexes on JSONB, arrays
5. **Vector search**: IVFFlat index on embeddings
6. **Status filtering**: Partial indexes on status columns

### Composite Indexes
- (tenant_id, receipt_date) for date-range queries
- (tenant_id, vendor_id) for vendor reports
- (tenant_id, category) for category analytics
- (tenant_id, normalized_description) for item lookups

## Data Migration Considerations

### Initial Setup
1. Run migrations in order
2. Create all tables before enabling RLS
3. Set up initial tenant and admin user
4. Configure Supabase Auth integration

### Production Deployment
1. Use migration tools (Supabase CLI, Flyway)
2. Test RLS policies thoroughly
3. Verify index performance
4. Monitor query performance

## Backup & Recovery

### Backup Strategy
- Daily automated backups via Supabase
- Point-in-time recovery enabled
- Regular backup testing
- Off-site backup storage

### Recovery Procedures
1. Document RTO/RPO requirements
2. Test recovery procedures quarterly
3. Maintain runbooks for common scenarios
4. Monitor backup success rates

## Performance Optimization

### Query Optimization
- Use EXPLAIN ANALYZE for slow queries
- Implement query result caching
- Use materialized views for analytics
- Partition large tables by date

### Connection Pooling
- Configure PgBouncer settings
- Monitor connection usage
- Implement connection retry logic
- Use read replicas for analytics

## Security Considerations

### Data Encryption
- Enable encryption at rest
- Use SSL/TLS for connections
- Encrypt sensitive fields (tokens)
- Implement field-level encryption for PII

### Access Control
- Principle of least privilege
- Regular permission audits
- API rate limiting
- Session management

## Monitoring & Maintenance

### Key Metrics
- Query performance (p95, p99)
- Table sizes and growth rates
- Index usage statistics
- RLS policy execution time

### Maintenance Tasks
- Weekly VACUUM ANALYZE
- Monthly index rebuild
- Quarterly schema review
- Annual capacity planning