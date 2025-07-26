import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, canModifyRecord } from "./permissions-server";
import { Permission } from "./permissions";

export interface AuthenticatedContext {
  user: {
    id: string;
    email: string;
  };
  membership: {
    tenant_id: string;
    role: string;
  };
}

/**
 * Middleware to authenticate user and get tenant context
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, context: AuthenticatedContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant membership
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 });
    }

    // Create context
    const context: AuthenticatedContext = {
      user: {
        id: user.id,
        email: user.email || ''
      },
      membership
    };

    return handler(request, context);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Middleware to check if user has required permission
 */
export function withPermission(permission: Permission) {
  return async function (
    request: NextRequest,
    handler: (req: NextRequest, context: AuthenticatedContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return withAuth(request, async (req, context) => {
      const allowed = await hasPermission(
        context.user.id,
        context.membership.tenant_id,
        permission
      );

      if (!allowed) {
        return NextResponse.json(
          { 
            error: 'Forbidden',
            message: `Permission '${permission}' required`
          }, 
          { status: 403 }
        );
      }

      return handler(req, context);
    });
  };
}

/**
 * Middleware to check if user can modify a specific record
 */
export function withRecordOwnership(
  resource: string,
  getRecordCreatedBy: (req: NextRequest, context: AuthenticatedContext) => Promise<string | null>
) {
  return async function (
    request: NextRequest,
    handler: (req: NextRequest, context: AuthenticatedContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return withAuth(request, async (req, context) => {
      const recordCreatedBy = await getRecordCreatedBy(req, context);
      
      const canModify = await canModifyRecord(
        context.user.id,
        context.membership.tenant_id,
        recordCreatedBy,
        resource
      );

      if (!canModify) {
        return NextResponse.json(
          { 
            error: 'Forbidden',
            message: `You can only modify your own ${resource} records`
          }, 
          { status: 403 }
        );
      }

      return handler(req, context);
    });
  };
}

/**
 * Middleware to check minimum role level
 */
export function withMinimumRole(roles: string[]) {
  return async function (
    request: NextRequest,
    handler: (req: NextRequest, context: AuthenticatedContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return withAuth(request, async (req, context) => {
      if (!roles.includes(context.membership.role)) {
        return NextResponse.json(
          { 
            error: 'Forbidden',
            message: `Minimum role required: ${roles.join(' or ')}`
          }, 
          { status: 403 }
        );
      }

      return handler(req, context);
    });
  };
}

/**
 * Helper to combine multiple middleware functions
 */
export function compose<T>(...middlewares: Array<(arg: T) => T>): (arg: T) => T {
  return (arg: T) => middlewares.reduce((acc, middleware) => middleware(acc), arg);
}

/**
 * Utility to extract resource ID from URL params
 */
export function getResourceId(request: NextRequest, paramName: string = 'id'): string | null {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  
  // Find the segment after the parameter name in the URL
  // For example: /api/receipts/[id] -> get the ID segment
  const paramIndex = pathSegments.findIndex(segment => segment === paramName || segment.includes('['));
  
  if (paramIndex >= 0 && paramIndex < pathSegments.length - 1) {
    return pathSegments[paramIndex + 1];
  }
  
  return null;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  code?: string
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}