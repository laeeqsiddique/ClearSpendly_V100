#!/usr/bin/env node

/**
 * Automatically fix unsafe deployment patterns
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing unsafe deployment patterns...\n');

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let newContent = content;

  // Pattern 1: Fix process.env.VAR! to safe pattern
  const envPattern = /process\.env\.([A-Z_]+)!/g;
  if (envPattern.test(content)) {
    console.log(`📝 Fixing environment variable assertions in: ${filePath}`);
    
    newContent = content.replace(
      /createClient\(\s*process\.env\.([A-Z_]+)!,\s*process\.env\.([A-Z_]+)!\s*\)/g,
      (match, var1, var2) => {
        return `createClient(
      process.env.${var1} || '',
      process.env.${var2} || ''
    )`;
      }
    );
    
    // Fix standalone env var assertions
    newContent = newContent.replace(
      /process\.env\.([A-Z_]+)!/g,
      'process.env.$1 || \'\''
    );
    
    modified = true;
  }

  // Pattern 2: Add environment variable validation for API routes
  if (filePath.includes('/api/') && content.includes('createClient')) {
    const needsValidation = !content.includes('if (!') && !content.includes('supabaseUrl');
    
    if (needsValidation) {
      console.log(`🛡️  Adding environment variable validation to: ${filePath}`);
      
      // Add validation before createClient calls
      newContent = newContent.replace(
        /(createClient\(\s*process\.env\.[A-Z_]+[^)]+\))/,
        `// Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }
    
    $1`
      );
      
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }
  
  return false;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let totalFixed = 0;
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      totalFixed += processDirectory(fullPath);
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      if (fixFile(fullPath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

// Process key directories
const directories = ['./app/api', './lib', './middleware.ts'];
let totalFixed = 0;

directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    if (dir.endsWith('.ts')) {
      // Single file
      if (fixFile(dir)) {
        totalFixed++;
      }
    } else {
      // Directory
      totalFixed += processDirectory(dir);
    }
  }
});

console.log(`\n🎉 Fixed ${totalFixed} files with unsafe patterns!`);

if (totalFixed > 0) {
  console.log('\n📋 Next steps:');
  console.log('1. Review the changes made');
  console.log('2. Test the application locally');
  console.log('3. Run npm run validate-deployment');
  console.log('4. Commit the fixes');
} else {
  console.log('✅ No unsafe patterns found!');
}