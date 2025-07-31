#!/usr/bin/env node

/**
 * Fix Next.js 15 route parameters async issue
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Next.js 15 route parameter issues...\n');

function fixRouteFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let newContent = content;

  // Pattern 1: Fix interface definition for route params
  const oldInterface = /interface\s+RouteParams\s*{\s*params:\s*{\s*([^}]+)\s*};\s*}/g;
  if (oldInterface.test(content)) {
    console.log(`📝 Fixing route params interface in: ${filePath}`);
    newContent = newContent.replace(
      /interface\s+RouteParams\s*{\s*params:\s*{\s*([^}]+)\s*};\s*}/g,
      'interface RouteParams {\n  params: Promise<{ $1 }>;\n}'
    );
    modified = true;
  }

  // Pattern 2: Fix function signatures
  const functionPatterns = [
    {
      from: /export async function (GET|POST|PUT|DELETE|PATCH)\(([^,]+),\s*{\s*params\s*}:\s*RouteParams\)\s*{/g,
      to: 'export async function $1($2, context: RouteParams) {\n  const params = await context.params;'
    }
  ];

  functionPatterns.forEach(pattern => {
    if (pattern.from.test(content)) {
      console.log(`🔄 Fixing function signature in: ${filePath}`);
      newContent = newContent.replace(pattern.from, pattern.to);
      modified = true;
    }
  });

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
    
    if (file.isDirectory() && !file.name.startsWith('.')) {
      totalFixed += processDirectory(fullPath);
    } else if (file.name === 'route.ts') {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Only process files that have RouteParams interface
      if (content.includes('RouteParams') && content.includes('{ params')) {
        if (fixRouteFile(fullPath)) {
          totalFixed++;
        }
      }
    }
  }
  
  return totalFixed;
}

// Process API routes directory
const totalFixed = processDirectory('./app/api');

console.log(`\n🎉 Fixed ${totalFixed} route files!`);

if (totalFixed > 0) {
  console.log('\n📋 Next steps:');
  console.log('1. Test the build: npm run build');
  console.log('2. Commit the fixes');
} else {
  console.log('✅ No route parameter issues found!');
}