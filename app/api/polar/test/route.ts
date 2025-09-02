import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Test Polar API connection and sync products
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing Polar API connection...');

    // Check environment variables
    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    const orgId = process.env.POLAR_ORGANIZATION_ID;
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'POLAR_ACCESS_TOKEN not configured',
        step: 'env_check'
      });
    }

    if (!orgId) {
      return NextResponse.json({
        success: false,
        error: 'POLAR_ORGANIZATION_ID not configured', 
        step: 'env_check'
      });
    }

    console.log(`✅ Environment variables configured`);

    // Test API connection by fetching organization
    const orgResponse = await fetch(`https://api.polar.sh/v1/organizations/${orgId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!orgResponse.ok) {
      const errorText = await orgResponse.text();
      return NextResponse.json({
        success: false,
        error: `Polar API error: ${orgResponse.status} - ${errorText}`,
        step: 'api_connection'
      });
    }

    const orgData = await orgResponse.json();
    console.log(`✅ Connected to Polar organization: ${orgData.name}`);

    // Fetch products from Polar
    const productsResponse = await fetch(`https://api.polar.sh/v1/products?organization_id=${orgId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!productsResponse.ok) {
      const errorText = await productsResponse.text();
      return NextResponse.json({
        success: false,
        error: `Failed to fetch products: ${productsResponse.status} - ${errorText}`,
        step: 'products_fetch'
      });
    }

    const productsData = await productsResponse.json();
    console.log(`✅ Found ${productsData.items?.length || 0} products in Polar`);

    // Get current database plans
    const supabase = createAdminClient();
    const { data: dbPlans, error: dbError } = await supabase
      .from('subscription_plan')
      .select('id, name, slug, polar_product_id, polar_price_monthly_id, polar_price_yearly_id')
      .order('sort_order');

    if (dbError) {
      return NextResponse.json({
        success: false,
        error: `Database error: ${dbError.message}`,
        step: 'database_fetch'
      });
    }

    console.log(`✅ Found ${dbPlans?.length || 0} plans in database`);

    // Try to match products and get prices
    const syncResults = [];
    
    for (const product of productsData.items || []) {
      console.log(`🔍 Processing Polar product: ${product.name} (${product.id})`);
      
      // Fetch prices for this product - using the correct endpoint
      const pricesUrl = `https://api.polar.sh/v1/products/${product.id}/prices?is_archived=false`;
      console.log(`Fetching prices from: ${pricesUrl}`);
      
      const pricesResponse = await fetch(pricesUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      let prices = [];
      if (pricesResponse.ok) {
        const pricesData = await pricesResponse.json();
        prices = pricesData.items || [];
        console.log(`Found ${prices.length} prices for ${product.name}`);
      } else {
        console.log(`Failed to fetch prices: ${pricesResponse.status}`);
        // Try alternative endpoint
        const altResponse = await fetch(`https://api.polar.sh/v1/prices?product_id=${product.id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (altResponse.ok) {
          const altData = await altResponse.json();
          prices = altData.items || [];
          console.log(`Alternative endpoint found ${prices.length} prices`);
        }
      }

      const monthlyPrice = prices.find(p => p.recurring_interval === 'month');
      const yearlyPrice = prices.find(p => p.recurring_interval === 'year');

      syncResults.push({
        product_id: product.id,
        product_name: product.name,
        monthly_price: monthlyPrice ? {
          id: monthlyPrice.id,
          amount: monthlyPrice.price_amount / 100, // Convert from cents
          currency: monthlyPrice.price_currency
        } : null,
        yearly_price: yearlyPrice ? {
          id: yearlyPrice.id, 
          amount: yearlyPrice.price_amount / 100, // Convert from cents
          currency: yearlyPrice.price_currency
        } : null,
        suggested_slug: product.name.toLowerCase()
          .replace(/clearspendly\s*/i, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, ''),
        db_match: dbPlans?.find(p => 
          p.name.toLowerCase().includes(product.name.toLowerCase().replace(/clearspendly\s*/i, '')) ||
          product.name.toLowerCase().includes(p.name.toLowerCase())
        )
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Polar API connection successful!',
      data: {
        organization: {
          id: orgData.id,
          name: orgData.name,
          slug: orgData.slug
        },
        polar_products: syncResults,
        database_plans: dbPlans,
        sync_suggestions: syncResults.map(result => ({
          polar_product: result.product_name,
          suggested_action: result.db_match ? 
            `Update "${result.db_match.name}" with Polar IDs` : 
            `Create new plan for "${result.product_name}"`,
          polar_product_id: result.product_id,
          monthly_price_id: result.monthly_price?.id,
          yearly_price_id: result.yearly_price?.id
        }))
      }
    });

  } catch (error) {
    console.error('❌ Polar test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'unexpected_error'
    }, { status: 500 });
  }
}