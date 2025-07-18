// Script to create tags using the existing category IDs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://chuhbgcwjjldivnwyvia.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodWhiZ2N3ampsZGl2bnd5dmlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUxNjYzNiwiZXhwIjoyMDY4MDkyNjM2fQ.Xv23gtRqBoW1Vwv3FjfiSgtOuYgeOhJnRtXp3PWqRww';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTags() {
  console.log('Creating tags with correct category IDs...');
  
  const defaultTenantId = '00000000-0000-0000-0000-000000000001';
  
  try {
    // Get existing categories
    const { data: categories } = await supabase
      .from('tag_category')
      .select('*')
      .eq('tenant_id', defaultTenantId);
    
    console.log('Found categories:', categories.map(c => ({ id: c.id, name: c.name })));
    
    const expenseTypeCategory = categories.find(c => c.name === 'Expense Type');
    const projectCategory = categories.find(c => c.name === 'Project');
    
    if (!expenseTypeCategory) {
      console.error('Expense Type category not found');
      return;
    }
    
    // Create tags
    const tags = [
      {
        name: 'Travel',
        category_id: expenseTypeCategory.id,
        color: '#3b82f6',
        tenant_id: defaultTenantId
      },
      {
        name: 'Meals',
        category_id: expenseTypeCategory.id,
        color: '#10b981',
        tenant_id: defaultTenantId
      },
      {
        name: 'Equipment',
        category_id: expenseTypeCategory.id,
        color: '#f59e0b',
        tenant_id: defaultTenantId
      },
      {
        name: 'Software',
        category_id: expenseTypeCategory.id,
        color: '#8b5cf6',
        tenant_id: defaultTenantId
      }
    ];

    if (projectCategory) {
      tags.push({
        name: 'Q1-2024',
        category_id: projectCategory.id,
        color: '#8b5cf6',
        tenant_id: defaultTenantId
      });
    }

    for (const tag of tags) {
      const { data, error } = await supabase
        .from('tag')
        .insert(tag)
        .select();
      
      if (error) {
        if (error.code === '23505') {
          console.log(`Tag "${tag.name}" already exists`);
        } else {
          console.log('Tag insert error:', error);
        }
      } else {
        console.log(`✓ Created tag: ${tag.name}`);
      }
    }

    console.log('✅ Tag creation complete!');
    
    // Test fetching tags for Expense Type
    console.log('Testing tag fetch...');
    const { data: testTags, error: testError } = await supabase
      .from('tag')
      .select(`
        id,
        name,
        color,
        category:tag_category!inner(
          id,
          name
        )
      `)
      .eq('category_id', expenseTypeCategory.id)
      .eq('tenant_id', defaultTenantId);
    
    if (testError) {
      console.log('Test error:', testError);
    } else {
      console.log('Test tags:', testTags);
    }

  } catch (error) {
    console.error('Creation failed:', error);
  }
}

createTags();