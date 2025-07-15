import { createClient } from './server'
import { Database } from './types'

type User = Database['public']['Tables']['user']['Row']

export async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return null
  }

  // Get user profile from our custom user table
  const { data: user, error } = await supabase
    .from('user')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error) {
    return null
  }

  return user
}

export async function getUserWithTenant(): Promise<(User & { tenant: Database['public']['Tables']['tenant']['Row'] }) | null> {
  const supabase = await createClient()
  
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return null
  }

  // Get user with their primary tenant
  const { data: userWithTenant, error } = await supabase
    .from('user')
    .select(`
      *,
      membership!inner (
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
      )
    `)
    .eq('id', authUser.id)
    .limit(1)
    .single()

  if (error) {
    return null
  }

  // Transform the result to match expected structure
  const membership = (userWithTenant as any).membership[0]
  const tenant = membership.tenant
  
  return {
    ...userWithTenant,
    tenant
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}

export async function requireTenant(): Promise<User & { tenant: Database['public']['Tables']['tenant']['Row'] }> {
  const userWithTenant = await getUserWithTenant()
  
  if (!userWithTenant) {
    throw new Error('Authentication and tenant access required')
  }
  
  return userWithTenant
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw error
  }
}

export async function updateProfile(userId: string, updates: Partial<User>) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}