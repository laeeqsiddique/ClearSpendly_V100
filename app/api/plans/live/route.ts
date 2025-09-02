import { NextRequest, NextResponse } from 'next/server';

// Fetch plans directly from Polar API - single source of truth
export async function GET(request: NextRequest) {
  try {
    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    const orgId = process.env.POLAR_ORGANIZATION_ID;
    
    if (!accessToken || !orgId) {
      // Return default plans if Polar not configured
      return NextResponse.json({
        success: true,
        source: 'default',
        plans: [
          {
            id: 'free',
            polarProductId: 'free',
            name: 'Free',
            description: 'Perfect for getting started',
            monthlyPrice: 0,
            yearlyPrice: 0,
            features: [
              { name: '3 receipts per month', included: true },
              { name: 'Basic OCR processing', included: true },
              { name: 'Dashboard analytics', included: true },
              { name: 'Excel/CSV export', included: true },
              { name: 'Email support', included: true }
            ],
            popular: false,
            badge: null
          },
          {
            id: 'pro',
            polarProductId: 'pro',
            name: 'Pro',
            description: 'Everything you need to run your business',
            monthlyPrice: 24.99,
            yearlyPrice: 249.99,
            features: [
              { name: 'Unlimited receipts', included: true },
              { name: 'Advanced OCR with AI', included: true },
              { name: 'Priority support', included: true },
              { name: 'API access', included: true },
              { name: 'Team collaboration', included: true }
            ],
            popular: true,
            badge: 'Most Popular',
            trialDays: 14
          },
          {
            id: 'business',
            polarProductId: 'business',
            name: 'Business',
            description: 'For growing teams (up to 5 users)',
            monthlyPrice: 36.99,
            yearlyPrice: 369.99,
            features: [
              { name: 'Everything in Pro', included: true },
              { name: 'Up to 5 team members', included: true },
              { name: 'Advanced analytics', included: true },
              { name: 'Custom integrations', included: true },
              { name: 'Dedicated support', included: true }
            ],
            popular: false,
            badge: 'Best Value',
            trialDays: 14
          }
        ]
      });
    }

    // Fetch products from Polar API
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
      throw new Error(`Polar API error: ${productsResponse.status}`);
    }

    const productsData = await productsResponse.json();
    
    // Transform Polar products to our plan format
    const plans = productsData.items.map((product: any) => {
      const monthlyPrice = product.prices?.find((p: any) => p.recurring_interval === 'month');
      const yearlyPrice = product.prices?.find((p: any) => p.recurring_interval === 'year');
      
      // Determine plan type from product name
      const name = product.name.replace('Flowvya - ', '');
      const isFree = name.toLowerCase().includes('free');
      const isPro = name.toLowerCase().includes('pro');
      const isBusiness = name.toLowerCase().includes('multi') || name.toLowerCase().includes('business');
      
      // Map features based on plan type
      let features = [];
      let badge = null;
      let popular = false;
      let trialDays = 14;
      
      if (isFree) {
        features = [
          { name: '3 receipts per month', included: true },
          { name: '3 invoices per month', included: true },
          { name: 'Basic OCR processing', included: true },
          { name: 'Dashboard analytics', included: true },
          { name: 'Excel/CSV export', included: true },
          { name: 'Email support', included: true },
          { name: 'Advanced features', included: false },
          { name: 'Team collaboration', included: false }
        ];
        trialDays = 0;
      } else if (isPro) {
        features = [
          { name: 'Unlimited receipts', included: true },
          { name: 'Advanced OCR with AI', included: true },
          { name: 'Priority support', included: true },
          { name: 'Receipt image storage', included: true },
          { name: 'Advanced analytics', included: true },
          { name: 'API access', included: true },
          { name: 'Single user', included: true },
          { name: 'Multi-user support', included: false }
        ];
        popular = true;
        badge = 'Most Popular';
      } else if (isBusiness) {
        features = [
          { name: 'Everything in Pro', included: true },
          { name: 'Up to 5 team members', included: true },
          { name: 'Team collaboration', included: true },
          { name: 'Advanced reporting', included: true },
          { name: 'Custom integrations', included: true },
          { name: 'Priority support', included: true },
          { name: 'Training sessions', included: true },
          { name: 'Dedicated account manager', included: false }
        ];
        badge = 'Best for Teams';
      }
      
      return {
        id: product.id,
        polarProductId: product.id,
        name: name === 'Multiuser (up to 5)' ? 'Business' : name,
        description: product.description || `Get started with ${name}`,
        iconType: isFree ? 'sparkles' : isPro ? 'zap' : 'shield',
        monthlyPrice: monthlyPrice?.amount_type === 'fixed' ? 
          monthlyPrice.price_amount / 100 : 0,
        yearlyPrice: yearlyPrice?.amount_type === 'fixed' ? 
          yearlyPrice.price_amount / 100 : 
          (monthlyPrice?.amount_type === 'fixed' ? 
            (monthlyPrice.price_amount / 100) * 10 : 0), // Default 2 months free
        monthlyPriceId: monthlyPrice?.id,
        yearlyPriceId: yearlyPrice?.id,
        features,
        popular,
        badge,
        trialDays,
        recurring: product.is_recurring,
        metadata: product.metadata
      };
    });
    
    // Sort plans by price
    plans.sort((a: any, b: any) => a.monthlyPrice - b.monthlyPrice);
    
    return NextResponse.json({
      success: true,
      source: 'polar',
      plans
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    
    // Return cached/default plans on error
    return NextResponse.json({
      success: false,
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Failed to fetch plans',
      plans: [
        {
          id: 'free',
          polarProductId: 'free',
          name: 'Free',
          description: 'Perfect for getting started',
          monthlyPrice: 0,
          yearlyPrice: 0,
          features: [
            { name: '3 receipts per month', included: true },
            { name: 'Basic features', included: true }
          ]
        },
        {
          id: 'pro',
          polarProductId: 'pro',
          name: 'Pro',
          description: 'For growing businesses',
          monthlyPrice: 24.99,
          yearlyPrice: 249.99,
          features: [
            { name: 'Unlimited receipts', included: true },
            { name: 'All features', included: true }
          ],
          popular: true,
          badge: 'Most Popular'
        }
      ]
    }, { status: 200 }); // Return 200 even on error to not break UI
  }
}