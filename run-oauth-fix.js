require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing')
console.log('Service Key:', supabaseServiceKey ? 'Found' : 'Missing')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixOAuthFunction() {
  console.log('Fixing OAuth user creation function...')
  
  // Check current table structure first
  console.log('Checking table structure...')
  const { data: tables, error: tableError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['user', 'users'])

  if (tableError) {
    console.log('Could not check tables:', tableError.message)
  } else {
    console.log('Available user tables:', tables?.map(t => t.table_name))
  }

  // Instead of using rpc, let's create a manual fix by testing the user creation
  console.log('Since we cannot directly execute SQL, please manually run this SQL in your Supabase SQL Editor:')
  console.log('\n--- COPY THIS SQL TO SUPABASE SQL EDITOR ---')
  console.log(`
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into the correct table name: "user" (singular, quoted)
  INSERT INTO public."user" (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, "user".full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, "user".avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE LOG 'Failed to create user record for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `)
  console.log('--- END SQL ---\n')
  
  // Test if we can read from the user table
  const { data: userTest, error: userError } = await supabase
    .from('user')
    .select('count')
    .limit(1)
    
  if (userError) {
    console.error('❌ Cannot access "user" table:', userError.message)
    console.log('This confirms the table name issue. Please run the SQL above.')
  } else {
    console.log('✅ "user" table is accessible')
  }
}

fixOAuthFunction()