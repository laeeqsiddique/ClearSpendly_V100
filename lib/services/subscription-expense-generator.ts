import { createClient } from "@supabase/supabase-js";
import { Subscription } from "@/lib/types/subscription";

// Create Supabase client inside functions to avoid build-time initialization
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key'
  );
}

interface ExpenseEntry {
  receipt_date: string;
  total_amount: number;
  vendor_id?: string;
  payment_method: string;
  business_purpose: string;
  notes: string;
  receipt_type: 'manual';
  ocr_status: 'completed';
  source_subscription_id: string;
  tenant_id: string;
  created_by: string;
}

export async function generateSubscriptionExpenses(subscription: Subscription, createdBy: string, tagIds?: string[]): Promise<void> {
  try {
    const startDate = new Date(subscription.start_date);
    const today = new Date();
    const expenses: ExpenseEntry[] = [];

    // Find or create vendor for this subscription
    const vendorId = await findOrCreateVendor(subscription.service_name, subscription.tenant_id, createdBy);

    // Generate expenses from start date to today based on frequency
    let currentDate = new Date(startDate);
    
    while (currentDate <= today) {
      expenses.push({
        receipt_date: currentDate.toISOString().split('T')[0],
        total_amount: subscription.amount,
        vendor_id: vendorId,
        payment_method: subscription.payment_method || 'credit_card',
        business_purpose: `Subscription payment for ${subscription.service_name}`,
        notes: `Auto-generated from subscription. ${subscription.notes || ''}`.trim(),
        receipt_type: 'manual',
        ocr_status: 'completed',
        source_subscription_id: subscription.id,
        tenant_id: subscription.tenant_id,
        created_by: createdBy
      });

      // Calculate next charge date based on frequency
      currentDate = getNextChargeDate(currentDate, subscription.frequency);
    }

    // Insert all expenses at once
    if (expenses.length > 0) {
      const supabase = getSupabaseClient();
      const { data: insertedExpenses, error } = await supabase
        .from('receipt')
        .insert(expenses)
        .select('id');

      if (error) {
        console.error('Error generating subscription expenses:', error);
        throw new Error('Failed to generate subscription expenses');
      }

      // Apply tags to all generated expenses if provided
      if (tagIds && tagIds.length > 0 && insertedExpenses) {
        await applyTagsToExpenses(insertedExpenses.map(e => e.id), tagIds, subscription.tenant_id);
      }

      console.log(`Generated ${expenses.length} expense entries for subscription: ${subscription.service_name}`);
    }
  } catch (error) {
    console.error('Error in generateSubscriptionExpenses:', error);
    throw error;
  }
}

export async function updateSubscriptionExpenses(
  subscription: Subscription, 
  originalSubscription: Subscription,
  createdBy: string,
  tagIds?: string[]
): Promise<void> {
  try {
    // Delete existing auto-generated expenses for this subscription
    const supabase = getSupabaseClient();
    await supabase
      .from('receipt')
      .delete()
      .eq('source_subscription_id', subscription.id);

    // Generate new expenses with updated data
    await generateSubscriptionExpenses(subscription, createdBy, tagIds);
  } catch (error) {
    console.error('Error updating subscription expenses:', error);
    throw error;
  }
}

export async function deleteSubscriptionExpenses(subscriptionId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('receipt')
      .delete()
      .eq('source_subscription_id', subscriptionId);

    if (error) {
      console.error('Error deleting subscription expenses:', error);
      throw new Error('Failed to delete subscription expenses');
    }

    console.log(`Deleted auto-generated expenses for subscription: ${subscriptionId}`);
  } catch (error) {
    console.error('Error in deleteSubscriptionExpenses:', error);
    throw error;
  }
}

function getNextChargeDate(currentDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
  }
  
  return nextDate;
}

// Helper to apply tags to expenses
async function applyTagsToExpenses(expenseIds: string[], tagIds: string[], tenantId: string): Promise<void> {
  try {
    const receiptTags = expenseIds.flatMap(expenseId => 
      tagIds.map(tagId => ({
        receipt_id: expenseId,
        tag_id: tagId,
        tenant_id: tenantId
      }))
    );

    if (receiptTags.length > 0) {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('receipt_tag')
        .insert(receiptTags);

      if (error) {
        console.error('Error applying tags to subscription expenses:', error);
        // Don't throw error, just log it - expense creation is more important
      } else {
        console.log(`Applied ${tagIds.length} tags to ${expenseIds.length} expenses`);
      }
    }
  } catch (error) {
    console.error('Error in applyTagsToExpenses:', error);
  }
}

// Helper to find or create a vendor for subscription expenses
async function findOrCreateVendor(serviceName: string, tenantId: string, createdBy: string): Promise<string> {
  try {
    // First, try to find existing vendor
    const supabase = getSupabaseClient();
    const { data: existingVendor } = await supabase
      .from('vendor')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('normalized_name', serviceName.toLowerCase().trim())
      .single();

    if (existingVendor) {
      return existingVendor.id;
    }

    // Create new vendor if not found
    const { data: newVendor, error } = await supabase
      .from('vendor')
      .insert({
        tenant_id: tenantId,
        name: serviceName,
        normalized_name: serviceName.toLowerCase().trim(),
        category: 'subscription_service',
        created_by: createdBy
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating vendor for subscription:', error);
      throw new Error('Failed to create vendor');
    }

    return newVendor.id;
  } catch (error) {
    console.error('Error in findOrCreateVendor:', error);
    throw error;
  }
}

// Helper to check if expenses already exist for a subscription
export async function getExistingSubscriptionExpenses(subscriptionId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('receipt')
    .select('*')
    .eq('source_subscription_id', subscriptionId)
    .order('receipt_date');

  if (error) {
    console.error('Error fetching existing subscription expenses:', error);
    return [];
  }

  return data || [];
}