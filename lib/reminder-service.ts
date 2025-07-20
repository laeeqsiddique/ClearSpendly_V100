import { createClient } from '@/lib/supabase/server';
import { emailService, calculateDaysOverdue, isInvoiceOverdue } from './email-service';

interface ReminderConfig {
  enabled: boolean;
  firstReminderDays: number; // Days after due date to send first reminder
  subsequentReminderDays: number; // Days between subsequent reminders
  maxReminders: number; // Maximum number of reminders to send
  autoStop: boolean; // Stop reminders if invoice becomes too old
  autoStopDays: number; // Days after which to stop reminders
}

interface InvoiceReminderData {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  currency: string;
  last_reminder_sent_at?: string;
  reminder_count: number;
  stripe_payment_link_url?: string;
  client: {
    name: string;
    email: string;
    company_name?: string;
  };
  business: {
    name: string;
    email: string;
    phone?: string;
    website?: string;
  };
}

export class InvoiceReminderService {
  private defaultConfig: ReminderConfig = {
    enabled: true,
    firstReminderDays: 7, // Send first reminder 7 days after due date
    subsequentReminderDays: 14, // Send subsequent reminders every 14 days
    maxReminders: 3, // Maximum of 3 reminders
    autoStop: true,
    autoStopDays: 90 // Stop reminders after 90 days
  };

