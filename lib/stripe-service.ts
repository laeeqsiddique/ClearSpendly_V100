import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
}) : null;

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
}

// Default Stripe service instance
export const stripeService = new StripeService();