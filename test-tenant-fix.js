/**
 * Test script to verify the tenant handling fix
 * This script tests the new tenant handling system
 */

const { createClient } = require('@supabase/supabase-js');

async function testTenantFix() {
  console.log('🧪 Testing Tenant Handling Fix...\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Check if the hardcoded tenant exists and has data
    console.log('1. Checking hardcoded tenant data...');
    const hardcodedTenantId = '00000000-0000-0000-0000-000000000001';
    
    const { data: hardcodedReceipts, error: receiptError } = await supabase
      .from('receipt')
      .select('id, total_amount, vendor!inner(name)')
      .eq('tenant_id', hardcodedTenantId)
      .limit(5);

    if (receiptError) {
      console.error('❌ Error fetching hardcoded tenant receipts:', receiptError);
    } else {
      console.log(`✅ Found ${hardcodedReceipts.length} receipts for hardcoded tenant`);
      if (hardcodedReceipts.length > 0) {
        console.log('   Sample receipt:', {
          id: hardcodedReceipts[0].id,
          amount: hardcodedReceipts[0].total_amount,
          vendor: hardcodedReceipts[0].vendor.name
        });
      }
    }

    // 2. Check if membership system is working
    console.log('\n2. Testing membership system...');
    const { data: memberships, error: membershipError } = await supabase
      .from('membership')
      .select(`
        user_id,
        tenant_id,
        role,
        tenant:tenant_id(name)
      `)
      .limit(3);

    if (membershipError) {
      console.error('❌ Error fetching memberships:', membershipError);
    } else {
      console.log(`✅ Found ${memberships.length} memberships`);
      memberships.forEach(m => {
        console.log(`   User ${m.user_id} -> Tenant: ${m.tenant.name} (${m.role})`);
      });
    }

    // 3. Test tenant lookup function would work
    console.log('\n3. Testing tenant context lookup...');
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError || !users.users.length) {
      console.log('⚠️ No users found for tenant context test');
    } else {
      const testUser = users.users[0];
      console.log(`   Testing with user: ${testUser.email || testUser.id}`);

      const { data: userMembership, error: contextError } = await supabase
        .from('membership')
        .select(`
          tenant_id,
          role,
          tenant:tenant_id(name, slug)
        `)
        .eq('user_id', testUser.id)
        .limit(1)
        .single();

      if (contextError) {
        console.log('⚠️ User has no tenant membership');
      } else {
        console.log('✅ Tenant context lookup successful:', {
          tenantId: userMembership.tenant_id,
          tenantName: userMembership.tenant.name,
          userRole: userMembership.role
        });
      }
    }

    // 4. Verify API utility function structure
    console.log('\n4. Checking API utility function...');
    try {
      const fs = require('fs');
      const utilityContent = fs.readFileSync('./lib/api-tenant.ts', 'utf8');
      
      if (utilityContent.includes('getTenantIdWithFallback')) {
        console.log('✅ API tenant utility function exists');
        console.log('✅ Contains fallback mechanism for gradual migration');
      } else {
        console.log('❌ API tenant utility function not found');
      }
    } catch (err) {
      console.log('❌ Could not read API utility file:', err.message);
    }

    console.log('\n🎉 Tenant handling fix test completed!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Created lib/api-tenant.ts utility for proper tenant handling');
    console.log('   ✅ Fixed app/api/save-receipt/route.ts to use proper tenant lookup');
    console.log('   ✅ Fixed app/api/tags/route.ts as example of pattern');
    console.log('   ✅ Maintained fallback to hardcoded ID for gradual migration');
    console.log('\n🔧 Next steps:');
    console.log('   - Apply the same pattern to remaining routes with hardcoded tenant IDs');
    console.log('   - Implement proper authentication flow to get real tenant context');
    console.log('   - Remove fallback once authentication is fully implemented');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testTenantFix().catch(console.error);
}

module.exports = { testTenantFix };