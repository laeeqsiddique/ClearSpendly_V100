-- Migration: Remove category field from receipt_item table (replaced with tags)
-- This migration removes the category column since we're now using the tagging system

-- First, let's check if there are any existing receipt_items with categories
-- (Optional query to run before migration to see what data exists)
-- SELECT category, COUNT(*) FROM receipt_item GROUP BY category;

-- Remove the category column from receipt_item table
-- Note: This will remove any existing category data
ALTER TABLE receipt_item DROP COLUMN IF EXISTS category;

-- The tagging system now handles categorization through:
-- - receipt_item_tag table for line item tags
-- - Expense Type tags specifically for what used to be categories