// Debug script to check and create tag categories
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function debugTags() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // TODO: Replace with dynamic tenant ID when running script for specific tenant
  const defaultTenantId = '00000000-0000-0000-0000-000000000001';

  console.log('🔍 Checking tag categories...');
  
  // Check if tag_category table exists and has data
  const { data: categories, error: categoriesError } = await supabase
    .from('tag_category')
    .select('*')
    .eq('tenant_id', defaultTenantId);

  if (categoriesError) {
    console.error('❌ Error fetching categories:', categoriesError);
    return;
  }

  console.log(`📊 Found ${categories.length} tag categories:`, categories);

  // Check if Expense Type category exists
  const expenseTypeCategory = categories.find(cat => cat.name === 'Expense Type');
  
  if (!expenseTypeCategory) {
    console.log('🔧 Creating "Expense Type" category...');
    
    const { data: newCategory, error: createError } = await supabase
      .from('tag_category')
      .insert({
        name: 'Expense Type',
        description: 'Categories for different types of expenses',
        color: '#10b981',
        required: false,
        multiple: false,
        sort_order: 1,
        tenant_id: defaultTenantId
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating category:', createError);
      return;
    }
    
    console.log('✅ Created category:', newCategory);
    
    // Create some default expense type tags
    const defaultTags = [
      'Office Supplies',
      'Travel & Transportation', 
      'Meals & Entertainment',
      'Equipment & Software',
      'Professional Services'
    ];
    
    console.log('🏷️ Creating default expense type tags...');
    
    for (const tagName of defaultTags) {
      const { data: tag, error: tagError } = await supabase
        .from('tag')
        .insert({
          name: tagName,
          category_id: newCategory.id,
          color: '#10b981',
          tenant_id: defaultTenantId
        })
        .select()
        .single();
        
      if (tagError) {
        console.error(`❌ Error creating tag "${tagName}":`, tagError);
      } else {
        console.log(`✅ Created tag: ${tagName}`);
      }
    }
  } else {
    console.log('✅ "Expense Type" category exists:', expenseTypeCategory);
    
    // Check tags for this category
    const { data: tags, error: tagsError } = await supabase
      .from('tag')
      .select('*')
      .eq('category_id', expenseTypeCategory.id);
      
    if (tagsError) {
      console.error('❌ Error fetching tags:', tagsError);
    } else {
      console.log(`📋 Found ${tags.length} expense type tags:`, tags.map(t => t.name));
    }
  }

  console.log('🏁 Debug complete!');
}

debugTags().catch(console.error);