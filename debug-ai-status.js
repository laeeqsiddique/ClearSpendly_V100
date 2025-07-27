// Debug AI Status - Run this to check if everything is connected
const testAIConnection = async () => {
  console.log('🔍 Debugging AI OCR Status...\n');
  
  // Test 1: Check if Ollama is running
  console.log('1. Testing Ollama connection...');
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama is running');
      console.log('📋 Available models:', data.models?.map(m => m.name) || 'None');
      
      const hasLlama32 = data.models?.some(m => m.name.includes('llama3.2:3b'));
      if (hasLlama32) {
        console.log('✅ llama3.2:3b is available');
      } else {
        console.log('❌ llama3.2:3b not found. Run: ollama pull llama3.2:3b');
        return false;
      }
    } else {
      console.log('❌ Ollama not responding. Make sure it\'s running: ollama serve');
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot connect to Ollama:', error.message);
    return false;
  }
  
  // Test 2: Test simple prompt
  console.log('\n2. Testing AI response...');
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        prompt: 'Parse this receipt: WALMART 12/25/2023 MILK $3.99 TOTAL $3.99. Return JSON with vendor, date, total.',
        format: 'json',
        stream: false
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ AI responded successfully');
      console.log('🤖 Response:', data.response.substring(0, 200) + '...');
    } else {
      console.log('❌ AI request failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ AI test failed:', error.message);
    return false;
  }
  
  // Test 3: Test Next.js API
  console.log('\n3. Testing Next.js integration...');
  try {
    const response = await fetch('http://localhost:3000/api/test-ai-ocr');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Next.js API responding');
      console.log('🔧 AI Status:', data.aiStatus);
    } else {
      console.log('❌ Next.js API failed. Make sure server is running: npm run dev');
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot connect to Next.js:', error.message);
    console.log('💡 Make sure server is running: npm run dev');
    return false;
  }
  
  console.log('\n✅ All tests passed! AI enhancement should be working.');
  return true;
};

testAIConnection();