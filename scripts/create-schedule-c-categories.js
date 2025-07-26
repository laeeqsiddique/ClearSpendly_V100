const fetch = require('node-fetch');

// Schedule C Categories for Freelancers/Contractors based on IRS Form Schedule C
const scheduleCategories = [
  {
    name: "Advertising & Marketing",
    description: "Business advertising, marketing campaigns, promotional materials, and branding expenses",
    color: "#EF4444", // Red
    required: false,
    multiple: true,
    sort_order: 1
  },
  {
    name: "Vehicle & Travel",
    description: "Business vehicle expenses, fuel, maintenance, travel, meals, and lodging for business purposes",
    color: "#3B82F6", // Blue
    required: false,
    multiple: true,
    sort_order: 2
  },
  {
    name: "Business Equipment",
    description: "Computers, software, tools, machinery, and other equipment used for business operations",
    color: "#10B981", // Green
    required: false,
    multiple: true,
    sort_order: 3
  },
  {
    name: "Office Expenses",
    description: "Office supplies, postage, printing, stationery, and general administrative costs",
    color: "#F59E0B", // Yellow
    required: false,
    multiple: true,
    sort_order: 4
  },
  {
    name: "Professional Services",
    description: "Legal fees, accounting, consulting, professional development, and expert services",
    color: "#8B5CF6", // Purple
    required: false,
    multiple: true,
    sort_order: 5
  },
  {
    name: "Business Insurance",
    description: "Professional liability, general business insurance, and other business-related insurance costs",
    color: "#06B6D4", // Cyan
    required: false,
    multiple: true,
    sort_order: 6
  },
  {
    name: "Home Office",
    description: "Home office expenses, utilities, internet, phone, and workspace-related costs",
    color: "#84CC16", // Lime
    required: false,
    multiple: true,
    sort_order: 7
  },
  {
    name: "Education & Training",
    description: "Professional courses, certifications, books, training materials, and skill development",
    color: "#F97316", // Orange
    required: false,
    multiple: true,
    sort_order: 8
  },
  {
    name: "Business Meals",
    description: "Client meals, business lunches, networking events, and other business dining expenses",
    color: "#EC4899", // Pink
    required: false,
    multiple: true,
    sort_order: 9
  },
  {
    name: "Subscriptions & Software",
    description: "Business software subscriptions, SaaS tools, online services, and digital memberships",
    color: "#6366F1", // Indigo
    required: false,
    multiple: true,
    sort_order: 10
  },
  {
    name: "Business Licenses & Fees",
    description: "Business licenses, permits, registration fees, and regulatory compliance costs",
    color: "#14B8A6", // Teal
    required: false,
    multiple: true,
    sort_order: 11
  },
  {
    name: "Contract Labor",
    description: "Subcontractor payments, freelancer fees, and other contract labor expenses",
    color: "#A855F7", // Violet
    required: false,
    multiple: true,
    sort_order: 12
  },
  {
    name: "Banking & Finance",
    description: "Bank fees, credit card processing fees, loan interest, and other financial service charges",
    color: "#DC2626", // Red-600
    required: false,
    multiple: true,
    sort_order: 13
  },
  {
    name: "Utilities & Communications",
    description: "Business phone, internet, electricity, and other utility expenses directly for business use",
    color: "#059669", // Green-600
    required: false,
    multiple: true,
    sort_order: 14
  },
  {
    name: "Business Entertainment",
    description: "Client entertainment, business events, networking activities, and corporate hospitality",
    color: "#7C3AED", // Purple-600
    required: false,
    multiple: true,
    sort_order: 15
  }
];

async function createCategories() {
  console.log('🏗️  Creating Schedule C Categories for Freelancers/Contractors...\n');
  
  let created = 0;
  let failed = 0;
  
  for (const category of scheduleCategories) {
    try {
      const response = await fetch('http://localhost:3000/api/tags/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(category)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Created: ${category.name}`);
        created++;
      } else {
        console.log(`❌ Failed: ${category.name} - ${result.error}`);
        failed++;
      }
    } catch (error) {
      console.log(`🔥 Error creating ${category.name}:`, error.message);
      failed++;
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Created: ${created} categories`);
  console.log(`   ❌ Failed: ${failed} categories`);
  console.log(`   📝 Total: ${scheduleCategories.length} categories attempted`);
  
  if (created > 0) {
    console.log('\n🎉 Schedule C categories are now ready for freelancers and contractors!');
    console.log('   These categories align with IRS Schedule C requirements and cover:');
    console.log('   • All major business expense types');
    console.log('   • Freelancer/contractor specific needs'); 
    console.log('   • Professional service businesses');
    console.log('   • Home-based and remote work scenarios');
  }
}

createCategories().catch(console.error);