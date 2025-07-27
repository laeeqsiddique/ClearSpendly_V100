// Test Server AI Integration
const testServerAI = async () => {
  console.log('🧪 Testing Server AI Integration...\n');
  
  try {
    console.log('1. Testing AI status endpoint...');
    const statusResponse = await fetch('http://localhost:3000/api/test-ai-ocr');
    
    if (statusResponse.ok) {
      const data = await statusResponse.json();
      console.log('✅ API responded successfully');
      console.log('📊 Status:', JSON.stringify(data, null, 2));
      
      if (data.aiEnabled) {
        console.log('\n2. Testing AI parsing with sample text...');
        
        const parseResponse = await fetch('http://localhost:3000/api/test-ai-ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}) // Will use sample text
        });
        
        if (parseResponse.ok) {
          const parseData = await parseResponse.json();
          console.log('✅ AI parsing test successful!');
          console.log(`⏱️ Processing time: ${parseData.processingTime}ms`);
          console.log('🤖 Parsed data:', JSON.stringify(parseData.data, null, 2));
        } else {
          console.log('❌ AI parsing test failed:', parseResponse.status);
          const errorText = await parseResponse.text();
          console.log('Error:', errorText);
        }
      } else {
        console.log('⚠️ AI is not enabled');
        console.log('Environment variables:', data.environment);
      }
    } else {
      console.log('❌ API request failed:', statusResponse.status);
      const errorText = await statusResponse.text();
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testServerAI();