  constructor(private config: ReminderConfig = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  async processOverdueInvoices(): Promise<{
    processed: number;
    sent: number;
    skipped: number;
    errors: number;
  }> {
    const supabase = createClient();
    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: 0
    };

    try {
      // Get all overdue invoices that might need reminders
      const { data: invoices, error } = await supabase
        .from('invoice')
        .select(`
          id,
          invoice_number,
          issue_date,
          due_date,
          status,
          total_amount,
          currency,
          last_reminder_sent_at,
          reminder_count,
          stripe_payment_link_url,
          client:client_id (*),
          tenant:tenant_id (*)
        `)
        .in('status', ['sent', 'viewed', 'overdue'])
        .lte('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching overdue invoices:', error);
        return results;
      }

      if (!invoices || invoices.length === 0) {
        console.log('No overdue invoices found');
        return results;
      }

      console.log(`Found ${invoices.length} potentially overdue invoices`);

      for (const invoice of invoices) {
        results.processed++;

        try {
          // Prepare invoice data for reminder processing
          const reminderData: InvoiceReminderData = {
            ...invoice,
            business: {
              name: invoice.tenant?.name || "Your Business",
              email: invoice.tenant?.email || "",
              phone: invoice.tenant?.phone || "",
              website: invoice.tenant?.website || ""
            }
          };

          const shouldSendReminder = await this.shouldSendReminder(reminderData);

          if (shouldSendReminder) {
            const success = await this.sendReminder(reminderData);
            if (success) {
              results.sent++;
              // Update invoice status to overdue if it's not already
              if (invoice.status !== 'overdue') {
                await supabase
                  .from('invoice')
                  .update({ status: 'overdue' })
                  .eq('id', invoice.id);
              }
            } else {
              results.errors++;
            }
          } else {
            results.skipped++;
          }
        } catch (error) {
          console.error(`Error processing invoice ${invoice.invoice_number}:`, error);
          results.errors++;
        }
      }

      console.log(`Reminder processing complete:`, results);
      return results;

    } catch (error) {
      console.error('Error in processOverdueInvoices:', error);
      return results;
    }
  }

  private async shouldSendReminder(invoice: InvoiceReminderData): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    // Don't send reminders for paid or cancelled invoices
    if (['paid', 'cancelled'].includes(invoice.status)) {
      return false;
    }

    const daysOverdue = calculateDaysOverdue(invoice.due_date);

    // Must be overdue
    if (daysOverdue <= 0) {
      return false;
    }

    // Check if we've exceeded the maximum number of reminders
    if (invoice.reminder_count >= this.config.maxReminders) {
      return false;
    }

    // Check if invoice is too old (auto-stop)
    if (this.config.autoStop && daysOverdue > this.config.autoStopDays) {
      return false;
    }

    // If no reminders sent yet, check if it's time for the first reminder
    if (invoice.reminder_count === 0) {
      return daysOverdue >= this.config.firstReminderDays;
    }

    // For subsequent reminders, check if enough time has passed since last reminder
    if (invoice.last_reminder_sent_at) {
      const lastReminderDate = new Date(invoice.last_reminder_sent_at);
      const daysSinceLastReminder = Math.ceil(
        (new Date().getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceLastReminder >= this.config.subsequentReminderDays;
    }

    return true;
  }

  private async sendReminder(invoice: InvoiceReminderData): Promise<boolean> {
    try {
      const daysOverdue = calculateDaysOverdue(invoice.due_date);
      
      // Send reminder email
      const result = await emailService.sendPaymentReminderEmail(invoice, daysOverdue);

      if (result.success) {
        // Update invoice reminder tracking
        const supabase = createClient();
        await supabase
          .from('invoice')
          .update({
            last_reminder_sent_at: new Date().toISOString(),
            reminder_count: invoice.reminder_count + 1,
            status: 'overdue'
          })
          .eq('id', invoice.id);

        console.log(`Reminder sent for invoice ${invoice.invoice_number} (${daysOverdue} days overdue)`);
        return true;
      } else {
        console.error(`Failed to send reminder for invoice ${invoice.invoice_number}:`, result.error);
        return false;
      }
    } catch (error) {
      console.error(`Error sending reminder for invoice ${invoice.invoice_number}:`, error);
      return false;
    }
  }

  async sendManualReminder(invoiceId: string, customMessage?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      // Get invoice data
      const { data: invoice, error } = await supabase
        .from('invoice')
        .select(`
          *,
          client:client_id (*),
          tenant:tenant_id (*)
        `)
        .eq('id', invoiceId)
        .single();

      if (error || !invoice) {
        return { success: false, error: 'Invoice not found' };
      }

      // Prepare invoice data
      const reminderData: InvoiceReminderData = {
        ...invoice,
        business: {
          name: invoice.tenant?.name || "Your Business",
          email: invoice.tenant?.email || "",
          phone: invoice.tenant?.phone || "",
          website: invoice.tenant?.website || ""
        }
      };

      const daysOverdue = calculateDaysOverdue(invoice.due_date);
      
      // Send reminder email
      const result = await emailService.sendPaymentReminderEmail(
        reminderData, 
        daysOverdue,
        customMessage ? { message: customMessage } : undefined
      );

      if (result.success) {
        // Update reminder tracking
        await supabase
          .from('invoice')
          .update({
            last_reminder_sent_at: new Date().toISOString(),
            reminder_count: invoice.reminder_count + 1
          })
          .eq('id', invoiceId);

        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error sending manual reminder:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getOverdueInvoicesSummary(): Promise<{
    total: number;
    needingFirstReminder: number;
    needingSubsequentReminder: number;
    maxRemindersReached: number;
    autoStopped: number;
  }> {
    const supabase = createClient();
    const summary = {
      total: 0,
      needingFirstReminder: 0,
      needingSubsequentReminder: 0,
      maxRemindersReached: 0,
      autoStopped: 0
    };

    try {
      const { data: invoices, error } = await supabase
        .from('invoice')
        .select('id, due_date, reminder_count, last_reminder_sent_at')
        .in('status', ['sent', 'viewed', 'overdue'])
        .lte('due_date', new Date().toISOString().split('T')[0]);

      if (error || !invoices) {
        return summary;
      }

      for (const invoice of invoices) {
        const daysOverdue = calculateDaysOverdue(invoice.due_date);
        
        if (daysOverdue <= 0) continue;
        
        summary.total++;

        if (this.config.autoStop && daysOverdue > this.config.autoStopDays) {
          summary.autoStopped++;
        } else if (invoice.reminder_count >= this.config.maxReminders) {
          summary.maxRemindersReached++;
        } else if (invoice.reminder_count === 0 && daysOverdue >= this.config.firstReminderDays) {
          summary.needingFirstReminder++;
        } else if (invoice.reminder_count > 0 && invoice.last_reminder_sent_at) {
          const lastReminderDate = new Date(invoice.last_reminder_sent_at);
          const daysSinceLastReminder = Math.ceil(
            (new Date().getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastReminder >= this.config.subsequentReminderDays) {
            summary.needingSubsequentReminder++;
          }
        }
      }

      return summary;
    } catch (error) {
      console.error('Error getting overdue invoices summary:', error);
      return summary;
    }
  }

  getConfig(): ReminderConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<ReminderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Default reminder service instance
export const reminderService = new InvoiceReminderService();