-- Add system field to tag_category table to mark protected categories
ALTER TABLE tag_category ADD COLUMN IF NOT EXISTS system BOOLEAN DEFAULT FALSE;

-- Update existing core categories to be system categories (non-deletable)
UPDATE tag_category 
SET system = TRUE 
WHERE name IN ('Project', 'Department', 'Tax Status', 'Expense Type')
AND tenant_id = '00000000-0000-0000-0000-000000000001';

-- Client category remains user-manageable (system = false)
UPDATE tag_category 
SET system = FALSE 
WHERE name = 'Client'
AND tenant_id = '00000000-0000-0000-0000-000000000001';

-- Add some common expense type tags if they don't exist
INSERT INTO tag (name, category_id, tenant_id) 
SELECT 'Office Supplies', id, '00000000-0000-0000-0000-000000000001'
FROM tag_category 
WHERE name = 'Expense Type' AND tenant_id = '00000000-0000-0000-0000-000000000001'
AND NOT EXISTS (
    SELECT 1 FROM tag 
    WHERE name = 'Office Supplies' 
    AND category_id = tag_category.id
);

INSERT INTO tag (name, category_id, tenant_id) 
SELECT 'Transportation', id, '00000000-0000-0000-0000-000000000001'
FROM tag_category 
WHERE name = 'Expense Type' AND tenant_id = '00000000-0000-0000-0000-000000000001'
AND NOT EXISTS (
    SELECT 1 FROM tag 
    WHERE name = 'Transportation' 
    AND category_id = tag_category.id
);

INSERT INTO tag (name, category_id, tenant_id) 
SELECT 'Communications', id, '00000000-0000-0000-0000-000000000001'
FROM tag_category 
WHERE name = 'Expense Type' AND tenant_id = '00000000-0000-0000-0000-000000000001'
AND NOT EXISTS (
    SELECT 1 FROM tag 
    WHERE name = 'Communications' 
    AND category_id = tag_category.id
);

INSERT INTO tag (name, category_id, tenant_id) 
SELECT 'Utilities', id, '00000000-0000-0000-0000-000000000001'
FROM tag_category 
WHERE name = 'Expense Type' AND tenant_id = '00000000-0000-0000-0000-000000000001'
AND NOT EXISTS (
    SELECT 1 FROM tag 
    WHERE name = 'Utilities' 
    AND category_id = tag_category.id
);

-- Update RLS policies to include system field
-- (The existing policies will continue to work, this is just for future reference)