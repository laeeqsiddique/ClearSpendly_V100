import { NextRequest, NextResponse } from 'next/server';
import { hasPermission, canModifyRecord, requirePermission } from './permissions-server';
import { type Permission } from './permissions';

/**
 * Context interface for permission middleware
 */
interface PermissionContext {
  user: {
    id: string;
    email: string;
  };
  tenant: {
    id: string;
    name: string;
  };
  membership: {
    role: string;
    user_id: string;
    tenant_id: string;
  };
}

/**
 * Permission middleware that can be combined with existing auth middleware
 */
export function withPermission(permission: Permission) {
  return function(req: NextRequest, handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>) {
    return async function(request: NextRequest, context: PermissionContext) {
      try {
        // Check if user has the required permission
        const hasAccess = await hasPermission(context.user.id, context.tenant.id, permission);
        
        if (!hasAccess) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Forbidden', 
              message: `Permission '${permission}' required for this action`,
              requiredPermission: permission,
              userRole: context.membership.role
            }, 
            { status: 403 }
          );
        }
        
        // User has permission, proceed to handler
        return await handler(request, context);
      } catch (error) {
        console.error('Permission middleware error:', error);
        return NextResponse.json(
          { 
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to check permissions'
          }, 
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Resource-specific permission middleware for edit/delete operations
 * Checks if user can modify a specific record they don't own
 */
export function withResourcePermission(resource: string, getResourceOwnerId?: (request: NextRequest, context: PermissionContext) => Promise<string | null>) {
  return function(req: NextRequest, handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>) {
    return async function(request: NextRequest, context: PermissionContext) {
      try {
        // If no resource owner check function provided, just check general edit permission
        if (!getResourceOwnerId) {
          const editPermission = `${resource}:edit`;
          const hasAccess = await hasPermission(context.user.id, context.tenant.id, editPermission);
          
          if (!hasAccess) {
            return NextResponse.json(
              { 
                success: false,
                error: 'Forbidden', 
                message: `Permission '${editPermission}' required`,
                userRole: context.membership.role
              }, 
              { status: 403 }
            );
          }
          
          return await handler(request, context);
        }
        
        // Get the resource owner ID
        const resourceOwnerId = await getResourceOwnerId(request, context);
        
        // Check if user can modify this specific record
        const canModify = await canModifyRecord(
          context.user.id, 
          context.tenant.id, 
          resourceOwnerId, 
          resource
        );
        
        if (!canModify) {
          const isOwnRecord = resourceOwnerId === context.user.id;
          const message = isOwnRecord 
            ? `You don't have permission to edit your own ${resource} records`
            : `You can only edit your own ${resource} records`;
            
          return NextResponse.json(
            { 
              success: false,
              error: 'Forbidden', 
              message,
              userRole: context.membership.role,
              isOwnRecord
            }, 
            { status: 403 }
          );
        }
        
        return await handler(request, context);
      } catch (error) {
        console.error('Resource permission middleware error:', error);
        return NextResponse.json(
          { 
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to check resource permissions'
          }, 
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Multiple permissions middleware (user needs ANY of the permissions)
 */
export function withAnyPermission(permissions: Permission[]) {
  return function(req: NextRequest, handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>) {
    return async function(request: NextRequest, context: PermissionContext) {
      try {
        // Check if user has any of the required permissions
        let hasAccess = false;
        for (const permission of permissions) {
          if (await hasPermission(context.user.id, context.tenant.id, permission)) {
            hasAccess = true;
            break;
          }
        }
        
        if (!hasAccess) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Forbidden', 
              message: `One of these permissions required: ${permissions.join(', ')}`,
              requiredPermissions: permissions,
              userRole: context.membership.role
            }, 
            { status: 403 }
          );
        }
        
        return await handler(request, context);
      } catch (error) {
        console.error('Any permission middleware error:', error);
        return NextResponse.json(
          { 
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to check permissions'
          }, 
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Multiple permissions middleware (user needs ALL of the permissions)
 */
export function withAllPermissions(permissions: Permission[]) {
  return function(req: NextRequest, handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>) {
    return async function(request: NextRequest, context: PermissionContext) {
      try {
        // Check if user has all required permissions
        for (const permission of permissions) {
          const hasAccess = await hasPermission(context.user.id, context.tenant.id, permission);
          if (!hasAccess) {
            return NextResponse.json(
              { 
                success: false,
                error: 'Forbidden', 
                message: `All of these permissions required: ${permissions.join(', ')}`,
                requiredPermissions: permissions,
                userRole: context.membership.role,
                missingPermission: permission
              }, 
              { status: 403 }
            );
          }
        }
        
        return await handler(request, context);
      } catch (error) {
        console.error('All permissions middleware error:', error);
        return NextResponse.json(
          { 
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to check permissions'
          }, 
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Role-based middleware (user needs minimum role level)
 */
export function withMinimumRole(requiredRole: 'owner' | 'admin' | 'member' | 'viewer') {
  return function(req: NextRequest, handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>) {
    return async function(request: NextRequest, context: PermissionContext) {
      try {
        const { hasMinimumRole } = await import('./permissions-server');
        const hasAccess = await hasMinimumRole(context.user.id, context.tenant.id, requiredRole);
        
        if (!hasAccess) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Forbidden', 
              message: `Minimum role '${requiredRole}' required`,
              requiredRole,
              userRole: context.membership.role
            }, 
            { status: 403 }
          );
        }
        
        return await handler(request, context);
      } catch (error) {
        console.error('Role middleware error:', error);
        return NextResponse.json(
          { 
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to check role permissions'
          }, 
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Utility function to get resource owner from URL params
 */
export function getResourceOwnerFromParams(resourceIdParam: string = 'id') {
  return async function(request: NextRequest, context: PermissionContext): Promise<string | null> {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const resourceId = pathParts[pathParts.indexOf(resourceIdParam) + 1] || pathParts[pathParts.length - 1];
      
      if (!resourceId) {
        return null;
      }
      
      // This would need to be implemented based on your specific resource tables
      // For now, return null to indicate we couldn't determine ownership
      return null;
    } catch (error) {
      console.error('Error getting resource owner from params:', error);
      return null;
    }
  };
}

/**
 * Example usage function
 */
export function createProtectedHandler() {
  return {
    // Simple permission check
    withPermission,
    
    // Resource-specific checks
    withResourcePermission,
    
    // Multiple permission variants
    withAnyPermission,
    withAllPermissions,
    
    // Role-based checks
    withMinimumRole,
    
    // Utility functions
    getResourceOwnerFromParams
  };
}