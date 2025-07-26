// Browser Console Script to Populate Schedule C Categories & Tags
// Copy and paste this entire script into your browser console at http://localhost:3000/dashboard/tags

(async function populateCategoriesAndTags() {
  console.log('🎯 Starting Schedule C Categories & Tags Population...');
  
  // Schedule C Categories
  const scheduleCategories = [
    {
      name: "Advertising & Marketing",
      description: "Business advertising, marketing campaigns, promotional materials, and branding expenses",
      color: "#EF4444",
      required: false,
      multiple: true
    },
    {
      name: "Vehicle & Travel",
      description: "Business vehicle expenses, fuel, maintenance, travel, meals, and lodging for business purposes",
      color: "#3B82F6",
      required: false,
      multiple: true
    },
    {
      name: "Business Equipment",
      description: "Computers, software, tools, machinery, and other equipment used for business operations",
      color: "#10B981",
      required: false,
      multiple: true
    },
    {
      name: "Office Expenses",
      description: "Office supplies, postage, printing, stationery, and general administrative costs",
      color: "#F59E0B",
      required: false,
      multiple: true
    },
    {
      name: "Professional Services",
      description: "Legal fees, accounting, consulting, professional development, and expert services",
      color: "#8B5CF6",
      required: false,
      multiple: true
    },
    {
      name: "Business Insurance",
      description: "Professional liability, general business insurance, and other business-related insurance costs",
      color: "#06B6D4",
      required: false,
      multiple: true
    },
    {
      name: "Home Office",
      description: "Home office expenses, utilities, internet, phone, and workspace-related costs",
      color: "#84CC16",
      required: false,
      multiple: true
    },
    {
      name: "Education & Training",
      description: "Professional courses, certifications, books, training materials, and skill development",
      color: "#F97316",
      required: false,
      multiple: true
    },
    {
      name: "Business Meals",
      description: "Client meals, business lunches, networking events, and other business dining expenses",
      color: "#EC4899",
      required: false,
      multiple: true
    },
    {
      name: "Subscriptions & Software",
      description: "Business software subscriptions, SaaS tools, online services, and digital memberships",
      color: "#6366F1",
      required: false,
      multiple: true
    },
    {
      name: "Business Licenses & Fees",
      description: "Business licenses, permits, registration fees, and regulatory compliance costs",
      color: "#14B8A6",
      required: false,
      multiple: true
    },
    {
      name: "Contract Labor",
      description: "Subcontractor payments, freelancer fees, and other contract labor expenses",
      color: "#A855F7",
      required: false,
      multiple: true
    },
    {
      name: "Banking & Finance",
      description: "Bank fees, credit card processing fees, loan interest, and other financial service charges",
      color: "#DC2626",
      required: false,
      multiple: true
    },
    {
      name: "Utilities & Communications",
      description: "Business phone, internet, electricity, and other utility expenses directly for business use",
      color: "#059669",
      required: false,
      multiple: true
    },
    {
      name: "Business Entertainment",
      description: "Client entertainment, business events, networking activities, and corporate hospitality",
      color: "#7C3AED",
      required: false,
      multiple: true
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

  // Helper function to delay execution
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Step 1: Create Categories
  console.log('📂 Creating Categories...');
  const createdCategories = new Map();
  let categoriesCreated = 0;
  let categoriesFailed = 0;

  for (const category of scheduleCategories) {
    try {
      console.log(`Creating: ${category.name}...`);
      
      const response = await fetch('/api/tags/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(category)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${category.name}`);
        createdCategories.set(category.name, result.data.id);
        categoriesCreated++;
      } else {
        console.log(`❌ ${category.name}: ${result.error}`);
        categoriesFailed++;
      }
    } catch (error) {
      console.log(`🔥 ${category.name}: ${error.message}`);
      categoriesFailed++;
    }
    
    await delay(200); // Small delay between requests
  }

  console.log(`\n📊 Categories Summary: ${categoriesCreated} created, ${categoriesFailed} failed`);

  // Step 2: Create Tags
  if (createdCategories.size > 0) {
    console.log('\n🏷️  Creating Tags...');
    let tagsCreated = 0;
    let tagsFailed = 0;

    for (const [categoryName, tags] of Object.entries(defaultTagsByCategory)) {
      const categoryId = createdCategories.get(categoryName);
      
      if (!categoryId) {
        console.log(`⚠️  Skipping tags for ${categoryName} - category not created`);
        continue;
      }

      console.log(`Creating tags for ${categoryName}...`);
      
      for (const tagName of tags) {
        try {
          const response = await fetch('/api/tags', {
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
            tagsCreated++;
          } else {
            console.log(`   ❌ ${tagName}: ${result.error}`);
            tagsFailed++;
          }
        } catch (error) {
          console.log(`   🔥 ${tagName}: ${error.message}`);
          tagsFailed++;
        }
        
        await delay(100); // Small delay between tag requests
      }
      
      console.log(`   ✅ Completed ${categoryName}`);
    }

    console.log(`\n📊 Tags Summary: ${tagsCreated} created, ${tagsFailed} failed`);
  }

  // Final Summary
  console.log('\n🎉 FINAL SUMMARY:');
  console.log(`   📂 Categories: ${categoriesCreated}/15 created`);
  console.log(`   🏷️  Tags: ${tagsCreated} created`);
  console.log('\n✨ Your Schedule C system is ready!');
  console.log('💡 Refresh the page to see all your new categories and tags.');
  
  // Auto-refresh the page after completion
  setTimeout(() => {
    console.log('🔄 Refreshing page...');
    window.location.reload();
  }, 2000);
})();