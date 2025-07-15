import { createClient } from './server'
import { Database } from './types'

type Tenant = Database['public']['Tables']['tenant']['Row']
type Membership = Database['public']['Tables']['membership']['Row']

export async function getCurrentTenant(userId: string): Promise<Tenant | null> {
  const supabase = await createClient()
  
  // Get the user's memberships
  const { data: memberships, error: membershipError } = await supabase
    .from('membership')
    .select(`
      tenant_id,
      role,
      tenant:tenant_id (
        id,
        name,
        slug,
        logo_url,
        settings,
        subscription_status,
        subscription_plan,
        privacy_mode,
        created_at,
        updated_at,
        deleted_at
      )
    `)
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (membershipError || !memberships) {
    return null
  }

  return (memberships as any).tenant
}

export async function getUserMemberships(userId: string): Promise<(Membership & { tenant: Tenant })[]> {
  const supabase = await createClient()
  
  const { data: memberships, error } = await supabase
    .from('membership')
    .select(`
      *,
      tenant:tenant_id (
        id,
        name,
        slug,
        logo_url,
        settings,
        subscription_status,
        subscription_plan,
        privacy_mode,
        created_at,
        updated_at,
        deleted_at
      )
    `)
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  return memberships as (Membership & { tenant: Tenant })[]
}

export async function getUserRole(userId: string, tenantId: string): Promise<string | null> {
  const supabase = await createClient()
  
  const { data: membership, error } = await supabase
    .from('membership')
    .select('role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    return null
  }

  return membership.role
}

export async function canUserAccessTenant(userId: string, tenantId: string): Promise<boolean> {
  const role = await getUserRole(userId, tenantId)
  return role !== null
}

export async function setTenantContext(tenantId: string) {
  const supabase = await createClient()
  
  // This will be used by RLS policies
  await supabase.rpc('set_config', {
    setting_name: 'app.current_tenant_id',
    setting_value: tenantId,
    is_local: true
  })
}