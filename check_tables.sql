-- Check what tables exist in your database
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check specifically for user-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%user%' 
OR table_name LIKE '%member%' 
OR table_name LIKE '%tenant%'
ORDER BY table_name;