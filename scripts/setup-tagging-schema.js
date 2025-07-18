// Script to setup tagging schema in Supabase
// Run with: node scripts/setup-tagging-schema.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function setupTaggingSchema() {
  // Read environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read the SQL schema file
  const schemaPath = path.join(__dirname, '..', 'database', 'tagging-schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Setting up tagging schema...');

  try {
    // Split the SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`Error in statement ${i + 1}:`, error);
        // Continue with other statements
      }
    }

    console.log('✅ Tagging schema setup complete!');
    
    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['tag_category', 'tag', 'receipt_tag', 'receipt_item_tag']);

    if (tablesError) {
      console.error('Error checking tables:', tablesError);
    } else {
      console.log('Created tables:', tables.map(t => t.table_name));
    }

  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupTaggingSchema();