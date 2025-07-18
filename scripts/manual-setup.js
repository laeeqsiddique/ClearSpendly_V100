// Simple script to manually create tables using direct table operations
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://chuhbgcwjjldivnwyvia.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodWhiZ2N3ampsZGl2bnd5dmlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUxNjYzNiwiZXhwIjoyMDY4MDkyNjM2fQ.Xv23gtRqBoW1Vwv3FjfiSgtOuYgeOhJnRtXp3PWqRww';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupBasicTables() {
  console.log('Setting up basic tables for testing...');
  
  // Default tenant ID
  const defaultTenantId = '00000000-0000-0000-0000-000000000001';
  
  try {
    // Create tag categories manually
    console.log('Inserting tag categories...');
    const categories = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Expense Type',
        description: 'Type of business expense',
        color: '#ef4444',
        required: false,
        multiple: true,
        sort_order: 1,
        tenant_id: defaultTenantId
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Project',
        description: 'Project or initiative',
        color: '#8b5cf6',
        required: false,
        multiple: false,
        sort_order: 2,
        tenant_id: defaultTenantId
      }
    ];

    for (const category of categories) {
      const { data, error } = await supabase
        .from('tag_category')
        .upsert(category, { onConflict: 'id' });
      
      if (error) {
        console.log('Tag category insert result:', { data, error });
      } else {
        console.log(`✓ Category: ${category.name}`);
      }
    }

    // Create some basic tags
    console.log('Inserting tags...');
    const tags = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Travel',
        category_id: '11111111-1111-1111-1111-111111111111',
        color: '#3b82f6',
        tenant_id: defaultTenantId
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: 'Meals',
        category_id: '11111111-1111-1111-1111-111111111111',
        color: '#10b981',
        tenant_id: defaultTenantId
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        name: 'Equipment',
        category_id: '11111111-1111-1111-1111-111111111111',
        color: '#f59e0b',
        tenant_id: defaultTenantId
      },
      {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        name: 'Q1-2024',
        category_id: '22222222-2222-2222-2222-222222222222',
        color: '#8b5cf6',
        tenant_id: defaultTenantId
      }
    ];

    for (const tag of tags) {
      const { data, error } = await supabase
        .from('tag')
        .upsert(tag, { onConflict: 'id' });
      
      if (error) {
        console.log('Tag insert result:', { data, error });
      } else {
        console.log(`✓ Tag: ${tag.name}`);
      }
    }

    console.log('✅ Basic setup complete!');
    
    // Test the API
    console.log('Testing tag categories API...');
    const { data: testCategories, error: testError } = await supabase
      .from('tag_category')
      .select('*')
      .eq('tenant_id', defaultTenantId);
    
    if (testError) {
      console.log('Test error:', testError);
    } else {
      console.log('Test result:', testCategories);
    }

  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupBasicTables();