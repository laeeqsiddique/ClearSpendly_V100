-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create tenant table
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

-- Create indexes for tenant
CREATE INDEX idx_tenant_slug ON tenant(slug);
CREATE INDEX idx_tenant_subscription ON tenant(subscription_status, subscription_plan);
CREATE INDEX idx_tenant_deleted ON tenant(deleted_at) WHERE deleted_at IS NULL;

-- Create user table (extends Supabase auth.users)
CREATE TABLE "user" (
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

-- Create indexes for user
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_deleted ON "user"(deleted_at) WHERE deleted_at IS NULL;

-- Create membership table
CREATE TABLE membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES "user"(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- Create indexes for membership
CREATE INDEX idx_membership_tenant ON membership(tenant_id);
CREATE INDEX idx_membership_user ON membership(user_id);
CREATE INDEX idx_membership_role ON membership(role);

-- Create vendor table
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
  created_by UUID REFERENCES "user"(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for vendor
CREATE INDEX idx_vendor_tenant ON vendor(tenant_id);
CREATE INDEX idx_vendor_name ON vendor(tenant_id, normalized_name);
CREATE INDEX idx_vendor_category ON vendor(tenant_id, category);

-- Create receipt table
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
  source VARCHAR(50) DEFAULT 'upload',
  source_metadata JSONB DEFAULT '{}',
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID REFERENCES receipt(id),
  
  created_by UUID REFERENCES "user"(id),
  updated_by UUID REFERENCES "user"(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for receipt
CREATE INDEX idx_receipt_tenant ON receipt(tenant_id);
CREATE INDEX idx_receipt_vendor ON receipt(tenant_id, vendor_id);
CREATE INDEX idx_receipt_date ON receipt(tenant_id, receipt_date DESC);
CREATE INDEX idx_receipt_category ON receipt(tenant_id, category);
CREATE INDEX idx_receipt_ocr_status ON receipt(tenant_id, ocr_status) WHERE ocr_status = 'pending';
CREATE INDEX idx_receipt_tags ON receipt USING GIN(tags);
CREATE INDEX idx_receipt_deleted ON receipt(deleted_at) WHERE deleted_at IS NULL;

-- Create receipt_item table
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

-- Create indexes for receipt_item
CREATE INDEX idx_receipt_item_receipt ON receipt_item(receipt_id);
CREATE INDEX idx_receipt_item_tenant ON receipt_item(tenant_id);
CREATE INDEX idx_receipt_item_description ON receipt_item(tenant_id, normalized_description);
CREATE INDEX idx_receipt_item_anomaly ON receipt_item(tenant_id, is_price_anomaly) WHERE is_price_anomaly = true;

-- Create function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_tenant_updated_at BEFORE UPDATE ON tenant
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_membership_updated_at BEFORE UPDATE ON membership
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vendor_updated_at BEFORE UPDATE ON vendor
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_receipt_updated_at BEFORE UPDATE ON receipt
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_receipt_item_updated_at BEFORE UPDATE ON receipt_item
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create function for tenant context
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security on all tables
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_item ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant table
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

-- Create RLS policies for user table
CREATE POLICY user_select ON "user"
  FOR SELECT USING (
    id = auth.uid() OR 
    id IN (
      SELECT u.id FROM "user" u
      JOIN membership m ON u.id = m.user_id
      WHERE m.tenant_id IN (
        SELECT tenant_id FROM membership 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY user_insert ON "user"
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY user_update ON "user"
  FOR UPDATE USING (id = auth.uid());

-- Create RLS policies for membership table
CREATE POLICY membership_select ON membership
  FOR SELECT USING (
    user_id = auth.uid() OR 
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY membership_insert ON membership
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY membership_update ON membership
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Create RLS policies for vendor table
CREATE POLICY vendor_select ON vendor
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY vendor_insert ON vendor
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY vendor_update ON vendor
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

-- Create RLS policies for receipt table
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

-- Create RLS policies for receipt_item table
CREATE POLICY receipt_item_select ON receipt_item
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY receipt_item_insert ON receipt_item
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY receipt_item_update ON receipt_item
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY receipt_item_delete ON receipt_item
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM membership 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );