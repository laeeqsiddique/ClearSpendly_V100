import { createClient } from '@/lib/supabase/server';

// Build-safe Polar client
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;

let polar: any = null;

if (!isBuildTime) {
  try {
    // Import Polar SDK with correct structure
    const { Polar } = require('@polar-sh/sdk');
    
    polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN || '',
    });
    console.log('✅ Real Polar SDK initialized successfully with access token');
  } catch (error) {
    console.warn('Polar SDK initialization failed:', error);
    console.warn('Using mock client instead');
    polar = createMockPolarClient();
  }
} else {
  polar = createMockPolarClient();
}

function createMockPolarClient() {
  return {
    products: {
      list: () => Promise.resolve({ data: { items: [] } }),
      get: () => Promise.resolve({ data: null }),
    },
    subscriptions: {
      get: () => Promise.resolve({ data: null }),
      list: () => Promise.resolve({ data: { items: [] } }),
      create: () => Promise.resolve({ data: null }),
      update: () => Promise.resolve({ data: null }),
      cancel: () => Promise.resolve({ data: null }),
    },
    customers: {
      create: () => Promise.resolve({ data: null }),
      get: () => Promise.resolve({ data: null }),
      update: () => Promise.resolve({ data: null }),
      createPortalSession: () => Promise.resolve({ data: { url: '#' } }),
    },
    checkouts: {
      create: () => Promise.resolve({ data: { url: '#' } }),
    },
  };
}

export { polar }

// Polar webhook event types
export type PolarWebhookEvent = {
  type: string
  data: {
    id: string
    object: string
    [key: string]: any
  }
}

// Subscription status mapping
export const POLAR_STATUS_MAP = {
  'active': 'active',
  'canceled': 'canceled',
  'incomplete': 'incomplete',
  'incomplete_expired': 'expired',
  'past_due': 'past_due',
  'trialing': 'trialing',
  'unpaid': 'unpaid',
} as const

// Plan configuration for ClearSpendly
export interface PolarPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  polar_product_id?: string;
  polar_price_monthly_id?: string;
  polar_price_yearly_id?: string;
  features: Record<string, any>;
  limits: Record<string, number>;
  trial_days?: number;
  popular?: boolean;
}

// Default plans (fallback when Polar is unavailable)
export const DEFAULT_POLAR_PLANS: PolarPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started with expense tracking',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: {
      ocr_processing: 'basic',
      email_templates: false,
      analytics: 'basic',
      multi_user: false,
      api_access: false,
      priority_support: false,
      custom_branding: false,
      ai_chat: 'basic'
    },
    limits: {
      receipts_per_month: 10,
      invoices_per_month: 2,
      storage_mb: 100,
      users_max: 1
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Enhanced features for small businesses and freelancers',
    monthlyPrice: 15,
    yearlyPrice: 150, // 17% savings
    trial_days: 14,
    popular: true,
    features: {
      ocr_processing: 'enhanced',
      email_templates: true,
      analytics: 'advanced',
      multi_user: false,
      api_access: 'basic',
      priority_support: true,
      custom_branding: true,
      ai_chat: 'advanced',
      receipt_storage: true
    },
    limits: {
      receipts_per_month: -1, // unlimited
      invoices_per_month: 50,
      storage_mb: 5000,
      users_max: 1
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Advanced features for larger teams and organizations',
    monthlyPrice: 49,
    yearlyPrice: 490, // 17% savings
    trial_days: 14,
    features: {
      ocr_processing: 'premium',
      email_templates: true,
      analytics: 'premium',
      multi_user: true,
      api_access: 'full',
      priority_support: true,
      custom_branding: true,
      ai_chat: 'premium',
      receipt_storage: true,
      advanced_reporting: true,
      integrations: true,
      dedicated_support: true
    },
    limits: {
      receipts_per_month: -1,
      invoices_per_month: -1,
      storage_mb: 25000,
      users_max: 10
    }
  }
];

// Fetch available plans from Polar
export async function fetchPolarPlans(): Promise<PolarPlan[]> {
  if (isBuildTime) {
    return DEFAULT_POLAR_PLANS;
  }
  
  try {
    const response = await polar.products.list({
      organizationId: process.env.POLAR_ORGANIZATION_ID,
      isArchived: false,
      isRecurring: true,
    });
    
    console.log('Polar products response:', {
      hasResult: !!response.result,
      hasItems: !!response.result?.items,
      itemCount: response.result?.items?.length || 0
    });
    
    if (!response.result?.items || response.result.items.length === 0) {
      console.log('No Polar products found, using defaults');
      return DEFAULT_POLAR_PLANS;
    }
    
    // Convert Polar products to our plan format
    const polarPlans = response.result.items.map((product: any) => {
      console.log('Processing Polar product:', {
        id: product.id,
        name: product.name,
        pricesCount: product.prices?.length || 0
      });
      
      // Find monthly and yearly prices
      const monthlyPrice = product.prices?.find((p: any) => p.recurringInterval === 'month');
      const yearlyPrice = product.prices?.find((p: any) => p.recurringInterval === 'year');
      
      const plan = {
        id: product.id,
        name: product.name,
        description: product.description || '',
        monthlyPrice: monthlyPrice ? monthlyPrice.priceAmount / 100 : 0,
        yearlyPrice: yearlyPrice ? yearlyPrice.priceAmount / 100 : 0,
        polar_product_id: product.id,
        polar_price_monthly_id: monthlyPrice?.id,
        polar_price_yearly_id: yearlyPrice?.id,
        features: product.metadata?.features ? JSON.parse(product.metadata.features) : {},
        limits: product.metadata?.limits ? JSON.parse(product.metadata.limits) : {},
        trial_days: product.metadata?.trial_days ? parseInt(product.metadata.trial_days) : undefined,
        popular: product.metadata?.popular === 'true'
      };
      
      console.log('Converted plan:', {
        id: plan.id,
        name: plan.name,
        monthlyPriceId: plan.polar_price_monthly_id,
        yearlyPriceId: plan.polar_price_yearly_id
      });
      
      return plan;
    });
    
    console.log('Returning Polar plans:', polarPlans.map(p => ({ id: p.id, name: p.name })));
    return polarPlans;
  } catch (error) {
    console.error('Error fetching Polar plans:', error);
    return DEFAULT_POLAR_PLANS;
  }
}

// Helper to create Polar customer
export async function createPolarCustomer(email: string, name?: string) {
  if (isBuildTime) {
    return { id: 'mock_customer_id', email, name };
  }
  
  try {
    // First try to create the customer
    const response = await polar.customers.create({
      email,
      name: name || email.split('@')[0],
    });
    console.log('Created new Polar customer:', response);
    return response;
  } catch (error: any) {
    // Check if customer already exists
    if (error?.detail?.some((d: any) => d.msg?.includes('already exists'))) {
      console.log('Customer already exists, fetching existing customer...');
      try {
        // Get existing customer by email
        const listResponse = await polar.customers.list({
          email: email
        });
        const existingCustomer = listResponse.result?.items?.[0];
        if (existingCustomer) {
          console.log('Found existing Polar customer:', existingCustomer);
          return existingCustomer;
        }
      } catch (listError) {
        console.error('Error fetching existing customer:', listError);
      }
    }
    
    console.error('Error with Polar customer:', error);
    throw error;
  }
}

// Helper to create checkout session
export async function createCheckoutSession(
  customerId: string,
  productId: string,
  successUrl: string,
  cancelUrl?: string,
  metadata?: Record<string, string>
) {
  if (isBuildTime) {
    return { id: 'mock_checkout_id', url: successUrl };
  }
  
  try {
    const response = await polar.checkouts.create({
      products: [productId],
      customerId: customerId,
      successUrl: successUrl,
      cancelUrl: cancelUrl || successUrl,
      metadata: metadata || {},
    });
    console.log('Checkout session response:', response);
    return response;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Helper to get customer subscriptions
export async function getCustomerSubscriptions(customerId: string) {
  if (isBuildTime) {
    return [];
  }
  
  try {
    const response = await polar.subscriptions.list({
      customerId: customerId,
    });
    return response.result?.items || [];
  } catch (error) {
    console.error('Error fetching customer subscriptions:', error);
    return [];
  }
}

// Helper to create subscription directly
export async function createPolarSubscription(
  customerId: string,
  priceId: string,
  metadata?: Record<string, string>
) {
  if (isBuildTime) {
    return { id: 'mock_subscription_id', status: 'active' };
  }
  
  try {
    const response = await polar.subscriptions.create({
      customerId: customerId,
      priceId: priceId,
      metadata: metadata || {},
    });
    return response.result;
  } catch (error) {
    console.error('Error creating Polar subscription:', error);
    throw error;
  }
}

// Helper to cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  try {
    const response = await polar.subscriptions.cancel({
      id: subscriptionId,
    })
    return response.data
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

// Helper to get customer portal URL
export async function getCustomerPortalUrl(customerId: string) {
  try {
    const response = await polar.customers.createPortalSession({
      customerId: customerId,
    })
    return response.result?.url
  } catch (error) {
    console.error('Error creating customer portal session:', error)
    throw error
  }
}

// Helper to verify webhook signature
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}