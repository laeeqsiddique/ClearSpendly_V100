import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"

export interface SubscriptionTier {
  id: string
  name: string
  storage_limit_mb: number
  max_file_size_mb: number
  max_files: number
  features: string[]
  price_monthly: number
  price_yearly: number
}

export interface TenantSubscription {
  tenant_id: string
  tier_id: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  tier: SubscriptionTier
}

// Default subscription tiers matching our storage limits
export const DEFAULT_TIERS: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free',
    storage_limit_mb: 100,
    max_file_size_mb: 5,
    max_files: 50,
    features: [
      'OCR receipt processing',
      'Basic reporting',
      'Up to 50 receipts',
      '100MB storage'
    ],
    price_monthly: 0,
    price_yearly: 0
  },
  {
    id: 'basic',
    name: 'Basic',
    storage_limit_mb: 1024,
    max_file_size_mb: 10,
    max_files: 500,
    features: [
      'All free features',
      'Advanced OCR',
      'Up to 500 receipts',
      '1GB storage',
      'Export to CSV/PDF'
    ],
    price_monthly: 9.99,
    price_yearly: 99.99
  },
  {
    id: 'premium',
    name: 'Premium',
    storage_limit_mb: 10240,
    max_file_size_mb: 25,
    max_files: 5000,
    features: [
      'All basic features',
      'AI-powered categorization',
      'Up to 5000 receipts',
      '10GB storage',
      'Multi-user access',
      'API access'
    ],
    price_monthly: 24.99,
    price_yearly: 249.99
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    storage_limit_mb: 102400,
    max_file_size_mb: 100,
    max_files: 50000,
    features: [
      'All premium features',
      'Unlimited receipts',
      '100GB storage',
      'White-label branding',
      'Custom integrations',
      'Priority support'
    ],
    price_monthly: 99.99,
    price_yearly: 999.99
  }
]

class SubscriptionService {
  private supabase: any

