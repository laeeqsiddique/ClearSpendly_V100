-- Fix historical data by setting owner as creator for records with null created_by
-- Run this in your Supabase SQL editor

-- Update receipts
UPDATE receipt 
SET created_by = (
  SELECT user_id FROM membership 
  WHERE tenant_id = receipt.tenant_id AND role = 'owner'
  LIMIT 1
) 
WHERE created_by IS NULL;

-- Update tags  
UPDATE tag
SET created_by = (
  SELECT user_id FROM membership 
  WHERE tenant_id = tag.tenant_id AND role = 'owner'
  LIMIT 1
)
WHERE created_by IS NULL;

-- Update tag categories
UPDATE tag_category
SET created_by = (
  SELECT user_id FROM membership 
  WHERE tenant_id = tag_category.tenant_id AND role = 'owner'
  LIMIT 1
)
WHERE created_by IS NULL;

-- Update vendors if they exist
UPDATE vendor
SET created_by = (
  SELECT user_id FROM membership 
  WHERE tenant_id = vendor.tenant_id AND role = 'owner'
  LIMIT 1
)
WHERE created_by IS NULL AND EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'vendor' AND column_name = 'created_by'
);

-- Check results
SELECT 
  'receipt' as table_name,
  COUNT(*) as total_records,
  COUNT(created_by) as attributed_records,
  ROUND(COUNT(created_by) * 100.0 / COUNT(*), 2) as attribution_percentage
FROM receipt

UNION ALL

SELECT 
  'tag' as table_name,
  COUNT(*) as total_records,
  COUNT(created_by) as attributed_records,
  ROUND(COUNT(created_by) * 100.0 / COUNT(*), 2) as attribution_percentage
FROM tag

UNION ALL

SELECT 
  'tag_category' as table_name,
  COUNT(*) as total_records,
  COUNT(created_by) as attributed_records,
  ROUND(COUNT(created_by) * 100.0 / COUNT(*), 2) as attribution_percentage
FROM tag_category;