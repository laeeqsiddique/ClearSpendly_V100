import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mock PayPal API test function
const testPayPalConnection = async (clientId: string, clientSecret: string, environment: 'sandbox' | 'live') => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock validation logic
  if (!clientId || !clientSecret) {
    throw new Error('Invalid credentials');
  }
  
  // Simulate different response based on environment
  if (environment === 'sandbox') {
    if (clientId.startsWith('sb-') || clientId.length > 20) {
      return {
        success: true,
        environment,
        accountInfo: {
          merchantId: 'MOCK_MERCHANT_ID',
          status: 'verified',
          capabilities: ['payments', 'refunds']
        }
      };
    } else {
      throw new Error('Invalid sandbox credentials format');
    }
  } else {
    // Live environment validation would be more strict
    if (clientId.length > 20) {
      return {
        success: true,
        environment,
        accountInfo: {
          merchantId: 'LIVE_MERCHANT_ID',
          status: 'verified',
          capabilities: ['payments', 'refunds', 'subscriptions']
        }
      };
    } else {
      throw new Error('Invalid live credentials');
    }
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, clientSecret, environment } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Client ID and Client Secret are required' },
        { status: 400 }
      );
    }

    if (!environment || !['sandbox', 'live'].includes(environment)) {
      return NextResponse.json(
        { error: 'Valid environment (sandbox or live) is required' },
        { status: 400 }
      );
    }

    // Test the PayPal connection
    const result = await testPayPalConnection(clientId, clientSecret, environment);

    return NextResponse.json({
      success: true,
      message: `PayPal ${environment} connection successful`,
      data: result
    });

  } catch (error) {
    console.error('PayPal connection test failed:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'PayPal connection test failed',
        details: 'Please check your credentials and try again'
      },
      { status: 400 }
    );
  }
}