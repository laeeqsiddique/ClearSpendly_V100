import { createClient } from '@/lib/supabase/server'
import { createDefaultCategoriesAndTags } from '@/lib/default-categories'

export interface Tenant {
  id: string
  name: string
  slug: string
  subscription_status: string
  subscription_plan: string
  privacy_mode: boolean
  logo_url?: string
  settings: any
  created_at: string
  updated_at: string
}

export interface Membership {
  id: string
  user_id: string
  tenant_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
  updated_at: string
}

export interface TenantWithMembership extends Tenant {
  membership: Membership
}

// Get current user's tenants
export async function getUserTenants(): Promise<TenantWithMembership[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('membership')
    .select(`
      *,
      tenant:tenant_id (*)
    `)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching user tenants:', error)
    return []
  }

  return data?.map(membership => ({
    ...membership.tenant,
    membership: {
      id: membership.id,
      user_id: membership.user_id,
      tenant_id: membership.tenant_id,
      role: membership.role,
      created_at: membership.created_at,
      updated_at: membership.updated_at
    }
  })) || []
}

// Get specific tenant by ID
export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tenant')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching tenant:', error)
    return null
  }

  return data
}

// Create a new tenant and add the user as owner
export async function createTenant(name: string, slug: string): Promise<Tenant | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Start a transaction
  const { data: tenant, error: tenantError } = await supabase
    .from('tenant')
    .insert({
      name,
      slug,
      subscription_status: 'active',
      subscription_plan: 'free',
      privacy_mode: false,
      settings: {}
    })
    .select()
    .single()

  if (tenantError) {
    console.error('Error creating tenant:', tenantError)
    return null
  }

  // Add user as owner
  const { error: membershipError } = await supabase
    .from('membership')
    .insert({
      user_id: user.id,
      tenant_id: tenant.id,
      role: 'owner'
    })

  if (membershipError) {
    console.error('Error creating membership:', membershipError)
    // Clean up tenant if membership creation fails
    await supabase.from('tenant').delete().eq('id', tenant.id)
    return null
  }

  // Create default categories and tags for the new tenant
  const defaultsCreated = await createDefaultCategoriesAndTags(tenant.id)
  if (!defaultsCreated) {
    console.warn('Failed to create default categories and tags for tenant:', tenant.id)
    // Don't fail tenant creation if defaults fail, but log the issue
  }

  return tenant
}

// Generate a unique slug from tenant name
export function generateTenantSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Check if slug is available
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tenant')
    .select('id')
    .eq('slug', slug)
    .single()

  return !data && !error
}

// Get user's primary tenant (first one they joined)
export async function getPrimaryTenant(): Promise<TenantWithMembership | null> {
  const tenants = await getUserTenants()
  return tenants.length > 0 ? tenants[0] : null
}

// Update tenant subscription
export async function updateTenantSubscription(
  tenantId: string, 
  status: string,
  plan: string
): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('tenant')
    .update({
      subscription_status: status,
      subscription_plan: plan
    })
    .eq('id', tenantId)

  if (error) {
    console.error('Error updating tenant subscription:', error)
    return false
  }

  return true
}