import { createClient } from '@/lib/supabase/server'
import { getApiTenantContext, type ApiTenantContext } from '@/lib/api-tenant'

export interface UserContextInfo {
  userId: string
  tenantId: string
  role: string
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

/**
 * Get the current user context with full user information
 * This extends the existing tenant context with detailed user info
 */
export async function getCurrentUserContext(): Promise<UserContextInfo | null> {
  try {
    // Use the existing tenant context system
    const tenantContext = await getApiTenantContext()
    
    if (!tenantContext) {
      return null
    }
    
    const supabase = await createClient()
    
    // Get detailed user information
    const { data: userInfo, error } = await supabase
      .from('user')
      .select('id, email, full_name, avatar_url')
      .eq('id', tenantContext.userId)
      .single()
    
    if (error || !userInfo) {
      console.error('Error fetching user details:', error)
      return null
    }
    
    return {
      userId: tenantContext.userId,
      tenantId: tenantContext.tenantId,
      role: tenantContext.role,
      user: userInfo
    }
  } catch (error) {
    console.error('Error getting user context:', error)
    return null
  }
}

/**
 * Get user context or throw an error if not available
 * Use this for API routes that require user authentication
 */
export async function requireUserContext(): Promise<UserContextInfo> {
  const context = await getCurrentUserContext()
  
  if (!context) {
    throw new Error('Authentication required - user must be logged in with tenant access')
  }
  
  return context
}

/**
 * Get just the current user ID for attribution fields
 * This is the most common use case for created_by/updated_by fields
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const context = await getApiTenantContext()
    return context?.userId || null
  } catch (error) {
    console.error('Error getting current user ID:', error)
    return null
  }
}

/**
 * Require user ID or throw an error
 * Use this when user attribution is mandatory
 */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    throw new Error('User authentication required for this operation')
  }
  
  return userId
}

/**
 * Helper to add user attribution to data objects
 * This makes it easy to add created_by field when creating records
 */
export async function withUserAttribution<T extends Record<string, any>>(
  data: T,
  options: { 
    includeUpdatedBy?: boolean 
    userId?: string
  } = {}
): Promise<T & { created_by: string; updated_by?: string }> {
  const userId = options.userId || await requireUserId()
  
  const result = {
    ...data,
    created_by: userId
  }
  
  if (options.includeUpdatedBy) {
    result.updated_by = userId
  }
  
  return result
}

/**
 * Helper to add updated_by attribution to update data
 * Use this when updating existing records
 */
export async function withUpdateAttribution<T extends Record<string, any>>(
  data: T,
  userId?: string
): Promise<T & { updated_by: string }> {
  const userIdToUse = userId || await requireUserId()
  
  return {
    ...data,
    updated_by: userIdToUse
  }
}

/**
 * Check if current user has permission for an action
 * Based on the role hierarchy: owner > admin > member > viewer
 */
export async function hasPermission(requiredRole: 'owner' | 'admin' | 'member' | 'viewer'): Promise<boolean> {
  try {
    const context = await getCurrentUserContext()
    
    if (!context) {
      return false
    }
    
    const roleHierarchy = {
      owner: 4,
      admin: 3,
      member: 2,
      viewer: 1
    }
    
    const userRoleLevel = roleHierarchy[context.role as keyof typeof roleHierarchy] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole]
    
    return userRoleLevel >= requiredRoleLevel
  } catch (error) {
    console.error('Error checking permissions:', error)
    return false
  }
}

/**
 * Require specific permission level or throw an error
 */
export async function requirePermission(requiredRole: 'owner' | 'admin' | 'member' | 'viewer'): Promise<void> {
  const allowed = await hasPermission(requiredRole)
  
  if (!allowed) {
    throw new Error(`Access denied: ${requiredRole} role or higher required`)
  }
}

/**
 * Check if current user can modify a specific record
 * Returns true if user is owner/admin or created the record
 */
export async function canModifyRecord(recordCreatedBy: string | null): Promise<boolean> {
  try {
    const context = await getCurrentUserContext()
    
    if (!context) {
      return false
    }
    
    // Owners and admins can modify any record
    if (context.role === 'owner' || context.role === 'admin') {
      return true
    }
    
    // Members can only modify their own records
    if (context.role === 'member' && recordCreatedBy === context.userId) {
      return true
    }
    
    // Viewers cannot modify records
    return false
  } catch (error) {
    console.error('Error checking record modification permission:', error)
    return false
  }
}

/**
 * Get user attribution data for database queries
 * Returns an object with created_by and optionally updated_by fields
 */
export async function getUserAttributionData(includeUpdatedBy: boolean = false) {
  const userId = await requireUserId()
  
  const attribution: { created_by: string; updated_by?: string } = {
    created_by: userId
  }
  
  if (includeUpdatedBy) {
    attribution.updated_by = userId
  }
  
  return attribution
}

/**
 * Legacy compatibility function
 * Maps to the existing tenant context for backward compatibility
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

/**
 * Get user membership information for the current tenant
 */
export async function getCurrentUserMembership() {
  try {
    const context = await getApiTenantContext()
    
    if (!context) {
      return null
    }
    
    const supabase = await createClient()
    
    const { data: membership, error } = await supabase
      .from('membership')
      .select(`
        id,
        role,
        permissions,
        invited_by,
        invited_at,
        accepted_at,
        created_at,
        updated_at,
        invitation_status
      `)
      .eq('user_id', context.userId)
      .eq('tenant_id', context.tenantId)
      .single()
    
    if (error) {
      console.error('Error fetching user membership:', error)
      return null
    }
    
    return membership
  } catch (error) {
    console.error('Error getting user membership:', error)
    return null
  }
}