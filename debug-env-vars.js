// Debug Environment Variables
console.log('🔍 Debugging Environment Variables...\n');

// Check if we're in the right directory
console.log('📁 Current Directory:', process.cwd());

// Check if .env.local exists
const fs = require('fs');
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  console.log('✅ .env.local file exists');
  
  // Read the file content
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check for AI-related variables
  const aiVars = [
    'ENABLE_AI_OCR_ENHANCEMENT',
    'LLM_PROVIDER', 
    'LLM_MODEL',
    'LLM_API_URL'
  ];
  
  console.log('\n📋 AI Variables in .env.local:');
  aiVars.forEach(varName => {
    if (envContent.includes(varName)) {
      const line = envContent.split('\n').find(line => line.startsWith(varName));
      console.log(`✅ ${line}`);
    } else {
      console.log(`❌ ${varName} not found`);
    }
  });
} else {
  console.log('❌ .env.local file not found');
}

// Test loading environment variables
console.log('\n🔧 Testing Environment Variable Loading:');

// Method 1: Direct access
console.log('Direct process.env check:');
console.log('- ENABLE_AI_OCR_ENHANCEMENT:', process.env.ENABLE_AI_OCR_ENHANCEMENT || 'undefined');
console.log('- LLM_PROVIDER:', process.env.LLM_PROVIDER || 'undefined');
console.log('- LLM_MODEL:', process.env.LLM_MODEL || 'undefined');
console.log('- LLM_API_URL:', process.env.LLM_API_URL || 'undefined');

// Method 2: Try loading with dotenv
try {
  require('dotenv').config({ path: '.env.local' });
  console.log('\n✅ Loaded .env.local with dotenv');
  console.log('After dotenv loading:');
  console.log('- ENABLE_AI_OCR_ENHANCEMENT:', process.env.ENABLE_AI_OCR_ENHANCEMENT || 'undefined');
  console.log('- LLM_PROVIDER:', process.env.LLM_PROVIDER || 'undefined');
} catch (error) {
  console.log('❌ Failed to load with dotenv:', error.message);
}

console.log('\n💡 Next.js loads environment variables automatically in development');
console.log('💡 Make sure to restart your dev server after changing .env.local');