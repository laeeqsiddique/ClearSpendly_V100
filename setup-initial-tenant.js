// Setup script to create initial tenant and membership for testing
// This will create the basic data structure needed for team management

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase credentials
const supabaseUrl = 'https://chuhbgcwjjldivnwyvia.supabase.co';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY'; // Get this from Supabase Dashboard > Settings > API

async function setupInitialTenant() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🚀 Setting up initial tenant and membership...\n');

    // Step 1: Get current authenticated users from auth.users
    console.log('1. Checking existing users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return;
    }

    if (authUsers.users.length === 0) {
      console.log('❌ No authenticated users found. Please sign up first at /sign-up');
      return;
    }

    const user = authUsers.users[0]; // Use the first user
    console.log(`✅ Found user: ${user.email} (${user.id})`);

    // Step 2: Check if user exists in user table
    console.log('\n2. Checking user table...');
    let { data: userRecord, error: userError } = await supabase
      .from('user')
      .select('id, email')
      .eq('id', user.id)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create it
      console.log('Creating user record...');
      const { data: newUser, error: createUserError } = await supabase
        .from('user')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0]
        })
        .select()
        .single();

      if (createUserError) {
        console.error('❌ Error creating user:', createUserError.message);
        return;
      }

      userRecord = newUser;
      console.log('✅ User record created');
    } else if (userError) {
      console.error('❌ Error checking user:', userError.message);
      return;
    } else {
      console.log('✅ User record exists');
    }

    // Step 3: Check if tenant exists
    console.log('\n3. Checking tenant...');
    let { data: tenant, error: tenantError } = await supabase
      .from('tenant')
      .select('id, name, slug')
      .limit(1)
      .single();

    if (tenantError && tenantError.code === 'PGRST116') {
      // No tenant exists, create one
      console.log('Creating initial tenant...');
      const { data: newTenant, error: createTenantError } = await supabase
        .from('tenant')
        .insert({
          name: 'My Company',
          slug: 'my-company',
          settings: {}
        })
        .select()
        .single();

      if (createTenantError) {
        console.error('❌ Error creating tenant:', createTenantError.message);
        return;
      }

      tenant = newTenant;
      console.log('✅ Tenant created:', tenant.name);
    } else if (tenantError) {
      console.error('❌ Error checking tenant:', tenantError.message);
      return;
    } else {
      console.log('✅ Tenant exists:', tenant.name);
    }

    // Step 4: Check if membership exists
    console.log('\n4. Checking membership...');
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant.id)
      .single();

    if (membershipError && membershipError.code === 'PGRST116') {
      // No membership exists, create one
      console.log('Creating owner membership...');
      const { data: newMembership, error: createMembershipError } = await supabase
        .from('membership')
        .insert({
          user_id: user.id,
          tenant_id: tenant.id,
          role: 'owner',
          invitation_status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createMembershipError) {
        console.error('❌ Error creating membership:', createMembershipError.message);
        return;
      }

      console.log('✅ Owner membership created');
    } else if (membershipError) {
      console.error('❌ Error checking membership:', membershipError.message);
      return;
    } else {
      console.log('✅ Membership exists with role:', membership.role);
    }

    console.log('\n🎉 Setup complete! You should now be able to access /dashboard/team');
    console.log(`📧 User: ${user.email}`);
    console.log(`🏢 Tenant: ${tenant.name}`);
    console.log(`👑 Role: owner`);

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Instructions for running this script
console.log('📋 Instructions:');
console.log('1. Get your Supabase Service Role Key from Dashboard > Settings > API');
console.log('2. Replace YOUR_SERVICE_ROLE_KEY in this file');
console.log('3. Run: node setup-initial-tenant.js');
console.log('');

// Only run if service key is provided
if (supabaseServiceKey && supabaseServiceKey !== 'YOUR_SERVICE_ROLE_KEY') {
  setupInitialTenant();
} else {
  console.log('⚠️  Please update the service key first!');
}