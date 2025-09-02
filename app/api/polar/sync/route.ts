import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Sync Polar product IDs to database
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting Polar sync...');

    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    const orgId = process.env.POLAR_ORGANIZATION_ID;
    
    if (!accessToken || !orgId) {
      return NextResponse.json({
        success: false,
        error: 'Polar configuration missing'
      }, { status: 400 });
    }

    // Fetch products from Polar
    const productsResponse = await fetch(`https://api.polar.sh/v1/products?organization_id=${orgId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!productsResponse.ok) {
      throw new Error(`Failed to fetch products: ${productsResponse.status}`);
    }

    const productsData = await productsResponse.json();
    const supabase = createAdminClient();
    const updates = [];

    // Process each Polar product
    for (const product of productsData.items || []) {
      console.log(`Processing: ${product.name}`);
      
      // Fetch prices for this product
      const pricesResponse = await fetch(`https://api.polar.sh/v1/products/${product.id}/prices`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      let prices = [];
      if (pricesResponse.ok) {
        const pricesData = await pricesResponse.json();
        prices = pricesData.items || [];
      }

      const monthlyPrice = prices.find(p => p.recurring_interval === 'month');
      const yearlyPrice = prices.find(p => p.recurring_interval === 'year');

      // Map Polar products to database plans
      let dbSlug = null;
      if (product.name.toLowerCase().includes('free')) {
        dbSlug = 'free';
      } else if (product.name.toLowerCase().includes('pro') && !product.name.toLowerCase().includes('enter')) {
        dbSlug = 'pro';
      } else if (product.name.toLowerCase().includes('multi') || product.name.toLowerCase().includes('business')) {
        dbSlug = 'business';
      } else if (product.name.toLowerCase().includes('enterprise')) {
        dbSlug = 'enterprise';
      }

      if (dbSlug) {
        // Update the database plan with Polar IDs
        const updateData: any = {
          polar_product_id: product.id,
          updated_at: new Date().toISOString()
        };

        if (monthlyPrice) {
          updateData.polar_price_monthly_id = monthlyPrice.id;
          updateData.price_monthly = monthlyPrice.price_amount / 100; // Convert from cents
        }

        if (yearlyPrice) {
          updateData.polar_price_yearly_id = yearlyPrice.id;
          updateData.price_yearly = yearlyPrice.price_amount / 100; // Convert from cents
        }

        const { error } = await supabase
          .from('subscription_plan')
          .update(updateData)
          .eq('slug', dbSlug);

        if (error) {
          console.error(`Failed to update ${dbSlug}:`, error);
          updates.push({
            plan: dbSlug,
            success: false,
            error: error.message
          });
        } else {
          console.log(`✅ Updated ${dbSlug} with Polar IDs`);
          updates.push({
            plan: dbSlug,
            success: true,
            polar_product_id: product.id,
            monthly_price_id: monthlyPrice?.id,
            yearly_price_id: yearlyPrice?.id,
            monthly_amount: monthlyPrice ? monthlyPrice.price_amount / 100 : null,
            yearly_amount: yearlyPrice ? yearlyPrice.price_amount / 100 : null
          });
        }
      } else {
        // Handle new product (like multiuser)
        if (product.name.toLowerCase().includes('multiuser')) {
          // Update the business plan to support multiuser
          const { error } = await supabase
            .from('subscription_plan')
            .update({
              features: {
                "ocr_processing": "enhanced",
                "email_templates": true,
                "analytics": "advanced",
                "multi_user": true,
                "api_access": true,
                "priority_support": true,
                "custom_branding": false
              },
              limits: {
                "receipts_per_month": 500,
                "invoices_per_month": 100,
                "storage_mb": 5000,
                "users_max": 5
              }
            })
            .eq('slug', 'business');

          if (!error) {
            console.log('✅ Updated business plan for multiuser support');
          }
        }
      }
    }

    // Get updated plans from database
    const { data: updatedPlans } = await supabase
      .from('subscription_plan')
      .select('name, slug, polar_product_id, polar_price_monthly_id, polar_price_yearly_id, price_monthly, price_yearly')
      .order('sort_order');

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      updates,
      current_plans: updatedPlans,
      next_steps: [
        monthlyPrice || yearlyPrice ? null : '⚠️ Add prices to your Polar products first!',
        'Test the checkout flow at /onboarding',
        'Monitor webhooks at /api/webhooks/polar'
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed'
    }, { status: 500 });
  }
}

// GET endpoint to check current sync status
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    const { data: plans, error } = await supabase
      .from('subscription_plan')
      .select('*')
      .order('sort_order');

    if (error) throw error;

    const syncedPlans = plans?.filter(p => p.polar_product_id) || [];
    const unsyncedPlans = plans?.filter(p => !p.polar_product_id) || [];

    return NextResponse.json({
      success: true,
      total_plans: plans?.length || 0,
      synced_count: syncedPlans.length,
      unsynced_count: unsyncedPlans.length,
      synced_plans: syncedPlans.map(p => ({
        name: p.name,
        slug: p.slug,
        polar_product_id: p.polar_product_id,
        has_monthly_price: !!p.polar_price_monthly_id,
        has_yearly_price: !!p.polar_price_yearly_id,
        monthly_amount: p.price_monthly,
        yearly_amount: p.price_yearly
      })),
      unsynced_plans: unsyncedPlans.map(p => p.name),
      ready_for_production: syncedPlans.length > 0 && syncedPlans.some(p => p.polar_price_monthly_id || p.polar_price_yearly_id)
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check sync status'
    }, { status: 500 });
  }
}