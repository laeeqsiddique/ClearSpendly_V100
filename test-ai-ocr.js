// Test AI-Enhanced OCR Implementation
// Run with: node test-ai-ocr.js

import { SimplifiedOCRProcessor } from './lib/ai-ocr/enhanced-processor.js';
import { OpenAIReceiptParser } from './lib/ai-ocr/openai-parser.js';

async function testOpenAIConnection() {
  console.log('🔍 Testing OpenAI Connection...\n');
  
  try {
    const parser = new OpenAIReceiptParser({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || 'test-key',
      model: process.env.NEXT_PUBLIC_AI_MODEL || 'gpt-4o-mini'
    });
    
    const connected = await parser.testConnection();
    console.log('✅ OpenAI Connection:', connected ? 'SUCCESS' : 'FAILED');
    
  } catch (error) {
    console.error('❌ OpenAI Connection Error:', error.message);
  }
}

async function testReceiptParsing() {
  console.log('\n🧪 Testing Receipt Parsing...\n');
  
  const sampleOCRText = `
THE HOME DEPOT
123 MAIN STREET
ANYTOWN, CA 90210
(555) 123-4567

DATE: 12/15/2023
RECEIPT #: 1234-5678

HAMMER 16OZ              $12.99
SCREWDRIVER SET 6PC      $24.99
WORK GLOVES 2PK          $8.99

SUBTOTAL                 $46.97
TAX @ 8.25%              $3.88
TOTAL                    $50.85

VISA ENDING IN 1234
THANK YOU FOR SHOPPING
  `;
  
  try {
    const parser = new OpenAIReceiptParser({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || 'test-key',
      model: process.env.NEXT_PUBLIC_AI_MODEL || 'gpt-4o-mini'
    });
    
    console.log('📝 Sample OCR Text:');
    console.log('-------------------');
    console.log(sampleOCRText);
    console.log('-------------------\n');
    
    const result = await parser.parseOCRText(sampleOCRText);
    
    console.log('✅ Parsed Result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Parsing Error:', error.message);
  }
}

async function testEnvironmentConfig() {
  console.log('⚙️  Environment Configuration:\n');
  console.log('NEXT_PUBLIC_OPENAI_API_KEY:', process.env.NEXT_PUBLIC_OPENAI_API_KEY ? '✅ Set' : '❌ Not Set');
  console.log('NEXT_PUBLIC_AI_MODEL:', process.env.NEXT_PUBLIC_AI_MODEL || 'Not Set (will use gpt-4o-mini)');
  console.log('NEXT_PUBLIC_ENABLE_AI_ENHANCEMENT:', process.env.NEXT_PUBLIC_ENABLE_AI_ENHANCEMENT || 'Not Set (will default to true)');
  console.log('NEXT_PUBLIC_AI_CONFIDENCE_THRESHOLD:', process.env.NEXT_PUBLIC_AI_CONFIDENCE_THRESHOLD || 'Not Set (will use 90)');
}

async function main() {
  console.log('🚀 AI-Enhanced OCR Test Suite\n');
  console.log('================================\n');
  
  testEnvironmentConfig();
  
  if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    console.log('\n⚠️  Warning: NEXT_PUBLIC_OPENAI_API_KEY not set!');
    console.log('Please set your OpenAI API key in .env.local:');
    console.log('NEXT_PUBLIC_OPENAI_API_KEY=your_api_key_here\n');
    return;
  }
  
  await testOpenAIConnection();
  await testReceiptParsing();
  
  console.log('\n✅ Test Complete!');
}

main().catch(console.error);