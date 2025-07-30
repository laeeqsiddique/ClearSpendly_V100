// Conditional import to handle missing exports
let polar: any = null;

try {
  const { PolarApi, Configuration } = require('@polar-sh/sdk');
  const configuration = new Configuration({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
  });
  polar = new PolarApi(configuration);
} catch (error) {
  console.warn('Polar SDK not available, using mock client');
  polar = {
    // Mock implementation for build compatibility
    subscriptions: {
      get: () => Promise.resolve(null),
      list: () => Promise.resolve([]),
    }
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

// Product tiers configuration
export const POLAR_PRODUCTS = {
  FREE: {
    name: 'Free',
    receipts_limit: 10,
    storage_limit_gb: 10,
    features: ['Basic OCR', 'Basic Analytics', 'CSV Export']
  },
  PRO: {
    name: 'Pro',
    receipts_limit: -1, // unlimited
    storage_limit_gb: 100,
    features: ['Unlimited OCR', 'Advanced Analytics', 'API Access', 'Priority Support', 'Mistral AI Chat', 'Receipt Storage']
  }
} as const

// Helper to create Polar customer
export async function createPolarCustomer(email: string, name?: string) {
  try {
    const response = await polar.customers.create({
      email,
      name: name || email.split('@')[0],
    })
    return response.data
  } catch (error) {
    console.error('Error creating Polar customer:', error)
    throw error
  }
}

// Helper to create checkout session
export async function createCheckoutSession(
  customerId: string,
  productId: string,
  successUrl: string,
  cancelUrl?: string
) {
  try {
    const response = await polar.checkouts.create({
      product_id: productId,
      customer_id: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl || successUrl,
    })
    return response.data
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

// Helper to get customer subscriptions
export async function getCustomerSubscriptions(customerId: string) {
  try {
    const response = await polar.subscriptions.list({
      customer_id: customerId,
    })
    return response.data?.items || []
  } catch (error) {
    console.error('Error fetching customer subscriptions:', error)
    return []
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
      customer_id: customerId,
    })
    return response.data?.url
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