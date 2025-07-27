// Direct test of OpenAI Vision API with receipt image
// Run with: node test-vision-api.js

const https = require('https');
const fs = require('fs');

const API_KEY = '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';

// You can replace this with a base64 encoded image or provide an image file path
const TEST_IMAGE_BASE64 = "data:image/jpeg;base64,"; // Add your receipt image here

async function testVisionAPI() {
  console.log('🔍 Testing OpenAI Vision API...\n');

  // Enhanced prompt for better item detection
  const prompt = `You are a receipt parsing AI. Extract ALL information from this receipt image and return ONLY a valid JSON object.

Look very carefully for ALL items, even if text is blurry or split across lines. Common patterns:
- Items often have product codes, descriptions, and prices
- Prices typically end in .99, .98, .96, .95, .94, etc.
- Look for quantity indicators like "2x" or "@ $X.XX"
- Walmart receipts often have items with codes like "078742204370"

Return this exact JSON structure:
{
  "vendor": "string - business name",
  "date": "YYYY-MM-DD - receipt date",
  "totalAmount": number,
  "subtotal": number,
  "tax": number,
  "currency": "USD",
  "lineItems": [
    {
      "description": "string - item name",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number,
      "category": "string - best guess category"
    }
  ],
  "category": "string - overall expense category",
  "confidence": number - 0-100 confidence score
}

IMPORTANT: Find ALL items, even if text is garbled. Look for price patterns and work backwards to find item descriptions.`;

  const data = JSON.stringify({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: TEST_IMAGE_BASE64,
              detail: 'high'
            }
          }
        ]
      }
    ],
    max_tokens: 1000,
    temperature: 0.1
  });

  const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          
          if (res.statusCode === 200) {
            console.log('✅ OpenAI Vision API Successful!\n');
            const content = result.choices[0].message.content;
            
            // Try to parse as JSON
            try {
              const parsedReceipt = JSON.parse(content);
              console.log('📄 Parsed Receipt:');
              console.log(JSON.stringify(parsedReceipt, null, 2));
              console.log('\n📊 Items found:', parsedReceipt.lineItems?.length || 0);
              console.log('💰 Total amount:', parsedReceipt.totalAmount);
            } catch (parseError) {
              console.log('📄 Raw response (not JSON):');
              console.log(content);
            }
            
            console.log('\n📊 Token Usage:', result.usage);
            console.log('💰 Estimated Cost:', '$' + (result.usage.total_tokens * 0.00003).toFixed(4));
          } else {
            console.error('❌ OpenAI API Error:', result.error || result);
          }
          resolve();
        } catch (error) {
          console.error('❌ Error parsing response:', error.message);
          console.log('Raw response:', responseData);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 Direct OpenAI Vision API Test\n');
  console.log('================================\n');
  
  if (!TEST_IMAGE_BASE64 || TEST_IMAGE_BASE64 === "data:image/jpeg;base64,") {
    console.log('⚠️  Please add a base64 encoded receipt image to TEST_IMAGE_BASE64');
    console.log('You can convert an image to base64 at: https://base64.guru/converter/encode/image');
    return;
  }
  
  try {
    await testVisionAPI();
    console.log('\n✅ Test Complete!');
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
  }
}

main();