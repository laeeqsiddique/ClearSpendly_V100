import { createClient } from '@/lib/supabase/server';
import { checkPermission, getRoleLevel, type Permission, type Role } from './permissions';

interface Membership {
  role: Role;
  user_id: string;
  tenant_id: string;
}

/**
 * Get user membership for tenant (server-side only)
 */
async function getUserMembership(userId: string, tenantId: string): Promise<Membership | null> {
  try {
    const supabase = await createClient();
    
    const { data: membership, error } = await supabase
      .from('membership')
      .select('role, user_id, tenant_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error || !membership) {
      return null;
    }
    
    return membership as Membership;
  } catch (error) {
    console.error('Error getting user membership:', error);
    return null;
  }
}

/**
 * Check if a user has a specific permission (server-side only)
 */
export async function hasPermission(
  userId: string,
  tenantId: string,
  permission: Permission
): Promise<boolean> {
  try {
    const membership = await getUserMembership(userId, tenantId);
    
    if (!membership) {
      return false;
    }
    
    return checkPermission(membership.role, permission);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Check if user can modify a specific record (server-side only)
 */
export async function canModifyRecord(
  userId: string,
  tenantId: string,
  recordCreatedBy: string | null,
  resource: string
): Promise<boolean> {
  try {
    const membership = await getUserMembership(userId, tenantId);
    
    if (!membership) {
      return false;
    }
    
    // Owners and admins can modify any record
    if (membership.role === 'owner' || membership.role === 'admin') {
      return true;
    }
    
    // Members can only modify their own records
    if (membership.role === 'member') {
      // Check if they have the :own permission for this resource
      const ownPermission = `${resource}:edit:own`;
      if (checkPermission(membership.role, ownPermission) && recordCreatedBy === userId) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking record modification permission:', error);
    return false;
  }
}

/**
 * Require permission or throw an error (server-side only)
 */
export async function requirePermission(
  userId: string,
  tenantId: string,
  permission: Permission
): Promise<void> {
  const allowed = await hasPermission(userId, tenantId, permission);
  
  if (!allowed) {
    throw new Error(`Access denied: Permission '${permission}' required`);
  }
}

/**
 * Get all permissions for a user's role (server-side only)
 */
export async function getUserPermissions(
  userId: string,
  tenantId: string
): Promise<Permission[]> {
  try {
    const membership = await getUserMembership(userId, tenantId);
    
    if (!membership) {
      return [];
    }
    
    const { PERMISSIONS } = await import('./permissions');
    return PERMISSIONS[membership.role];
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Helper to check multiple permissions (user needs at least one) (server-side only)
 */
export async function hasAnyPermission(
  userId: string,
  tenantId: string,
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(userId, tenantId, permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Helper to check multiple permissions (user needs all of them) (server-side only)
 */
export async function hasAllPermissions(
  userId: string,
  tenantId: string,
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(userId, tenantId, permission))) {
      return false;
    }
  }
  return true;
}

/**
 * Check if user's role is at least the required level (server-side only)
 */
export async function hasMinimumRole(
  userId: string,
  tenantId: string,
  requiredRole: Role
): Promise<boolean> {
  try {
    const membership = await getUserMembership(userId, tenantId);
    
    if (!membership) {
      return false;
    }
    
    const userLevel = getRoleLevel(membership.role);
    const requiredLevel = getRoleLevel(requiredRole);
    
    return userLevel >= requiredLevel;
  } catch (error) {
    console.error('Error checking minimum role:', error);
    return false;
  }
}