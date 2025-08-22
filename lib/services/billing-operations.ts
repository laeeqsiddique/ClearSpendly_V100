import { createClient } from '@/lib/supabase/server';
import { stripeService } from '@/lib/stripe-service';
import { paypalService } from '@/lib/paypal-service';

export interface BillingInvoice {
  id: string;
  tenantId: string;
  subscriptionId: string;
  provider: 'stripe' | 'paypal';
  providerInvoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  dueDate: Date;
  paidAt?: Date;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  description?: string;
  lineItems: InvoiceLineItem[];
  tax?: number;
  taxRate?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  metadata?: Record<string, any>;
}

export interface PaymentReceipt {
  id: string;
  tenantId: string;
  subscriptionId?: string;
  invoiceId?: string;
  provider: 'stripe' | 'paypal';
  providerPaymentId: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDate: Date;
  description: string;
  customerEmail: string;
  customerName?: string;
  metadata?: Record<string, any>;
  receiptUrl?: string;
  createdAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
}

export class BillingOperationsService {
  private readonly notificationTemplates: Record<string, NotificationTemplate> = {
    payment_succeeded: {
      id: 'payment_succeeded',
      name: 'Payment Succeeded',
      subject: 'Payment Confirmation - {{invoice_number}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Confirmation</h2>
          <p>Hi {{customer_name}},</p>
          <p>Thank you for your payment! We've successfully processed your payment of <strong>{{amount}} {{currency}}</strong> for {{billing_period}}.</p>
          
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3>Payment Details</h3>
            <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
            <p><strong>Payment Method:</strong> {{payment_method}}</p>
            <p><strong>Payment Date:</strong> {{payment_date}}</p>
            <p><strong>Receipt Number:</strong> {{receipt_number}}</p>
          </div>
          
          <p>Your subscription will continue uninterrupted. If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Thank you for using ClearSpendly!</p>
          
          <div style="margin-top: 30px; font-size: 12px; color: #666;">
            <p>View your billing history: <a href="{{dashboard_url}}/billing">{{dashboard_url}}/billing</a></p>
          </div>
        </div>
      `,
      textContent: `Payment Confirmation

Hi {{customer_name}},

Thank you for your payment! We've successfully processed your payment of {{amount}} {{currency}} for {{billing_period}}.

Payment Details:
- Amount: {{amount}} {{currency}}
- Payment Method: {{payment_method}}
- Payment Date: {{payment_date}}
- Receipt Number: {{receipt_number}}

Your subscription will continue uninterrupted. If you have any questions, please contact us.

Thank you for using ClearSpendly!

View your billing history: {{dashboard_url}}/billing`,
      variables: ['customer_name', 'amount', 'currency', 'billing_period', 'payment_method', 'payment_date', 'receipt_number', 'dashboard_url']
    },
    payment_failed: {
      id: 'payment_failed',
      name: 'Payment Failed',
      subject: 'Payment Failed - Action Required',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d73502;">Payment Failed</h2>
          <p>Hi {{customer_name}},</p>
          <p>We were unable to process your payment of <strong>{{amount}} {{currency}}</strong> for your ClearSpendly subscription.</p>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #991b1b;">Payment Details</h3>
            <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
            <p><strong>Failure Reason:</strong> {{failure_reason}}</p>
            <p><strong>Retry Date:</strong> {{next_retry_date}}</p>
          </div>
          
          <div style="background: #dbeafe; border: 1px solid #93c5fd; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #1d4ed8;">What you can do:</h3>
            <ul>
              <li>Update your payment method in your billing settings</li>
              <li>Ensure your payment method has sufficient funds</li>
              <li>Contact your bank if you continue to experience issues</li>
            </ul>
            <p><a href="{{dashboard_url}}/billing" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Update Payment Method</a></p>
          </div>
          
          <p>We'll automatically retry the payment on {{next_retry_date}}. Your service will remain active during this time.</p>
          
          <p>If you have any questions, please contact our support team.</p>
        </div>
      `,
      textContent: `Payment Failed - Action Required

Hi {{customer_name}},

We were unable to process your payment of {{amount}} {{currency}} for your ClearSpendly subscription.

Payment Details:
- Amount: {{amount}} {{currency}}
- Failure Reason: {{failure_reason}}
- Retry Date: {{next_retry_date}}

What you can do:
- Update your payment method in your billing settings
- Ensure your payment method has sufficient funds  
- Contact your bank if you continue to experience issues

Update Payment Method: {{dashboard_url}}/billing

We'll automatically retry the payment on {{next_retry_date}}. Your service will remain active during this time.

If you have any questions, please contact our support team.`,
      variables: ['customer_name', 'amount', 'currency', 'failure_reason', 'next_retry_date', 'dashboard_url']
    },
    payment_final_notice: {
      id: 'payment_final_notice',
      name: 'Final Payment Notice',
      subject: 'Final Notice - Payment Required to Avoid Service Interruption',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Final Payment Notice</h2>
          <p>Hi {{customer_name}},</p>
          <p><strong>This is your final notice.</strong> We've attempted to charge your payment method multiple times for your ClearSpendly subscription.</p>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #991b1b;">Outstanding Payment</h3>
            <p><strong>Amount Due:</strong> {{amount}} {{currency}}</p>
            <p><strong>Service Suspension Date:</strong> {{suspension_date}}</p>
          </div>
          
          <div style="background: #fffbeb; border: 1px solid #fcd34d; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #92400e;">Action Required</h3>
            <p>To avoid service interruption, please update your payment method and retry the payment before {{suspension_date}}.</p>
            <p><a href="{{dashboard_url}}/billing" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Update Payment Method Now</a></p>
          </div>
          
          <p>If no action is taken by {{suspension_date}}, your account will be suspended and you'll lose access to your data.</p>
          
          <p>Please contact our support team immediately if you need assistance.</p>
        </div>
      `,
      textContent: `Final Payment Notice

Hi {{customer_name}},

This is your final notice. We've attempted to charge your payment method multiple times for your ClearSpendly subscription.

Outstanding Payment:
- Amount Due: {{amount}} {{currency}}
- Service Suspension Date: {{suspension_date}}

Action Required:
To avoid service interruption, please update your payment method and retry the payment before {{suspension_date}}.

Update Payment Method: {{dashboard_url}}/billing

If no action is taken by {{suspension_date}}, your account will be suspended and you'll lose access to your data.

Please contact our support team immediately if you need assistance.`,
      variables: ['customer_name', 'amount', 'currency', 'suspension_date', 'dashboard_url']
    },
    trial_ending: {
      id: 'trial_ending',
      name: 'Trial Ending Soon',
      subject: 'Your trial ends in {{days_remaining}} days',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Trial is Ending Soon</h2>
          <p>Hi {{customer_name}},</p>
          <p>Your ClearSpendly trial will end in <strong>{{days_remaining}} days</strong> on {{trial_end_date}}.</p>
          
          <div style="background: #f0f9ff; border: 1px solid #7dd3fc; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #0369a1;">Continue Your Journey</h3>
            <p>Don't lose access to your expense data and all the features you've been using:</p>
            <ul>
              <li>{{receipt_count}} receipts processed</li>
              <li>Advanced OCR and AI categorization</li>
              <li>Comprehensive reporting and analytics</li>
              <li>Multi-user collaboration</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p><strong>Choose your plan and keep everything you've built:</strong></p>
            <p><a href="{{dashboard_url}}/billing" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Choose Your Plan</a></p>
          </div>
          
          <p>If you don't select a plan, your account will be downgraded to our free tier with limited features.</p>
          
          <p>Questions? We're here to help! Contact our support team.</p>
        </div>
      `,
      textContent: `Your Trial is Ending Soon

Hi {{customer_name}},

Your ClearSpendly trial will end in {{days_remaining}} days on {{trial_end_date}}.

Continue Your Journey:
Don't lose access to your expense data and features:
- {{receipt_count}} receipts processed
- Advanced OCR and AI categorization  
- Comprehensive reporting and analytics
- Multi-user collaboration

Choose your plan and keep everything you've built: {{dashboard_url}}/billing

If you don't select a plan, your account will be downgraded to our free tier with limited features.

Questions? Contact our support team.`,
      variables: ['customer_name', 'days_remaining', 'trial_end_date', 'receipt_count', 'dashboard_url']
    }
  };

