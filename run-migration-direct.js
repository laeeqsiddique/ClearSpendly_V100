const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection using individual parameters
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

async function runMigration() {
  try {
    console.log('🚀 Connecting to PostgreSQL database...');
    await client.connect();
    
    // First, check if tables already exist
    const checkQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'tenant';
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Tables already exist! Migration already completed.');
      return;
    }
    
    console.log('📋 Tables not found. Running migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250714000001_create_core_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔧 Executing migration SQL...');
    
    // Execute the entire migration in a single transaction
    await client.query('BEGIN');
    
    try {
      await client.query(migrationSQL);
      await client.query('COMMIT');
      console.log('✅ Migration completed successfully!');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
    // Verify the migration worked
    const verifyQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tenant', 'user', 'membership', 'vendor', 'receipt', 'receipt_item')
      ORDER BY table_name;
    `;
    
    const verifyResult = await client.query(verifyQuery);
    
    console.log('📊 Created tables:');
    verifyResult.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });
    
    if (verifyResult.rows.length === 6) {
      console.log('🎉 All tables created successfully!');
    } else {
      console.log('⚠️  Some tables may be missing. Check the migration.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();