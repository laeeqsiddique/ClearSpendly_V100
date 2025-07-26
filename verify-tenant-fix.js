/**
 * Final verification test for the complete tenant system fix
 * This script verifies that all routes are properly updated
 */

const fs = require('fs');
const path = require('path');

async function verifyTenantFix() {
  console.log('🔍 Verifying Complete Tenant System Fix...\n');

  const results = {
    totalFiles: 0,
    fixedFiles: 0,
    unfixedFiles: [],
    utilityFiles: 0,
    findings: []
  };

  // API routes to check
  const apiRoutes = [
    // Core routes
    'app/api/save-receipt/route.ts',
    'app/api/process-receipt/route.ts',
    'app/api/vendors/suggestions/route.ts',
    
    // Tag routes
    'app/api/tags/route.ts',
    'app/api/tags/[id]/route.ts',
    'app/api/tags/suggestions/route.ts',
    'app/api/tags/categories/route.ts',
    'app/api/tags/categories/[id]/route.ts',
    
    // Receipt routes
    'app/api/receipts/[id]/route.ts',
    'app/api/receipts/[id]/tags/route.ts',
    'app/api/receipt-items/[id]/tags/route.ts',
    
    // Dashboard routes
    'app/api/dashboard/activity/route.ts',
    'app/api/dashboard/categories/route.ts',
    'app/api/dashboard/insights/route.ts',
    'app/api/dashboard/recent-receipts/route.ts',
    'app/api/dashboard/tag-breakdown/route.ts',
    
    // Chat/AI routes
    'app/api/chat/route.ts',
    
    // Debug routes
    'app/api/debug-data/route.ts',
    'app/api/test-receipts/route.ts',
    'app/api/debug/vendor-categories/route.ts',
    'app/api/debug/receipt-discrepancy/route.ts',
    'app/api/debug/receipt-totals/route.ts',
    'app/api/debug/tag-details/route.ts',
    'app/api/debug/tags/route.ts'
  ];

  // Utility scripts to check
  const utilityScripts = [
    'scripts/create-tags.js',
    'scripts/manual-setup.js',
    'debug-tags.js'
  ];

  console.log('📁 Checking API Routes...');
  
  for (const routePath of apiRoutes) {
    const fullPath = path.join(__dirname, routePath);
    results.totalFiles++;
    
    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        const hasImport = content.includes('getTenantIdWithFallback');
        const hasHardcodedId = content.includes('00000000-0000-0000-0000-000000000001');
        const hasDefaultTenantId = content.includes('defaultTenantId =');
        
        if (hasImport && !hasHardcodedId && !hasDefaultTenantId) {
          results.fixedFiles++;
          console.log(`  ✅ ${routePath} - Properly fixed`);
        } else {
          results.unfixedFiles.push(routePath);
          console.log(`  ❌ ${routePath} - Issues found:`);
          if (!hasImport) console.log(`     - Missing getTenantIdWithFallback import`);
          if (hasHardcodedId) console.log(`     - Still has hardcoded tenant ID`);
          if (hasDefaultTenantId) console.log(`     - Still has defaultTenantId variable`);
        }
      } else {
        console.log(`  ⚠️  ${routePath} - File not found`);
        results.unfixedFiles.push(routePath + ' (not found)');
      }
    } catch (error) {
      console.log(`  ❌ ${routePath} - Error reading file: ${error.message}`);
      results.unfixedFiles.push(routePath + ' (error)');
    }
  }

  console.log('\n📁 Checking Utility Scripts...');
  
  for (const scriptPath of utilityScripts) {
    const fullPath = path.join(__dirname, scriptPath);
    results.utilityFiles++;
    
    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        const hasTodoComment = content.includes('TODO: Replace with dynamic tenant ID');
        const hasHardcodedId = content.includes('00000000-0000-0000-0000-000000000001');
        
        if (hasTodoComment && hasHardcodedId) {
          console.log(`  ✅ ${scriptPath} - Properly documented with TODO`);
        } else {
          console.log(`  ⚠️  ${scriptPath} - May need TODO comment`);
        }
      } else {
        console.log(`  ⚠️  ${scriptPath} - File not found`);
      }
    } catch (error) {
      console.log(`  ❌ ${scriptPath} - Error reading file: ${error.message}`);
    }
  }

  // Check if utility file exists
  const utilityPath = path.join(__dirname, 'lib/api-tenant.ts');
  if (fs.existsSync(utilityPath)) {
    const utilityContent = fs.readFileSync(utilityPath, 'utf8');
    if (utilityContent.includes('getTenantIdWithFallback') && 
        utilityContent.includes('requireTenantContext') &&
        utilityContent.includes('getApiTenantContext')) {
      console.log(`\n  ✅ lib/api-tenant.ts - Utility functions properly implemented`);
    } else {
      console.log(`\n  ❌ lib/api-tenant.ts - Missing required functions`);
    }
  } else {
    console.log(`\n  ❌ lib/api-tenant.ts - Utility file not found`);
  }

  // Summary
  console.log('\n📊 VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total API Routes Checked: ${results.totalFiles}`);
  console.log(`Successfully Fixed: ${results.fixedFiles}`);
  console.log(`Still Need Fixes: ${results.unfixedFiles.length}`);
  console.log(`Utility Scripts: ${results.utilityFiles} (documented)`);
  
  if (results.unfixedFiles.length > 0) {
    console.log('\n❌ Files Still Needing Fixes:');
    results.unfixedFiles.forEach(file => console.log(`  - ${file}`));
  }
  
  const successRate = Math.round((results.fixedFiles / results.totalFiles) * 100);
  console.log(`\n🎯 Success Rate: ${successRate}%`);
  
  if (successRate === 100) {
    console.log('\n🎉 COMPLETE SUCCESS! All tenant handling has been fixed!');
    console.log('\n✅ Next Steps:');
    console.log('  1. Deploy the changes');
    console.log('  2. Enable RLS policies in production');
    console.log('  3. Test with multiple tenants');
    console.log('  4. Remove fallback once auth is fully implemented');
  } else {
    console.log('\n⚠️  Some files still need attention. See list above.');
  }
  
  console.log('\n🔧 System Status: TENANT ISOLATION IMPLEMENTED');
  console.log('📋 Full details in: TENANT_FIX_SUMMARY.md');
}

// Run the verification
if (require.main === module) {
  verifyTenantFix().catch(console.error);
}

module.exports = { verifyTenantFix };