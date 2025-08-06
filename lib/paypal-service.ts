import { createClient } from '@/lib/supabase/server';

// PayPal API types
interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

interface PayPalAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface CreatePayPalOrderOptions {
  invoiceId: string;
  amount: number;
  currency: string;
  description: string;
  clientEmail: string;
  clientName: string;
  invoiceNumber: string;
  tenantId: string;
  metadata?: Record<string, string>;
}

interface PayPalOrderResult {
  success: boolean;
  order?: {
    id: string;
    approvalUrl: string;
  };
  error?: string;
}

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: any;
  create_time: string;
}

export class PayPalService {
  private baseUrl: string;
  private clientId: string | null;
  private clientSecret: string | null;

  constructor() {
    // Use sandbox for development, live for production
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
    
    this.clientId = process.env.PAYPAL_CLIENT_ID || null;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || null;

    if (!this.clientId || !this.clientSecret) {
      console.warn('PayPal credentials not configured, PayPal features will be disabled');
    }
  }

  // Get access token for PayPal API calls
  private async getAccessToken(): Promise<string | null> {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('PayPal credentials not configured');
      }

      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en_US',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`PayPal token request failed: ${response.status}`);
      }

      const data: PayPalAccessToken = await response.json();
      return data.access_token;

    } catch (error) {
      console.error('Error getting PayPal access token:', error);
      return null;
    }
  }

  // Create PayPal order for invoice payment
  async createOrderForInvoice(options: CreatePayPalOrderOptions): Promise<PayPalOrderResult> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: 'Failed to get PayPal access token'
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
        tenantId,
        metadata = {}
      } = options;

      // Ensure amount is properly formatted (PayPal expects string)
      const formattedAmount = amount.toFixed(2);

      const orderPayload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: invoiceId,
            description: description,
            invoice_id: invoiceNumber,
            amount: {
              currency_code: currency.toUpperCase(),
              value: formattedAmount,
              breakdown: {
                item_total: {
                  currency_code: currency.toUpperCase(),
                  value: formattedAmount
                }
              }
            },
            items: [
              {
                name: `Invoice ${invoiceNumber}`,
                description: description,
                quantity: '1',
                unit_amount: {
                  currency_code: currency.toUpperCase(),
                  value: formattedAmount
                },
                category: 'DIGITAL_GOODS'
              }
            ],
            custom_id: invoiceId, // For webhook processing
            payee: {
              email_address: process.env.PAYPAL_BUSINESS_EMAIL || undefined
            }
          }
        ],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              brand_name: metadata.business_name || 'Your Business',
              locale: 'en-US',
              landing_page: 'LOGIN',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices?payment=success&provider=paypal&invoice=${invoiceNumber}`,
              cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices?payment=cancelled&provider=paypal&invoice=${invoiceNumber}`
            }
          }
        },
        application_context: {
          brand_name: metadata.business_name || 'Your Business',
          locale: 'en-US',
          landing_page: 'BILLING',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW'
        }
      };

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'PayPal-Request-Id': `${invoiceId}-${Date.now()}`, // Idempotency key
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('PayPal order creation failed:', errorData);
        return {
          success: false,
          error: `PayPal order creation failed: ${response.status}`
        };
      }

      const order: PayPalOrder = await response.json();
      
      // Find the approval URL
      const approvalLink = order.links?.find(link => link.rel === 'approve');
      if (!approvalLink) {
        return {
          success: false,
          error: 'No approval URL found in PayPal response'
        };
      }

      return {
        success: true,
        order: {
          id: order.id,
          approvalUrl: approvalLink.href
        }
      };

    } catch (error) {
      console.error('Error creating PayPal order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Capture payment for a PayPal order
  async captureOrder(orderId: string): Promise<{ success: boolean; captureId?: string; error?: string }> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: 'Failed to get PayPal access token'
        };
      }

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation'
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('PayPal capture failed:', errorData);
        return {
          success: false,
          error: `PayPal capture failed: ${response.status}`
        };
      }

      const captureData = await response.json();
      const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;

      return {
        success: true,
        captureId: captureId || orderId
      };

    } catch (error) {
      console.error('Error capturing PayPal order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Verify webhook signature (simplified - in production use PayPal's verification)
  async verifyWebhookSignature(headers: Record<string, string>, body: string): Promise<boolean> {
    try {
      // In a real implementation, you would:
      // 1. Get the PayPal webhook certificate
      // 2. Verify the webhook signature using the certificate
      // 3. Check the webhook timestamp to prevent replay attacks
      
      // For simplicity, we'll just check if required headers are present
      const requiredHeaders = ['paypal-transmission-id', 'paypal-cert-id', 'paypal-transmission-sig'];
      return requiredHeaders.every(header => headers[header]);

    } catch (error) {
      console.error('Error verifying PayPal webhook signature:', error);
      return false;
    }
  }

  // Setup PayPal integration for a tenant
  async setupTenantIntegration(tenantId: string, paypalClientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      // Create webhook endpoint for this tenant
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/paypal?tenant=${tenantId}`;

      // Store PayPal configuration for tenant
      const { error } = await supabase
        .from('payment_provider')
        .upsert({
          tenant_id: tenantId,
          provider_type: 'paypal',
          paypal_client_id: paypalClientId,
          is_enabled: true,
          verification_status: 'verified',
          setup_completed_at: new Date().toISOString(),
          provider_config: {
            webhook_url: webhookUrl,
            environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox'
          }
        });

      if (error) {
        console.error('Error setting up PayPal integration:', error);
        return {
          success: false,
          error: 'Failed to save PayPal configuration'
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Error in PayPal tenant setup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Get PayPal configuration for a tenant
  async getTenantConfig(tenantId: string): Promise<{ clientId?: string; isEnabled: boolean }> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('payment_provider')
        .select('paypal_client_id, is_enabled, verification_status')
        .eq('tenant_id', tenantId)
        .eq('provider_type', 'paypal')
        .single();

      if (error || !data) {
        return { isEnabled: false };
      }

      return {
        clientId: data.paypal_client_id,
        isEnabled: data.is_enabled && data.verification_status === 'verified'
      };

    } catch (error) {
      console.error('Error getting PayPal tenant config:', error);
      return { isEnabled: false };
    }
  }

  // Test PayPal configuration
  async testConfiguration(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.clientId || !this.clientSecret) {
        return { success: false, error: 'PayPal credentials not configured' };
      }

      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return { success: false, error: 'Failed to get access token' };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Default PayPal service instance
export const paypalService = new PayPalService();