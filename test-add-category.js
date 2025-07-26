// Quick test to check if the Add Category API endpoint works
const fetch = require('node-fetch');

async function testAddCategory() {
  try {
    console.log('🧪 Testing Add Category API endpoint...');
    
    const response = await fetch('http://localhost:3000/api/tags/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Category ' + Date.now(),
        description: 'A test category created via API',
        color: '#6366f1',
        required: false,
        multiple: true
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Category created successfully:', result);
    } else {
      console.log('❌ Failed to create category:', result);
    }
    
    // Also test fetching categories to see if it was added
    const fetchResponse = await fetch('http://localhost:3000/api/tags/categories');
    const categories = await fetchResponse.json();
    
    console.log(`📊 Total categories now: ${categories.data?.length || 0}`);
    
  } catch (error) {
    console.error('🔥 Error testing API:', error.message);
  }
}

testAddCategory();