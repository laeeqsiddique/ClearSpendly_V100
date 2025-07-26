import { createClient } from '@/lib/supabase/server'

// Default Schedule C Categories for Freelancers/Contractors
export const DEFAULT_CATEGORIES = [
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
export const DEFAULT_TAGS_BY_CATEGORY = {
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

/**
 * Create default categories and tags for a new tenant
 */
export async function createDefaultCategoriesAndTags(tenantId: string): Promise<boolean> {
  const supabase = await createClient()

  try {
    // Create categories first
    const categoriesWithTenantId = DEFAULT_CATEGORIES.map(category => ({
      ...category,
      tenant_id: tenantId
    }));

    const { data: createdCategories, error: categoriesError } = await supabase
      .from('tag_category')
      .insert(categoriesWithTenantId)
      .select('id, name');

    if (categoriesError) {
      console.error('Error creating default categories:', categoriesError);
      return false;
    }

    // Create a map of category name to ID for tag creation
    const categoryNameToId = new Map(
      createdCategories.map(cat => [cat.name, cat.id])
    );

    // Create default tags for each category
    const allTags = [];
    for (const [categoryName, tags] of Object.entries(DEFAULT_TAGS_BY_CATEGORY)) {
      const categoryId = categoryNameToId.get(categoryName);
      if (categoryId) {
        const categoryTags = tags.map((tagName) => ({
          name: tagName,
          description: `${tagName} expense`,
          color: DEFAULT_CATEGORIES.find(c => c.name === categoryName)?.color || '#6366F1',
          category_id: categoryId,
          tenant_id: tenantId
        }));
        allTags.push(...categoryTags);
      }
    }

    // Insert tags in batches to avoid database limits
    const batchSize = 50;
    for (let i = 0; i < allTags.length; i += batchSize) {
      const batch = allTags.slice(i, i + batchSize);
      const { error: tagsError } = await supabase
        .from('tag')
        .insert(batch);

      if (tagsError) {
        console.error(`Error creating tags batch ${i/batchSize + 1}:`, tagsError);
        return false;
      }
    }

    console.log(`✅ Created ${createdCategories.length} categories and ${allTags.length} tags for tenant ${tenantId}`);
    return true;

  } catch (error) {
    console.error('Error creating default categories and tags:', error);
    return false;
  }
}