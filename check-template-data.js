// Quick script to check template data in your database
// Run this to see what template_type and tax settings you currently have

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTemplates() {
  try {
    console.log('🔍 Checking invoice templates...\n');
    
    const { data: templates, error } = await supabase
      .from('invoice_template')
      .select(`
        id,
        name,
        template_type,
        show_tax,
        tax_rate,
        tax_label,
        is_default,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return;
    }

    if (!templates || templates.length === 0) {
      console.log('❌ No templates found in database');
      return;
    }

    console.log(`📊 Found ${templates.length} templates:\n`);
    
    templates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.name}`);
      console.log(`   Template Type: ${template.template_type}`);
      console.log(`   Show Tax: ${template.show_tax}`);
      console.log(`   Tax Rate: ${(template.tax_rate * 100).toFixed(2)}%`);
      console.log(`   Tax Label: ${template.tax_label}`);
      console.log(`   Is Default: ${template.is_default}`);
      console.log(`   Created: ${new Date(template.created_at).toLocaleDateString()}`);
      console.log('');
    });

    // Summary
    const typeCounts = templates.reduce((acc, t) => {
      acc[t.template_type] = (acc[t.template_type] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Template Type Summary:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} templates`);
    });

    const taxEnabledCount = templates.filter(t => t.show_tax).length;
    console.log(`\n💰 Tax Summary:`);
    console.log(`   Templates with tax enabled: ${taxEnabledCount}`);
    console.log(`   Templates with tax disabled: ${templates.length - taxEnabledCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTemplates();