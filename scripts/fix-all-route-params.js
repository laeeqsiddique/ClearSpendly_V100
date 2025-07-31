#!/usr/bin/env node

/**
 * Fix all Next.js 15 route parameter issues in one go
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 Fixing ALL Next.js 15 route parameter issues...\n');

// Get all files with the old pattern
const files = execSync('grep -r "{ params }: { params:" app/api/ --include="*.ts" -l', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`Found ${files.length} files to fix:`);
files.forEach(file => console.log(`  - ${file}`));
console.log();

let totalFixed = 0;

files.forEach(filePath => {
  try {
    console.log(`📝 Fixing ${filePath}...`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    
    // Fix all function signatures with the old pattern
    const functionPattern = /export async function (GET|POST|PUT|DELETE|PATCH)\(([^,]+),\s*{\s*params\s*}:\s*{\s*params:\s*([^}]+)\s*}\s*\)/g;
    
    newContent = newContent.replace(functionPattern, (match, method, firstParam, paramType) => {
      return `export async function ${method}(${firstParam}, context: { params: Promise<{ ${paramType} }> }) {
  const params = await context.params;`;
    });
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Fixed ${filePath}`);
      totalFixed++;
    } else {
      console.log(`⚠️  No changes needed for ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

console.log(`\n🎉 Fixed ${totalFixed} out of ${files.length} files!`);

if (totalFixed > 0) {
  console.log('\n📋 Testing build now...');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('\n✅ Build successful! All route parameter issues are fixed.');
  } catch (error) {
    console.log('\n❌ Build still has issues. Manual review may be needed.');
  }
} else {
  console.log('✅ No files needed fixing!');
}