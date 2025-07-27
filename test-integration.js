// Integration test for AI-enhanced OCR
const fs = require('fs');
const path = require('path');

const testAIStatus = async () => {
  try {
    console.log('🔍 Testing AI OCR Status...');
    
    const response = await fetch('http://localhost:3000/api/test-ai-ocr', {
      method: 'GET'
    });
    
    const data = await response.json();
    console.log('📊 AI Status:', JSON.stringify(data, null, 2));
    
    return data.aiEnabled;
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    return false;
  }
};

const testWithSampleImage = async () => {
  console.log('🧾 Testing with sample receipt...');
  
  // Create a simple test image data (1x1 pixel for testing)
  const testImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
  
  try {
    const response = await fetch('http://localhost:3000/api/test-ai-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: testImageData,
        testMode: 'process'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Integration test successful!');
      console.log(`⏱️ Processing time: ${data.processingTime}ms`);
      console.log(`🎯 Confidence: ${data.metadata.confidence}%`);
      console.log(`📝 Items found: ${data.metadata.lineItemCount}`);
      console.log(`🤖 AI enabled: ${data.aiStatus.enabled}`);
    } else {
      console.log('❌ Integration test failed:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    return null;
  }
};

const runTests = async () => {
  console.log('🚀 Starting AI OCR Integration Tests\n');
  
  // Test 1: Check AI status
  const aiEnabled = await testAIStatus();
  console.log('');
  
  if (!aiEnabled) {
    console.log('⚠️ AI not enabled. Make sure:');
    console.log('1. Ollama is running: ollama serve');
    console.log('2. Model is downloaded: ollama pull llama3.2:3b');
    console.log('3. Environment variables are set');
    console.log('4. Next.js server is running: npm run dev');
    return;
  }
  
  // Test 2: Process sample image
  await testWithSampleImage();
  
  console.log('\n✨ Integration tests completed!');
  console.log('\n📚 Next steps:');
  console.log('1. Test with real receipt images');
  console.log('2. Compare accuracy vs current system');
  console.log('3. Monitor performance metrics');
};

runTests();