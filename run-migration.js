const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Testing database connection...');
    
    // Test the connection by trying to query the tenant table
    const { data, error: queryError } = await supabase
      .from('tenant')
      .select('*')
      .limit(1);
    
    if (queryError) {
      console.log('📋 Tables not yet created - running migration...');
      
      // Read the migration file
      const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250714000001_create_core_tables.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      console.log(`🔧 Running ${statements.length} SQL statements...`);
      
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.trim()) {
          try {
            console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
            const { error } = await supabase.rpc('exec_sql', { sql: stmt });
            
            if (error) {
              console.error(`❌ Error in statement ${i + 1}:`, error.message);
              console.error('Statement:', stmt.substring(0, 100) + '...');
              // Continue with other statements
            } else {
              console.log(`✅ Statement ${i + 1} completed`);
            }
          } catch (err) {
            console.error(`❌ Unexpected error in statement ${i + 1}:`, err.message);
          }
        }
      }
      
      // Test again
      const { data: testData, error: testError } = await supabase
        .from('tenant')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.error('❌ Migration may have failed - tenant table not accessible');
      } else {
        console.log('✅ Migration completed successfully!');
        console.log('📊 Tenant table is now accessible');
      }
      
    } else {
      console.log('✅ Database tables already exist!');
      console.log('📊 Tenant table is accessible');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

runMigration();