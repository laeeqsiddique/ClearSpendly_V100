import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
}) : null;

// Use test cards in development
const isTestMode = process.env.NODE_ENV === 'development' || process.env.STRIPE_SECRET_KEY?.includes('sk_test');

interface CreatePaymentLinkOptions {
  invoiceId: string;
  amount: number;
  currency: string;
  description: string;
  clientEmail: string;
  clientName: string;
  invoiceNumber: string;
  metadata?: Record<string, string>;
}

interface PaymentLinkResult {
  success: boolean;
  paymentLink?: {
    id: string;
    url: string;
  };
  error?: string;
}

interface CreateSubscriptionOptions {
  customerId: string;
  priceId: string;
  tenantId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

interface CustomerResult {
  success: boolean;
  customer?: Stripe.Customer;
  error?: string;
}

interface PaymentMethodResult {
  success: boolean;
  paymentMethods?: Stripe.PaymentMethod[];
  error?: string;
}

interface SubscriptionResult {
  success: boolean;
  subscription?: Stripe.Subscription;
  error?: string;
}

export class StripeService {
  constructor() {
    // Don't throw during build time, just warn
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('Stripe secret key not configured, payment features will be disabled');
    }
  }

  async createPaymentLink(options: CreatePaymentLinkOptions): Promise<PaymentLinkResult> {
    try {
      if (!stripe) {
        return {
          success: false,
          error: 'Stripe service not configured'
        };
      }
      const {
        invoiceId,
        amount,
        currency,
        description,
        clientEmail,
        clientName,
        invoiceNumber,
        metadata = {}
      } = options;

      // Convert amount to cents (Stripe expects amounts in smallest currency unit)
      const amountInCents = Math.round(amount * 100);

      // Create a product for this invoice
      const product = await stripe.products.create({
        name: `Invoice ${invoiceNumber}`,
        description: description,
        metadata: {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber,
          ...metadata
        }
      });

      // Create a price for the product
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: amountInCents,
        currency: currency.toLowerCase(),
        metadata: {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber
        }
      });