  constructor(isServer = false) {
    if (isServer) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      )
    } else {
      this.supabase = createServerClient()
    }
  }

  /**
   * Get tenant's current subscription
   */
  async getTenantSubscription(tenantId: string): Promise<TenantSubscription | null> {
    try {
      // First check if we have subscription tables
      const { data: subscription, error } = await this.supabase
        .from('tenant_subscriptions')
        .select(`
          tenant_id,
          tier_id,
          status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          subscription_tiers (
            id,
            name,
            storage_limit_mb,
            max_file_size_mb,
            max_files,
            features,
            price_monthly,
            price_yearly
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .single()

      if (error) {
        // If no subscription table or no active subscription, return free tier
        console.log('No active subscription found, defaulting to free tier:', error.message)
        return {
          tenant_id: tenantId,
          tier_id: 'free',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
          tier: DEFAULT_TIERS[0] // Free tier
        }
      }

      return {
        tenant_id: subscription.tenant_id,
        tier_id: subscription.tier_id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        tier: subscription.subscription_tiers || DEFAULT_TIERS.find(t => t.id === subscription.tier_id) || DEFAULT_TIERS[0]
      }
    } catch (error) {
      console.error('Error getting tenant subscription:', error)
      // Return free tier on error
      return {
        tenant_id: tenantId,
        tier_id: 'free',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        tier: DEFAULT_TIERS[0]
      }
    }
  }

  /**
   * Get subscription tier by ID
   */
  async getSubscriptionTier(tierId: string): Promise<SubscriptionTier | null> {
    try {
      // First try to get from database
      const { data: tier, error } = await this.supabase
        .from('subscription_tiers')
        .select('*')
        .eq('id', tierId)
        .single()

      if (tier) {
        return tier
      }

      // Fallback to default tiers
      return DEFAULT_TIERS.find(t => t.id === tierId) || null
    } catch (error) {
      console.error('Error getting subscription tier:', error)
      // Fallback to default tiers
      return DEFAULT_TIERS.find(t => t.id === tierId) || null
    }
  }

  /**
   * Check if tenant can upload file based on subscription limits
   */
  async canUploadFile(
    tenantId: string,
    fileSize: number,
    currentStorageUsed: number = 0,
    currentFileCount: number = 0
  ): Promise<{
    allowed: boolean
    reason?: string
    subscription: TenantSubscription | null
  }> {
    try {
      const subscription = await this.getTenantSubscription(tenantId)
      if (!subscription) {
        return { allowed: false, reason: 'No subscription found', subscription: null }
      }

      const tier = subscription.tier
      const maxFileSizeBytes = tier.max_file_size_mb * 1024 * 1024
      const maxStorageBytes = tier.storage_limit_mb * 1024 * 1024

      // Check file size limit
      if (fileSize > maxFileSizeBytes) {
        return {
          allowed: false,
          reason: `File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds limit of ${tier.max_file_size_mb}MB for ${tier.name} plan`,
          subscription
        }
      }

      // Check total storage limit
      if (currentStorageUsed + fileSize > maxStorageBytes) {
        return {
          allowed: false,
          reason: `Adding this file would exceed storage limit of ${tier.storage_limit_mb}MB for ${tier.name} plan`,
          subscription
        }
      }

      // Check file count limit
      if (currentFileCount >= tier.max_files) {
        return {
          allowed: false,
          reason: `File count limit of ${tier.max_files} files exceeded for ${tier.name} plan`,
          subscription
        }
      }

      return { allowed: true, subscription }
    } catch (error) {
      console.error('Error checking upload permissions:', error)
      return { allowed: false, reason: 'Error checking permissions', subscription: null }
    }
  }

  /**
   * Get all available subscription tiers
   */
  async getAllTiers(): Promise<SubscriptionTier[]> {
    try {
      const { data: tiers, error } = await this.supabase
        .from('subscription_tiers')
        .select('*')
        .order('price_monthly', { ascending: true })

      if (error || !tiers || tiers.length === 0) {
        console.log('Using default subscription tiers')
        return DEFAULT_TIERS
      }

      return tiers
    } catch (error) {
      console.error('Error getting subscription tiers:', error)
      return DEFAULT_TIERS
    }
  }

  /**
   * Update tenant subscription (for plan changes)
   */
  async updateTenantSubscription(
    tenantId: string,
    tierId: string,
    status: 'active' | 'canceled' | 'past_due' | 'trialing' = 'active'
  ): Promise<boolean> {
    try {
      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

      const { error } = await this.supabase
        .from('tenant_subscriptions')
        .upsert({
          tenant_id: tenantId,
          tier_id: tierId,
          status,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          updated_at: now.toISOString()
        })

      if (error) {
        console.error('Error updating subscription:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating tenant subscription:', error)
      return false
    }
  }

  /**
   * Get usage statistics for a tenant
   */
  async getTenantUsage(tenantId: string): Promise<{
    storageUsed: number
    fileCount: number
    receipts: number
    invoices: number
    lastUpdated: string
  }> {
    try {
      // Get file counts from database
      const { data: receiptCount } = await this.supabase
        .from('receipt')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId)

      const { data: invoiceCount } = await this.supabase
        .from('invoice')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId)

      // For storage usage, we'll need to implement this based on file metadata
      // This is a simplified version - in production you might want to cache this
      let storageUsed = 0
      let totalFiles = 0

      // Get receipt storage usage
      const { data: receipts } = await this.supabase
        .from('receipt')
        .select('file_metadata')
        .eq('tenant_id', tenantId)
        .not('file_metadata', 'is', null)

      if (receipts) {
        receipts.forEach(receipt => {
          if (receipt.file_metadata?.size) {
            storageUsed += receipt.file_metadata.size
            totalFiles += 1
          }
        })
      }

      // Get invoice storage usage
      const { data: invoices } = await this.supabase
        .from('invoice')
        .select('attachment_metadata')
        .eq('tenant_id', tenantId)
        .not('attachment_metadata', 'is', null)

      if (invoices) {
        invoices.forEach(invoice => {
          if (invoice.attachment_metadata?.size) {
            storageUsed += invoice.attachment_metadata.size
            totalFiles += 1
          }
        })
      }

      return {
        storageUsed,
        fileCount: totalFiles,
        receipts: receiptCount?.length || 0,
        invoices: invoiceCount?.length || 0,
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error getting tenant usage:', error)
      return {
        storageUsed: 0,
        fileCount: 0,
        receipts: 0,
        invoices: 0,
        lastUpdated: new Date().toISOString()
      }
    }
  }
}

// Export singleton instances
export const serverSubscriptionService = new SubscriptionService(true)
export const clientSubscriptionService = new SubscriptionService(false)

export default SubscriptionService