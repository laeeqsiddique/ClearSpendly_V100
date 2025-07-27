// Quick Ollama test script
// Run with: node test-ollama.js

const testOllama = async () => {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        prompt: `Parse this receipt text into JSON format:

TARGET
12/25/2023
MILK               $3.99
BREAD              $2.50
SUBTOTAL           $6.49
TAX                $0.52
TOTAL              $7.01

Extract: vendor, date, lineItems, subtotal, tax, total`,
        format: 'json',
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Ollama Response:', JSON.stringify(data.response, null, 2));
    
    // Test timing
    console.log(`⏱️ Processing time: ${data.total_duration / 1000000}ms`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Make sure Ollama is running and llama3.2:3b is installed');
  }
};

testOllama();