import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Sync Polar products with correct price structure
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting Polar sync with correct price structure...');

    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    const orgId = process.env.POLAR_ORGANIZATION_ID;
    
    if (!accessToken || !orgId) {
      return NextResponse.json({
        success: false,
        error: 'Polar configuration missing'
      }, { status: 400 });
    }

    // Fetch products with prices included
    const productsResponse = await fetch(
      `https://api.polar.sh/v1/products?organization_id=${orgId}&is_archived=false`, 
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!productsResponse.ok) {
      throw new Error(`Failed to fetch products: ${productsResponse.status}`);
    }

    const productsData = await productsResponse.json();
    const supabase = createAdminClient();
    const updates = [];

    // Map Polar products to database plans
    const productMapping = {
      'free': '78c45caf-e3ab-4008-b934-31c21e16149d', // Flowvya - Free
      'pro': 'eca2a717-dc2a-4088-b3aa-f9b20b193b0a', // Flowvya - Pro  
      'business': '2f6aea98-d80a-422c-b3f8-5ab4d3c29842', // Flowvya - Multiuser (maps to business)
    };

    // Process each database plan
    for (const [planSlug, polarProductId] of Object.entries(productMapping)) {
      const polarProduct = productsData.items.find(p => p.id === polarProductId);
      
      if (polarProduct) {
        console.log(`✅ Syncing ${planSlug} with Polar product: ${polarProduct.name}`);
        
        // Get the monthly price from the prices array
        const monthlyPrice = polarProduct.prices?.find(p => p.recurring_interval === 'month');
        
        const updateData: any = {
          polar_product_id: polarProduct.id,
          updated_at: new Date().toISOString()
        };

        if (monthlyPrice) {
          updateData.polar_price_monthly_id = monthlyPrice.id;
          // Convert from cents to dollars (price_amount is in cents)
          if (monthlyPrice.amount_type === 'fixed') {
            updateData.price_monthly = monthlyPrice.price_amount / 100;
          } else if (monthlyPrice.amount_type === 'free') {
            updateData.price_monthly = 0;
          }
        }

        // For business plan, also update features to reflect multiuser
        if (planSlug === 'business') {
          updateData.name = 'Business (Multi-User)';
          updateData.description = 'Everything in Pro plus support for up to 5 team members';
          updateData.features = {
            "ocr_processing": "enhanced",
            "email_templates": true,
            "analytics": "advanced",
            "multi_user": true,
            "api_access": true,
            "priority_support": true,
            "custom_branding": false,
            "team_collaboration": true
          };
          updateData.limits = {
            "receipts_per_month": 500,
            "invoices_per_month": 100,
            "storage_mb": 5000,
            "users_max": 5
          };
        }

        // Update the database
        const { error } = await supabase
          .from('subscription_plan')
          .update(updateData)
          .eq('slug', planSlug);

        if (error) {
          console.error(`Failed to update ${planSlug}:`, error);
          updates.push({
            plan: planSlug,
            success: false,
            error: error.message
          });
        } else {
          updates.push({
            plan: planSlug,
            success: true,
            polar_product_id: polarProduct.id,
            polar_product_name: polarProduct.name,
            price_id: monthlyPrice?.id,
            price_amount: monthlyPrice?.amount_type === 'fixed' ? 
              `$${(monthlyPrice.price_amount / 100).toFixed(2)}/month` :
              'Free'
          });
        }
      }
    }

    // Get updated plans from database
    const { data: updatedPlans } = await supabase
      .from('subscription_plan')
      .select('*')
      .order('sort_order');

    // Create a comprehensive summary
    const summary = {
      synced_products: updates.filter(u => u.success).map(u => ({
        plan: u.plan,
        polar_name: u.polar_product_name,
        price: u.price_amount
      })),
      database_status: updatedPlans?.map(p => ({
        name: p.name,
        slug: p.slug,
        has_polar_id: !!p.polar_product_id,
        price: `$${p.price_monthly}/month`,
        synced: !!p.polar_price_monthly_id
      })),
      ready_for_checkout: updates.filter(u => u.success).length >= 3
    };

    return NextResponse.json({
      success: true,
      message: '✅ Polar sync completed successfully!',
      updates,
      summary,
      next_steps: [
        summary.ready_for_checkout ? '✅ Ready for checkout!' : '⚠️ Not all plans synced',
        '1. Test checkout at http://localhost:3000/onboarding',
        '2. Select a plan and click "Start Trial" or "Upgrade"',
        '3. Monitor webhooks at http://localhost:3000/api/webhooks/polar'
      ]
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed'
    }, { status: 500 });
  }
}