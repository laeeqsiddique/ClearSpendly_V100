// Test Ollama directly with the same data that timed out
const testOllamaTimeout = async () => {
  console.log('🔍 Testing Ollama with same receipt data that timed out...\n');
  
  const testText = `RST Re
2025-07-26

SUBTOTAL $30.50
TAX $1.31
TOTAL $31.81`;

  const prompt = `Parse this receipt data into JSON. Fix OCR errors like O/0, l/1/I, missing decimals.

Return ONLY this JSON format:
{
  "vendor": "cleaned business name",
  "date": "YYYY-MM-DD", 
  "totalAmount": number,
  "subtotal": number,
  "tax": number,
  "currency": "USD",
  "lineItems": [
    {
      "description": "item name",
      "quantity": 1,
      "unitPrice": number,
      "totalPrice": number,
      "taxable": true
    }
  ],
  "confidence": 85,
  "parsingNotes": "any issues"
}

Be concise and accurate.

Receipt data:
${testText}`;

  try {
    console.log('⏱️ Starting request...');
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        prompt,
        temperature: 0.1,
        max_tokens: 1500,
        format: 'json',
        stream: false
      })
    });
    
    const processingTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Response received in ${processingTime}ms`);
      console.log('🤖 AI Response:', data.response);
      
      // Test JSON parsing
      try {
        const parsed = JSON.parse(data.response);
        console.log('✅ Valid JSON received');
        console.log('🏪 Vendor:', parsed.vendor);
        console.log('💰 Total:', parsed.totalAmount);
      } catch (jsonError) {
        console.log('❌ Invalid JSON:', jsonError.message);
      }
    } else {
      console.log('❌ HTTP Error:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
    
    if (error.name === 'AbortError') {
      console.log('💡 This suggests a timeout issue');
    }
  }
};

testOllamaTimeout();