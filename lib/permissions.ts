// Note: This file contains both server and client-side permission functions
// Server functions use server client, client functions use fetch API

// Permission matrix defining what each role can do
export const PERMISSIONS = {
  owner: ['*'], // All permissions - owners have unrestricted access
  admin: [
    // Receipt management
    'receipts:create', 'receipts:edit', 'receipts:delete', 'receipts:view', 'receipts:export',
    // Invoice management  
    'invoices:create', 'invoices:edit', 'invoices:delete', 'invoices:view', 'invoices:send', 'invoices:export',
    // Payment management
    'payments:create', 'payments:edit', 'payments:delete', 'payments:view', 'payments:export',
    // Mileage management
    'mileage:create', 'mileage:edit', 'mileage:delete', 'mileage:view', 'mileage:export',
    // Team management
    'team:invite', 'team:manage', 'team:view', 'team:remove',
    // Reports and analytics
    'reports:view', 'analytics:view', 'exports:create',
    // Tag and category management
    'tags:create', 'tags:edit', 'tags:delete', 'tags:view',
    // Business settings
    'settings:view', 'settings:edit',
    // Tenant management (admin level)
    'tenant:view', 'tenant:edit'
  ],
  member: [
    // Can create and edit own records, view all for collaboration
    'receipts:create', 'receipts:edit:own', 'receipts:view:own', 'receipts:view',
    'invoices:create', 'invoices:edit:own', 'invoices:view:own', 'invoices:view', 'invoices:send:own',
    'payments:create', 'payments:edit:own', 'payments:view:own', 'payments:view',
    'mileage:create', 'mileage:edit:own', 'mileage:view:own', 'mileage:view',
    // View team but cannot manage
    'team:view',
    // Limited reports - own data and team summaries
    'reports:view:own', 'reports:view:summary', 'analytics:view:own',
    // Can create and view tags but not edit/delete others' tags
    'tags:create', 'tags:view',
    // Can view own settings only
    'settings:view:own'
  ],
  viewer: [
    // Read-only access to data
    'receipts:view', 'invoices:view', 'payments:view', 'mileage:view',
    'team:view', 'reports:view', 'analytics:view', 'tags:view', 
    'settings:view:own'
  ]
} as const;

// Type definitions
export type Role = keyof typeof PERMISSIONS;
export type Permission = string;

interface Membership {
  role: Role;
  user_id: string;
  tenant_id: string;
}

/**
 * Check if a specific role has a permission
 */
export function checkPermission(role: Role, permission: Permission): boolean {
  const rolePermissions = PERMISSIONS[role];
  
  // Owner has all permissions
  if (rolePermissions.includes('*')) {
    return true;
  }
  
  // Check for exact permission match
  if (rolePermissions.includes(permission)) {
    return true;
  }
  
  // Check for wildcard permissions (e.g., 'receipts:*' matches 'receipts:create')
  const permissionParts = permission.split(':');
  const wildcardPermission = `${permissionParts[0]}:*`;
  if (rolePermissions.includes(wildcardPermission)) {
    return true;
  }
  
  return false;
}

// Server-side permission functions have been moved to permissions-server.ts
// to avoid importing server-only modules in client components

/**
 * Get user's role level for comparison
 */
export function getRoleLevel(role: Role): number {
  const roleLevels = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1
  };
  
  return roleLevels[role] || 0;
}

// hasMinimumRole moved to permissions-server.ts