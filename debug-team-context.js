// Debug script to check user context and team setup
// Run this with: node debug-team-context.js

const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase URL and key
const supabaseUrl = 'https://chuhbgcwjjldivnwyvia.supabase.co';
const supabaseKey = 'YOUR_SERVICE_ROLE_KEY'; // Use service role key for admin access

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTeamContext() {
  try {
    console.log('🔍 Debugging Team Context...\n');

    // Check if user and membership tables exist and have data
    console.log('1. Checking user table:');
    const { data: users, error: usersError } = await supabase
      .from('user')
      .select('id, email, full_name')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
    } else {
      console.log(`✅ Found ${users.length} users:`, users);
    }

    console.log('\n2. Checking membership table:');
    const { data: memberships, error: membershipsError } = await supabase
      .from('membership')
      .select(`
        id,
        role,
        invitation_status,
        user:user_id (
          email,
          full_name
        ),
        tenant:tenant_id (
          name,
          slug
        )
      `)
      .limit(5);
    
    if (membershipsError) {
      console.error('❌ Error fetching memberships:', membershipsError.message);
    } else {
      console.log(`✅ Found ${memberships.length} memberships:`, memberships);
    }

    console.log('\n3. Checking tenant table:');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenant')
      .select('id, name, slug')
      .limit(5);
    
    if (tenantsError) {
      console.error('❌ Error fetching tenants:', tenantsError.message);
    } else {
      console.log(`✅ Found ${tenants.length} tenants:`, tenants);
    }

    console.log('\n🎯 Recommendations:');
    
    if (users && users.length === 0) {
      console.log('- No users found. You may need to sign up first.');
    }
    
    if (tenants && tenants.length === 0) {
      console.log('- No tenants found. You may need to create a tenant.');
    }
    
    if (memberships && memberships.length === 0) {
      console.log('- No memberships found. You may need to create a membership linking your user to a tenant.');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  debugTeamContext();
}

module.exports = { debugTeamContext };