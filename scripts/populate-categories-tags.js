#!/usr/bin/env node

// Script to populate the current authenticated system with Schedule C categories and tags
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Schedule C Categories for Freelancers/Contractors
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

// Default tags for each category
const defaultTagsByCategory = {
  "Advertising & Marketing": [
    "Google Ads", "Facebook Ads", "Business Cards", "Website Development", "SEO Tools", "Marketing Materials", "Branding", "Social Media Tools"
  ],
  "Vehicle & Travel": [
    "Gas", "Car Maintenance", "Parking", "Tolls", "Car Insurance", "Hotel", "Airfare", "Uber/Lyft", "Rental Car", "Business Travel"
  ],
  "Business Equipment": [
    "Computer", "Monitor", "Keyboard", "Mouse", "Printer", "Software License", "Camera", "Microphone", "Desk", "Chair"
  ],
  "Office Expenses": [
    "Paper", "Pens", "Envelopes", "Stamps", "Filing Supplies", "Cleaning Supplies", "Coffee", "Office Decor"
  ],
  "Professional Services": [
    "Attorney Fees", "Accountant", "Business Coach", "Consultant", "Graphic Designer", "Copywriter", "Virtual Assistant"
  ],
  "Business Insurance": [
    "General Liability", "Professional Liability", "Equipment Insurance", "Cyber Insurance", "Workers Comp"
  ],
  "Home Office": [
    "Internet", "Phone", "Electricity", "Heating", "Office Supplies", "Home Office Setup", "Internet Upgrade"
  ],
  "Education & Training": [
    "Online Course", "Certification", "Conference", "Workshop", "Books", "Training Materials", "Membership"
  ],
  "Business Meals": [
    "Client Lunch", "Business Dinner", "Networking Event", "Conference Meals", "Team Meeting"
  ],
  "Subscriptions & Software": [
    "Adobe Creative", "Microsoft Office", "Zoom", "Slack", "Canva", "Hosting", "CRM", "Project Management"
  ],
  "Business Licenses & Fees": [
    "Business License", "Professional License", "Permits", "Registration Fees", "Renewal Fees"
  ],
  "Contract Labor": [
    "Freelancer", "Subcontractor", "Virtual Assistant", "Designer", "Developer", "Writer", "Consultant"
  ],
  "Banking & Finance": [
    "Bank Fees", "Credit Card Fees", "Payment Processing", "Wire Transfer", "Loan Interest", "Late Fees"
  ],
  "Utilities & Communications": [
    "Business Phone", "Internet", "Electricity", "Water", "Gas", "Cell Phone", "Landline"
  ],
  "Business Entertainment": [
    "Client Entertainment", "Networking Event", "Business Event", "Holiday Party", "Team Building"
  ]
};

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createCategories() {
  console.log('🏗️  Creating Schedule C Categories for Freelancers/Contractors...\n');
  
  let created = 0;
  let failed = 0;
  const createdCategoryMap = new Map();
  
  for (const category of scheduleCategories) {
    try {
      console.log(`Creating category: ${category.name}...`);
      
      const response = await fetch('http://localhost:3000/api/tags/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(category),
        credentials: 'include'
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Created: ${category.name}`);
        createdCategoryMap.set(category.name, result.data.id);
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
  
  return { created, failed, categoryMap: createdCategoryMap };
}

async function createTags(categoryMap) {
  console.log('\n🏷️  Creating Default Tags...\n');
  
  let totalTagsCreated = 0;
  let totalTagsFailed = 0;
  
  for (const [categoryName, tags] of Object.entries(defaultTagsByCategory)) {
    const categoryId = categoryMap.get(categoryName);
    
    if (!categoryId) {
      console.log(`⚠️  Skipping tags for ${categoryName} - category not found`);
      continue;
    }
    
    console.log(`Creating tags for ${categoryName}...`);
    
    for (const tagName of tags) {
      try {
        const response = await fetch('http://localhost:3000/api/tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: tagName,
            description: `${tagName} expense`,
            categoryId: categoryId,
            color: scheduleCategories.find(c => c.name === categoryName)?.color || '#6366F1'
          })
        });

        const result = await response.json();
        
        if (response.ok) {
          totalTagsCreated++;
        } else {
          console.log(`   ❌ Failed to create tag "${tagName}": ${result.error}`);
          totalTagsFailed++;
        }
      } catch (error) {
        console.log(`   🔥 Error creating tag "${tagName}":`, error.message);
        totalTagsFailed++;
      }
      
      // Very small delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`   ✅ Completed ${categoryName} tags`);
  }
  
  return { totalTagsCreated, totalTagsFailed };
}

async function main() {
  try {
    console.log('🎯 ClearSpendly Schedule C Categories & Tags Populator\n');
    console.log('This will create 15 business expense categories and 120+ related tags');
    console.log('specifically designed for freelancers, contractors, and small businesses.\n');
    
    // Check if server is running
    try {
      const testResponse = await fetch('http://localhost:3000/api/tags/categories');
      if (testResponse.status === 401) {
        console.log('⚠️  You need to be signed in to your ClearSpendly account first!');
        console.log('   1. Go to http://localhost:3000/sign-in');
        console.log('   2. Sign in to your account');
        console.log('   3. Run this script again\n');
        process.exit(1);
      }
    } catch (error) {
      console.log('❌ Cannot connect to ClearSpendly server.');
      console.log('   Make sure the development server is running on http://localhost:3000\n');
      process.exit(1);
    }
    
    const proceed = await askQuestion('Do you want to proceed? (y/N): ');
    
    if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
      console.log('👋 Cancelled. No changes made.');
      process.exit(0);
    }
    
    console.log('\n🚀 Starting population process...\n');
    
    // Step 1: Create Categories
    const categoryResults = await createCategories();
    
    // Step 2: Create Tags
    const tagResults = await createTags(categoryResults.categoryMap);
    
    // Summary
    console.log(`\n📊 Final Summary:`);
    console.log(`   ✅ Categories Created: ${categoryResults.created}/15`);
    console.log(`   ❌ Categories Failed: ${categoryResults.failed}/15`);
    console.log(`   ✅ Tags Created: ${tagResults.totalTagsCreated}`);
    console.log(`   ❌ Tags Failed: ${tagResults.totalTagsFailed}`);
    
    if (categoryResults.created > 0 || tagResults.totalTagsCreated > 0) {
      console.log('\n🎉 Success! Your ClearSpendly system now has comprehensive Schedule C categories and tags!');
      console.log('   Go to http://localhost:3000/dashboard/tags to see them all.');
    } else {
      console.log('\n⚠️  No items were created. Please check for authentication or server issues.');
    }
    
  } catch (error) {
    console.error('🔥 Unexpected error:', error);
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Cancelled by user.');
  rl.close();
  process.exit(0);
});

main();