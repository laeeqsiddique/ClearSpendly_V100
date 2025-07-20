-- Check if IRS mileage rate table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'irs_mileage_rate';

-- Check existing data
SELECT * FROM public.irs_mileage_rate ORDER BY year DESC;