  async generateInvoice(options: {
    subscriptionId: string;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    amount: number;
    currency?: string;
    description?: string;
    lineItems?: InvoiceLineItem[];
  }): Promise<{
    success: boolean;
    invoice?: BillingInvoice;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      // Get subscription details
      const { data: subscription, error: subError } = await supabase
        .from('subscription')
        .select('*')
        .eq('id', options.subscriptionId)
        .single();

      if (subError || !subscription) {
        return { success: false, error: 'Subscription not found' };
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(subscription.tenant_id);

      const invoice: Omit<BillingInvoice, 'id' | 'createdAt' | 'updatedAt'> = {
        tenantId: subscription.tenant_id,
        subscriptionId: options.subscriptionId,
        provider: subscription.provider || 'stripe',
        providerInvoiceId: '', // Will be set when created with provider
        invoiceNumber,
        amount: options.amount,
        currency: options.currency || 'USD',
        status: 'draft',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        billingPeriodStart: options.billingPeriodStart,
        billingPeriodEnd: options.billingPeriodEnd,
        description: options.description || `Subscription for ${options.billingPeriodStart.toLocaleDateString()} - ${options.billingPeriodEnd.toLocaleDateString()}`,
        lineItems: options.lineItems || [{
          description: `${subscription.plan_id || 'Subscription'} Plan`,
          quantity: 1,
          unitPrice: options.amount,
          amount: options.amount
        }],
        metadata: {
          subscription_id: options.subscriptionId,
          billing_period_start: options.billingPeriodStart.toISOString(),
          billing_period_end: options.billingPeriodEnd.toISOString()
        }
      };

      // Save to database
      const { data: savedInvoice, error: saveError } = await supabase
        .from('billing_invoices')
        .insert({
          ...invoice,
          line_items: invoice.lineItems,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving invoice:', saveError);
        return { success: false, error: 'Failed to save invoice' };
      }

      const billingInvoice: BillingInvoice = {
        ...savedInvoice,
        lineItems: savedInvoice.line_items,
        createdAt: new Date(savedInvoice.created_at),
        updatedAt: new Date(savedInvoice.updated_at)
      };

      return { success: true, invoice: billingInvoice };

    } catch (error) {
      console.error('Error generating invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async generateReceipt(options: {
    tenantId: string;
    subscriptionId?: string;
    invoiceId?: string;
    provider: 'stripe' | 'paypal';
    providerPaymentId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentDate: Date;
    description: string;
    customerEmail: string;
    customerName?: string;
    metadata?: Record<string, any>;
  }): Promise<{
    success: boolean;
    receipt?: PaymentReceipt;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      // Generate receipt number
      const receiptNumber = await this.generateReceiptNumber(options.tenantId);

      const receipt: Omit<PaymentReceipt, 'id' | 'createdAt'> = {
        tenantId: options.tenantId,
        subscriptionId: options.subscriptionId,
        invoiceId: options.invoiceId,
        provider: options.provider,
        providerPaymentId: options.providerPaymentId,
        receiptNumber,
        amount: options.amount,
        currency: options.currency,
        paymentMethod: options.paymentMethod,
        paymentDate: options.paymentDate,
        description: options.description,
        customerEmail: options.customerEmail,
        customerName: options.customerName,
        metadata: options.metadata
      };

      // Save to database
      const { data: savedReceipt, error: saveError } = await supabase
        .from('payment_receipts')
        .insert({
          ...receipt,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving receipt:', saveError);
        return { success: false, error: 'Failed to save receipt' };
      }

      const paymentReceipt: PaymentReceipt = {
        ...savedReceipt,
        createdAt: new Date(savedReceipt.created_at)
      };

      return { success: true, receipt: paymentReceipt };

    } catch (error) {
      console.error('Error generating receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async sendPaymentNotification(
    templateId: string,
    tenantId: string,
    recipientEmail: string,
    variables: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = this.notificationTemplates[templateId];
      if (!template) {
        return { success: false, error: `Unknown template: ${templateId}` };
      }

      // Replace variables in subject and content
      let subject = template.subject;
      let htmlContent = template.htmlContent;
      let textContent = template.textContent;

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subject = subject.replace(placeholder, value);
        htmlContent = htmlContent.replace(placeholder, value);
        textContent = textContent.replace(placeholder, value);
      }

      // In a real implementation, this would send via your email service
      // For now, we'll log the notification
      console.log('Sending payment notification:', {
        templateId,
        to: recipientEmail,
        subject,
        tenantId
      });

      // Store notification in database for tracking
      const supabase = createClient();
      await supabase
        .from('notification_log')
        .insert({
          tenant_id: tenantId,
          template_id: templateId,
          recipient_email: recipientEmail,
          subject,
          html_content: htmlContent,
          text_content: textContent,
          variables,
          status: 'sent',
          sent_at: new Date().toISOString()
        });

      return { success: true };

    } catch (error) {
      console.error('Error sending payment notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getInvoiceHistory(tenantId: string, options?: {
    limit?: number;
    offset?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    success: boolean;
    invoices?: BillingInvoice[];
    total?: number;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      let query = supabase
        .from('billing_invoices')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
      }

      const { data: invoices, error, count } = await query;

      if (error) {
        console.error('Error fetching invoice history:', error);
        return { success: false, error: 'Failed to fetch invoices' };
      }

      const billingInvoices: BillingInvoice[] = (invoices || []).map(invoice => ({
        ...invoice,
        lineItems: invoice.line_items || [],
        createdAt: new Date(invoice.created_at),
        updatedAt: new Date(invoice.updated_at)
      }));

      return {
        success: true,
        invoices: billingInvoices,
        total: count || 0
      };

    } catch (error) {
      console.error('Error getting invoice history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getReceiptHistory(tenantId: string, options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    success: boolean;
    receipts?: PaymentReceipt[];
    total?: number;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      let query = supabase
        .from('payment_receipts')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
      }

      const { data: receipts, error, count } = await query;

      if (error) {
        console.error('Error fetching receipt history:', error);
        return { success: false, error: 'Failed to fetch receipts' };
      }

      const paymentReceipts: PaymentReceipt[] = (receipts || []).map(receipt => ({
        ...receipt,
        createdAt: new Date(receipt.created_at)
      }));

      return {
        success: true,
        receipts: paymentReceipts,
        total: count || 0
      };

    } catch (error) {
      console.error('Error getting receipt history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const supabase = createClient();
    
    // Get tenant settings for invoice prefix
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('billing_settings')
      .eq('tenant_id', tenantId)
      .single();

    const prefix = settings?.billing_settings?.invoicePrefix || 'INV-';
    
    // Get current year and month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Get count of invoices for this month
    const { count } = await supabase
      .from('billing_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', `${year}-${month}-01`)
      .lt('created_at', `${year}-${String(now.getMonth() + 2).padStart(2, '0')}-01`);

    const sequence = String((count || 0) + 1).padStart(4, '0');
    
    return `${prefix}${year}${month}${sequence}`;
  }

  private async generateReceiptNumber(tenantId: string): Promise<string> {
    const supabase = createClient();
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Get count of receipts for this month
    const { count } = await supabase
      .from('payment_receipts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', `${year}-${month}-01`)
      .lt('created_at', `${year}-${String(now.getMonth() + 2).padStart(2, '0')}-01`);

    const sequence = String((count || 0) + 1).padStart(4, '0');
    
    return `REC-${year}${month}${sequence}`;
  }

  getNotificationTemplates(): Record<string, NotificationTemplate> {
    return this.notificationTemplates;
  }

  async getBillingAnalytics(tenantId: string, options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    success: boolean;
    analytics?: {
      totalRevenue: number;
      totalInvoices: number;
      paidInvoices: number;
      pendingInvoices: number;
      overdueInvoices: number;
      averagePaymentTime: number;
      revenueByMonth: Array<{ month: string; revenue: number }>;
      paymentMethods: Record<string, number>;
    };
    error?: string;
  }> {
    try {
      const supabase = createClient();
      
      const startDate = options?.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const endDate = options?.endDate || new Date();

      // Get invoice analytics
      const { data: invoices } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get receipt analytics
      const { data: receipts } = await supabase
        .from('payment_receipts')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (!invoices || !receipts) {
        return { success: false, error: 'Failed to fetch billing data' };
      }

      // Calculate analytics
      const totalRevenue = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
      const totalInvoices = invoices.length;
      const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
      const pendingInvoices = invoices.filter(inv => inv.status === 'open').length;
      const overdueInvoices = invoices.filter(inv => 
        inv.status === 'open' && new Date(inv.due_date) < new Date()
      ).length;

      // Calculate average payment time
      const paidInvoicesWithTime = invoices.filter(inv => inv.status === 'paid' && inv.paid_at);
      const averagePaymentTime = paidInvoicesWithTime.length > 0 
        ? paidInvoicesWithTime.reduce((sum, inv) => {
            const invoiceDate = new Date(inv.created_at);
            const paidDate = new Date(inv.paid_at!);
            return sum + (paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / paidInvoicesWithTime.length
        : 0;

      // Revenue by month
      const revenueByMonth = receipts.reduce((acc, receipt) => {
        const month = new Date(receipt.created_at).toISOString().substring(0, 7);
        acc[month] = (acc[month] || 0) + receipt.amount;
        return acc;
      }, {} as Record<string, number>);

      const revenueByMonthArray = Object.entries(revenueByMonth).map(([month, revenue]) => ({
        month,
        revenue
      }));

      // Payment methods breakdown
      const paymentMethods = receipts.reduce((acc, receipt) => {
        acc[receipt.payment_method] = (acc[receipt.payment_method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        analytics: {
          totalRevenue,
          totalInvoices,
          paidInvoices,
          pendingInvoices,
          overdueInvoices,
          averagePaymentTime,
          revenueByMonth: revenueByMonthArray,
          paymentMethods
        }
      };

    } catch (error) {
      console.error('Error getting billing analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const billingOperationsService = new BillingOperationsService();