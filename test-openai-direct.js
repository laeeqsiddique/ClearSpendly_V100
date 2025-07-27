// Direct test of OpenAI API connection
// Run with: node test-openai-direct.js

const https = require('https');

const API_KEY = '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';

async function testOpenAI() {
  console.log('🔍 Testing OpenAI Connection...\n');

  const data = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a receipt parser. Return only valid JSON.'
      },
      {
        role: 'user',
        content: `Parse receipt OCR to JSON:
THE HOME DEPOT
123 MAIN ST
DATE: 2024-01-15

HAMMER 16OZ $12.99
SCREWS 100PK $5.99

SUBTOTAL $18.98
TAX $1.52
TOTAL $20.50

Format: {"vendor":"","date":"YYYY-MM-DD","total":0,"subtotal":0,"tax":0,"items":[{"desc":"","price":0}]}`
      }
    ],
    temperature: 0.1,
    max_tokens: 400,
    response_format: { type: 'json_object' }
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
            console.log('✅ OpenAI Connection Successful!\n');
            const content = result.choices[0].message.content;
            const parsedReceipt = JSON.parse(content);
            console.log('📄 Parsed Receipt:');
            console.log(JSON.stringify(parsedReceipt, null, 2));
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
  console.log('🚀 Direct OpenAI API Test\n');
  console.log('================================\n');
  
  try {
    await testOpenAI();
    console.log('\n✅ Test Complete!');
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
  }
}

main();