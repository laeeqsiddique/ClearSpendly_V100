-- Tagging System Database Schema for ClearSpendly

-- Tag Categories (Predefined structure for organizing tags)
CREATE TABLE tag_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1', -- Hex color code
    required BOOLEAN DEFAULT FALSE, -- Must have a tag from this category
    multiple BOOLEAN DEFAULT TRUE, -- Can have multiple tags from this category
    sort_order INTEGER DEFAULT 0,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(name, tenant_id)
);

-- Individual Tags (User-created within categories)
CREATE TABLE tag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES tag_category(id) ON DELETE CASCADE,
    color VARCHAR(7), -- Optional override of category color
    usage_count INTEGER DEFAULT 0, -- For autocomplete popularity
    tenant_id UUID NOT NULL,
    created_by UUID, -- User who created this tag
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(name, category_id, tenant_id)
);

-- Receipt Tags (Many-to-many relationship)
CREATE TABLE receipt_tag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES receipt(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(receipt_id, tag_id)
);

-- Receipt Item Tags (Many-to-many relationship)
CREATE TABLE receipt_item_tag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_item_id UUID NOT NULL REFERENCES receipt_item(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(receipt_item_id, tag_id)
);

-- Indexes for performance
CREATE INDEX idx_tag_category_tenant_id ON tag_category(tenant_id);
CREATE INDEX idx_tag_tenant_id ON tag(tenant_id);
CREATE INDEX idx_tag_category_id ON tag(category_id);
CREATE INDEX idx_tag_usage_count ON tag(usage_count DESC);
CREATE INDEX idx_receipt_tag_receipt_id ON receipt_tag(receipt_id);
CREATE INDEX idx_receipt_tag_tag_id ON receipt_tag(tag_id);
CREATE INDEX idx_receipt_tag_tenant_id ON receipt_tag(tenant_id);
CREATE INDEX idx_receipt_item_tag_item_id ON receipt_item_tag(receipt_item_id);
CREATE INDEX idx_receipt_item_tag_tag_id ON receipt_item_tag(tag_id);
CREATE INDEX idx_receipt_item_tag_tenant_id ON receipt_item_tag(tenant_id);

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tag 
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tag 
        SET usage_count = GREATEST(usage_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to maintain usage counts
CREATE TRIGGER receipt_tag_usage_trigger
    AFTER INSERT OR DELETE ON receipt_tag
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER receipt_item_tag_usage_trigger
    AFTER INSERT OR DELETE ON receipt_item_tag
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER tag_category_updated_at
    BEFORE UPDATE ON tag_category
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tag_updated_at
    BEFORE UPDATE ON tag
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default tag categories for new tenants
INSERT INTO tag_category (name, description, color, required, multiple, sort_order, tenant_id) VALUES
('Project', 'Project or initiative this expense belongs to', '#8b5cf6', true, false, 1, '00000000-0000-0000-0000-000000000001'),
('Department', 'Department responsible for this expense', '#06b6d4', true, false, 2, '00000000-0000-0000-0000-000000000001'),
('Tax Status', 'Tax deductibility status', '#10b981', false, false, 3, '00000000-0000-0000-0000-000000000001'),
('Client', 'Client this expense was incurred for', '#f59e0b', false, false, 4, '00000000-0000-0000-0000-000000000001'),
('Expense Type', 'Type of business expense', '#ef4444', false, true, 5, '00000000-0000-0000-0000-000000000001');

-- Insert some default tags
INSERT INTO tag (name, category_id, tenant_id) VALUES
-- Project tags
('Q1-2024', (SELECT id FROM tag_category WHERE name = 'Project' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),
('Website-Redesign', (SELECT id FROM tag_category WHERE name = 'Project' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),
('Product-Launch', (SELECT id FROM tag_category WHERE name = 'Project' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),

-- Department tags
('Engineering', (SELECT id FROM tag_category WHERE name = 'Department' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),
('Marketing', (SELECT id FROM tag_category WHERE name = 'Department' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),
('Sales', (SELECT id FROM tag_category WHERE name = 'Department' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),
('Operations', (SELECT id FROM tag_category WHERE name = 'Department' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),

-- Tax Status tags
('Deductible', (SELECT id FROM tag_category WHERE name = 'Tax Status' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),
('Personal', (SELECT id FROM tag_category WHERE name = 'Tax Status' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),
('Mixed', (SELECT id FROM tag_category WHERE name = 'Tax Status' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),

-- Client tags
('Acme-Corp', (SELECT id FROM tag_category WHERE name = 'Client' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),
('Beta-Industries', (SELECT id FROM tag_category WHERE name = 'Client' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),
('Internal', (SELECT id FROM tag_category WHERE name = 'Client' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),

-- Expense Type tags
('Travel', (SELECT id FROM tag_category WHERE name = 'Expense Type' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),
('Meals', (SELECT id FROM tag_category WHERE name = 'Expense Type' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),
('Equipment', (SELECT id FROM tag_category WHERE name = 'Expense Type' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),
('Software', (SELECT id FROM tag_category WHERE name = 'Expense Type' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001'),
('Marketing', (SELECT id FROM tag_category WHERE name = 'Expense Type' AND tenant_id = '00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001');

-- RLS Policies (Row Level Security)
ALTER TABLE tag_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_item_tag ENABLE ROW LEVEL SECURITY;

-- Policies for tag_category
CREATE POLICY "Users can view tag categories for their tenant" ON tag_category
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can manage tag categories for their tenant" ON tag_category
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Policies for tag
CREATE POLICY "Users can view tags for their tenant" ON tag
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can manage tags for their tenant" ON tag
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Policies for receipt_tag
CREATE POLICY "Users can view receipt tags for their tenant" ON receipt_tag
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can manage receipt tags for their tenant" ON receipt_tag
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Policies for receipt_item_tag
CREATE POLICY "Users can view receipt item tags for their tenant" ON receipt_item_tag
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can manage receipt item tags for their tenant" ON receipt_item_tag
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);