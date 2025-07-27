// Advanced receipt parsing test
const testComplexReceipt = async () => {
  const mesyOCRText = `
WAL*MART SUPERCENTER
Store #1234 (123) 456-7890

12/25/2O23  15:32 PM  

MILK GAL 2%        3 99 T
BREAD WW           2 5O
BANANAS           1.29 
2% MILK           3.99 T
TAX                O.52

SUBTOTAL          11.27
TAX                O.52
TOTAL             11.79

VISA ENDING 1234  11.79
  `;

  try {
    const start = Date.now();
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        prompt: `You are an expert receipt parser. Extract data from this OCR text that may have errors.

Common OCR errors to fix:
- 'O' vs '0' (letter O vs zero)
- Missing decimal points
- Spaces in numbers

OCR Text:
${mesyOCRText}

Extract and return ONLY valid JSON:
{
  "vendor": "string",
  "date": "YYYY-MM-DD",
  "lineItems": [
    {
      "description": "string", 
      "price": number,
      "taxable": boolean
    }
  ],
  "subtotal": number,
  "tax": number,
  "total": number,
  "confidence": number
}`,
        format: 'json',
        stream: false
      })
    });

    const data = await response.json();
    const processingTime = Date.now() - start;
    
    console.log('🧾 Complex Receipt Test Results:');
    console.log('✅ Parsed Data:', JSON.stringify(JSON.parse(data.response), null, 2));
    console.log(`⏱️ Processing Time: ${processingTime}ms`);
    
    // Test accuracy
    const parsed = JSON.parse(data.response);
    console.log('\n📊 Accuracy Check:');
    console.log(`Vendor: ${parsed.vendor === 'WAL*MART SUPERCENTER' ? '✅' : '❌'} (${parsed.vendor})`);
    console.log(`Date: ${parsed.date === '2023-12-25' ? '✅' : '❌'} (${parsed.date})`);
    console.log(`Total: ${parsed.total === 11.79 ? '✅' : '❌'} (${parsed.total})`);
    console.log(`Items: ${parsed.lineItems?.length >= 3 ? '✅' : '❌'} (${parsed.lineItems?.length} items)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testComplexReceipt();