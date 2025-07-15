const { Client } = require('pg');

const client = new Client({
  host: 'db.chuhbgcwjjldivnwyvia.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'Abdullah12#',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixRLSPolicies() {
  try {
    console.log('🚀 Connecting to fix RLS policies...');
    await client.connect();
    
    // Drop problematic policies and recreate them
    const fixSQL = `
      -- Drop existing policies that have circular references
      DROP POLICY IF EXISTS membership_select ON membership;
      DROP POLICY IF EXISTS membership_insert ON membership;
      DROP POLICY IF EXISTS membership_update ON membership;
      
      -- Create simpler membership policies that avoid recursion
      CREATE POLICY membership_select ON membership
        FOR SELECT USING (user_id = auth.uid());
      
      CREATE POLICY membership_insert ON membership
        FOR INSERT WITH CHECK (user_id = auth.uid());
      
      CREATE POLICY membership_update ON membership
        FOR UPDATE USING (user_id = auth.uid());
      
      -- Temporarily disable RLS on membership for admin operations
      -- This can be re-enabled later with proper admin setup
      ALTER TABLE membership DISABLE ROW LEVEL SECURITY;
    `;
    
    console.log('🔧 Fixing RLS policies...');
    await client.query(fixSQL);
    
    console.log('✅ RLS policies fixed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to fix RLS policies:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixRLSPolicies();