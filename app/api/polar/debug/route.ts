import { NextRequest, NextResponse } from 'next/server';

// Debug endpoint to see raw Polar API responses
export async function GET(request: NextRequest) {
  try {
    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    const orgId = process.env.POLAR_ORGANIZATION_ID;
    
    if (!accessToken || !orgId) {
      return NextResponse.json({ error: 'Missing Polar credentials' }, { status: 400 });
    }

    // 1. Get products with all details
    const productsResponse = await fetch(
      `https://api.polar.sh/v1/products?organization_id=${orgId}&is_archived=false&include=prices`, 
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const products = await productsResponse.json();

    // 2. Try to get all prices for the organization
    const allPricesResponse = await fetch(
      `https://api.polar.sh/v1/prices?organization_id=${orgId}&is_archived=false`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let allPrices = null;
    if (allPricesResponse.ok) {
      allPrices = await allPricesResponse.json();
    }

    // 3. Get detailed info for each product including default price
    const productDetails = [];
    for (const product of products.items || []) {
      // Get full product details
      const detailResponse = await fetch(
        `https://api.polar.sh/v1/products/${product.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const detail = await detailResponse.json();
      
      // Check if product has prices in different ways
      const productPrices = {
        product_name: product.name,
        product_id: product.id,
        default_price: detail.default_price || product.default_price,
        prices: detail.prices || product.prices || [],
        price_ids: detail.price_ids || product.price_ids || [],
        raw_product: product,
        raw_detail: detail
      };
      
      productDetails.push(productPrices);
    }

    return NextResponse.json({
      message: 'Raw Polar API responses for debugging',
      products_response: products,
      all_prices_response: allPrices,
      product_details: productDetails,
      help: {
        note: 'Check the raw responses to see how Polar returns price data',
        what_to_look_for: [
          'default_price field on products',
          'prices array on products',
          'price_ids array on products',
          'items array in all_prices_response'
        ]
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Debug failed'
    }, { status: 500 });
  }
}