      // Create the payment link
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        metadata: {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber,
          client_email: clientEmail,
          client_name: clientName,
          ...metadata
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices?payment=success&invoice=${invoiceNumber}`,
          },
        },
        automatic_tax: {
          enabled: false, // We'll handle tax calculation in our invoice system
        },
        billing_address_collection: 'auto',
        customer_creation: 'if_required',
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: `Payment for Invoice ${invoiceNumber}`,
            metadata: {
              clearspendly_invoice_id: invoiceId,
              clearspendly_invoice_number: invoiceNumber
            },
            footer: `Thank you for your business! This payment is for Invoice ${invoiceNumber}.`
          }
        },
        payment_method_types: ['card', 'us_bank_account'],
        phone_number_collection: {
          enabled: false
        },
        shipping_address_collection: {
          allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE']
        }
      });

      return {
        success: true,
        paymentLink: {
          id: paymentLink.id,
          url: paymentLink.url
        }
      };

    } catch (error) {
      console.error('Error creating Stripe payment link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async updatePaymentLink(paymentLinkId: string, options: Partial<CreatePaymentLinkOptions>): Promise<PaymentLinkResult> {
    try {
      if (!stripe) {
        return {
          success: false,
          error: 'Stripe service not configured'
        };
      }
      // Note: Stripe payment links are mostly immutable after creation
      // We can only update limited fields like metadata
      const paymentLink = await stripe.paymentLinks.update(paymentLinkId, {
        metadata: options.metadata || {}
      });

      return {
        success: true,
        paymentLink: {
          id: paymentLink.id,
          url: paymentLink.url
        }
      };

    } catch (error) {
      console.error('Error updating Stripe payment link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async deactivatePaymentLink(paymentLinkId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!stripe) return { success: false, error: 'Stripe service not configured' };
      await stripe.paymentLinks.update(paymentLinkId, {
        active: false
      });

      return { success: true };

    } catch (error) {
      console.error('Error deactivating Stripe payment link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async retrievePaymentLink(paymentLinkId: string): Promise<{
    success: boolean;
    paymentLink?: Stripe.PaymentLink;
    error?: string;
  }> {
    try {
      const paymentLink = await stripe.paymentLinks.retrieve(paymentLinkId);

      return {
        success: true,
        paymentLink
      };

    } catch (error) {
      console.error('Error retrieving Stripe payment link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async handlePaymentSuccess(sessionId: string): Promise<{
    success: boolean;
    paymentDetails?: {
      amount: number;
      currency: string;
      invoiceId: string;
      customerId?: string;
    };
    error?: string;
  }> {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'customer']
      });

      if (session.payment_status !== 'paid') {
        return {
          success: false,
          error: 'Payment not completed'
        };
      }

      const invoiceId = session.metadata?.invoice_id;
      if (!invoiceId) {
        return {
          success: false,
          error: 'Invoice ID not found in payment metadata'
        };
      }

      return {
        success: true,
        paymentDetails: {
          amount: (session.amount_total || 0) / 100, // Convert from cents
          currency: session.currency || 'usd',
          invoiceId: invoiceId,
          customerId: typeof session.customer === 'string' ? session.customer : undefined
        }
      };

    } catch (error) {
      console.error('Error handling payment success:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async testStripeConfiguration(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!stripe) return { success: false, error: 'Stripe service not configured' };
      if (!process.env.STRIPE_SECRET_KEY) {
        return { success: false, error: 'Stripe secret key not configured' };
      }

      // Test the connection by retrieving account information
      await stripe.accounts.retrieve();
      
      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =================
  // SUBSCRIPTION MANAGEMENT
  // =================

  async createCustomer(options: {
    email: string;
    name?: string;
    tenantId: string;
    metadata?: Record<string, string>;
  }): Promise<CustomerResult> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      const customer = await stripe.customers.create({
        email: options.email,
        name: options.name,
        metadata: {
          tenant_id: options.tenantId,
          ...options.metadata
        }
      });

      return { success: true, customer };

    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async createSubscription(options: CreateSubscriptionOptions): Promise<SubscriptionResult> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: options.customerId,
        items: [{ price: options.priceId }],
        metadata: {
          tenant_id: options.tenantId,
          ...options.metadata
        },
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        collection_method: 'charge_automatically'
      };

      if (options.trialDays && options.trialDays > 0) {
        subscriptionParams.trial_period_days = options.trialDays;
      }

      const subscription = await stripe.subscriptions.create(subscriptionParams);

      return { success: true, subscription };

    } catch (error) {
      console.error('Error creating Stripe subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async updateSubscription(subscriptionId: string, options: {
    priceId?: string;
    prorationBehavior?: 'create_prorations' | 'none';
    metadata?: Record<string, string>;
  }): Promise<SubscriptionResult> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      const updateParams: Stripe.SubscriptionUpdateParams = {
        proration_behavior: options.prorationBehavior || 'create_prorations',
        metadata: options.metadata
      };

      if (options.priceId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        updateParams.items = [{
          id: subscription.items.data[0].id,
          price: options.priceId
        }];
      }

      const subscription = await stripe.subscriptions.update(subscriptionId, updateParams);

      return { success: true, subscription };

    } catch (error) {
      console.error('Error updating Stripe subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async pauseSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        pause_collection: {
          behavior: 'mark_uncollectible'
        }
      });

      return { success: true, subscription };

    } catch (error) {
      console.error('Error pausing Stripe subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        pause_collection: null
      });

      return { success: true, subscription };

    } catch (error) {
      console.error('Error resuming Stripe subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async cancelSubscription(subscriptionId: string, options?: {
    immediately?: boolean;
    cancellationReason?: string;
  }): Promise<SubscriptionResult> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      let subscription: Stripe.Subscription;

      if (options?.immediately) {
        subscription = await stripe.subscriptions.cancel(subscriptionId, {
          invoice_now: true,
          prorate: true
        });
      } else {
        subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            cancellation_reason: options?.cancellationReason || 'user_requested'
          }
        });
      }

      return { success: true, subscription };

    } catch (error) {
      console.error('Error cancelling Stripe subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      });

      return { success: true, subscription };

    } catch (error) {
      console.error('Error reactivating Stripe subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async extendTrial(subscriptionId: string, trialEndDate: Date): Promise<SubscriptionResult> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        trial_end: Math.floor(trialEndDate.getTime() / 1000)
      });

      return { success: true, subscription };

    } catch (error) {
      console.error('Error extending trial:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // =================
  // PAYMENT METHOD MANAGEMENT
  // =================

  async listPaymentMethods(customerId: string): Promise<PaymentMethodResult> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return { success: true, paymentMethods: paymentMethods.data };

    } catch (error) {
      console.error('Error listing payment methods:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      return { success: true };

    } catch (error) {
      console.error('Error attaching payment method:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      await stripe.paymentMethods.detach(paymentMethodId);

      return { success: true };

    } catch (error) {
      console.error('Error detaching payment method:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      return { success: true };

    } catch (error) {
      console.error('Error setting default payment method:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // =================
  // BILLING AND INVOICES
  // =================

  async createSetupIntent(customerId: string): Promise<{
    success: boolean;
    setupIntent?: Stripe.SetupIntent;
    error?: string;
  }> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session'
      });

      return { success: true, setupIntent };

    } catch (error) {
      console.error('Error creating setup intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async retryPayment(invoiceId: string): Promise<{
    success: boolean;
    invoice?: Stripe.Invoice;
    error?: string;
  }> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      const invoice = await stripe.invoices.pay(invoiceId);

      return { success: true, invoice };

    } catch (error) {
      console.error('Error retrying payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string): Promise<{
    success: boolean;
    session?: Stripe.BillingPortal.Session;
    error?: string;
  }> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });

      return { success: true, session };

    } catch (error) {
      console.error('Error creating customer portal session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // =================
  // COUPONS AND DISCOUNTS
  // =================

  async createCoupon(options: {
    id?: string;
    name: string;
    percentOff?: number;
    amountOff?: number;
    currency?: string;
    duration: 'forever' | 'once' | 'repeating';
    durationInMonths?: number;
    maxRedemptions?: number;
    redeemBy?: Date;
  }): Promise<{
    success: boolean;
    coupon?: Stripe.Coupon;
    error?: string;
  }> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      const couponParams: Stripe.CouponCreateParams = {
        id: options.id,
        name: options.name,
        duration: options.duration
      };

      if (options.percentOff) {
        couponParams.percent_off = options.percentOff;
      } else if (options.amountOff && options.currency) {
        couponParams.amount_off = options.amountOff;
        couponParams.currency = options.currency;
      } else {
        return { success: false, error: 'Either percent_off or amount_off with currency must be provided' };
      }

      if (options.duration === 'repeating' && options.durationInMonths) {
        couponParams.duration_in_months = options.durationInMonths;
      }

      if (options.maxRedemptions) {
        couponParams.max_redemptions = options.maxRedemptions;
      }

      if (options.redeemBy) {
        couponParams.redeem_by = Math.floor(options.redeemBy.getTime() / 1000);
      }

      const coupon = await stripe.coupons.create(couponParams);

      return { success: true, coupon };

    } catch (error) {
      console.error('Error creating coupon:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async applyCoupon(subscriptionId: string, couponId: string): Promise<SubscriptionResult> {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe service not configured' };
      }

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        coupon: couponId
      });

      return { success: true, subscription };

    } catch (error) {
      console.error('Error applying coupon:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // =================
  // TEST UTILITIES
  // =================

  getTestCards() {
    return {
      visa: '4242424242424242',
      visa_debit: '4000056655665556',
      mastercard: '5555555555554444',
      amex: '378282246310005',
      declined_generic: '4000000000000002',
      declined_insufficient_funds: '4000000000009995',
      declined_lost_card: '4000000000009987',
      declined_stolen_card: '4000000000009979',
      expired_card: '4000000000000069',
      processing_error: '4000000000000119',
      require_authentication: '4000002500003155'
    };
  }

  async createTestSubscription(tenantId: string, testScenario: 'success' | 'payment_failed' | 'requires_action' = 'success'): Promise<{
    success: boolean;
    customer?: Stripe.Customer;
    subscription?: Stripe.Subscription;
    error?: string;
  }> {
    try {
      if (!stripe || !isTestMode) {
        return { success: false, error: 'Test subscriptions only available in test mode' };
      }

      // Create test customer
      const customer = await stripe.customers.create({
        email: `test-${Date.now()}@example.com`,
        name: 'Test Customer',
        metadata: { tenant_id: tenantId, test_scenario: testScenario }
      });

      // Create payment method based on scenario
      let cardNumber = this.getTestCards().visa;
      switch (testScenario) {
        case 'payment_failed':
          cardNumber = this.getTestCards().declined_generic;
          break;
        case 'requires_action':
          cardNumber = this.getTestCards().require_authentication;
          break;
      }

      // For test purposes, we'll simulate payment method creation
      // In a real app, this would come from the frontend
      
      return {
        success: true,
        customer,
        // subscription would be created separately with payment method
      };

    } catch (error) {
      console.error('Error creating test subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

// Default Stripe service instance
export const stripeService = new StripeService();

// Test card numbers for development
export const TEST_CARDS = {
  // Successful payments
  VISA: '4242424242424242',
  VISA_DEBIT: '4000056655665556', 
  MASTERCARD: '5555555555554444',
  AMEX: '378282246310005',
  
  // Declined payments
  DECLINED_GENERIC: '4000000000000002',
  DECLINED_INSUFFICIENT_FUNDS: '4000000000009995',
  DECLINED_LOST_CARD: '4000000000009987',
  DECLINED_STOLEN_CARD: '4000000000009979',
  EXPIRED_CARD: '4000000000000069',
  
  // Special cases
  PROCESSING_ERROR: '4000000000000119',
  REQUIRE_AUTHENTICATION: '4000002500003155',
  ATTACH_FAILS: '4000000000000341'
} as const;

// Subscription plan IDs for testing
export const TEST_PRICE_IDS = {
  BASIC_MONTHLY: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || 'price_test_basic_monthly',
  BASIC_YEARLY: process.env.STRIPE_BASIC_YEARLY_PRICE_ID || 'price_test_basic_yearly',
  PREMIUM_MONTHLY: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_test_premium_monthly',
  PREMIUM_YEARLY: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_test_premium_yearly',
  ENTERPRISE_MONTHLY: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_test_enterprise_monthly',
  ENTERPRISE_YEARLY: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_test_enterprise_yearly'
} as const;