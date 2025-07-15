// Quick test script to verify Supabase connection
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testConnection() {
  console.log('🔍 Testing Supabase connection...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables!')
    console.log('Make sure you have set:')
    console.log('- NEXT_PUBLIC_SUPABASE_URL')
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test basic connection
    const { data, error } = await supabase.from('tenant').select('count', { count: 'exact' })
    
    if (error) {
      console.error('❌ Database error:', error.message)
      if (error.message.includes('relation "tenant" does not exist')) {
        console.log('💡 This means the database connection works, but migrations haven\'t been run yet!')
      }
    } else {
      console.log('✅ Database connection successful!')
      console.log('📊 Tenant table count:', data)
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
  }
}

testConnection()