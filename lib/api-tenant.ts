import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface ApiTenantContext {
  tenantId: string
  userId: string
  role: string
}

/**
 * Get the current tenant context for API requests
 * This function extracts the tenant ID from the logged-in user's membership
 */
export async function getApiTenantContext(): Promise<ApiTenantContext | null> {
  try {
    const supabase = await createClient()
    
    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('No authenticated user found:', authError)
      return null
    }

    // Get the user's primary tenant through membership
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select(`
        tenant_id,
        role,
        tenant:tenant_id (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (membershipError || !membership) {
      console.error('No tenant membership found for user:', user.id, membershipError)
      return null
    }

    return {
      tenantId: membership.tenant_id,
      userId: user.id,
      role: membership.role
    }
  } catch (error) {
    console.error('Error getting tenant context:', error)
    return null
  }
}

/**
 * Get tenant context or throw an error if not available
 * Use this for API routes that require tenant access
 */
export async function requireTenantContext(): Promise<ApiTenantContext> {
  const context = await getApiTenantContext()
  
  if (!context) {
    throw new Error('Tenant context required - user must be authenticated and have tenant access')
  }
  
  return context
}

/**
 * Fallback function that returns the hardcoded tenant ID for development
 * This should only be used temporarily during the transition period
 */
export function getDefaultTenantId(): string {
  // TODO: Remove this function once all authentication is properly implemented
  return '00000000-0000-0000-0000-000000000001'
}

/**
 * Get tenant ID with proper authentication required
 * No fallback - authentication must be properly implemented
 */
export async function getTenantIdWithFallback(): Promise<string> {
  const context = await requireTenantContext()
  return context.tenantId
}