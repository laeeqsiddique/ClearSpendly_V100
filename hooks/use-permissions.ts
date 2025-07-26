"use client";

import { useState, useEffect } from 'react';
import { checkPermission, Permission, Role } from '@/lib/permissions';

interface UserContext {
  userId: string;
  tenantId: string;
  role: Role;
}

/**
 * Hook to check if current user has a specific permission
 */
export function usePermission(permission: Permission) {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userContext, setUserContext] = useState<UserContext | null>(null);

  useEffect(() => {
    async function fetchUserContext() {
      try {
        // In a real app, this would get user context from auth provider or API
        // For now, we'll mock it or get it from a context provider
        const response = await fetch('/api/user/context');
        
        if (response.ok) {
          const context = await response.json();
          setUserContext(context);
          
          // Check permission using the role
          const allowed = checkPermission(context.role, permission);
          setHasPermission(allowed);
        }
      } catch (error) {
        console.error('Error fetching user context:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    }

    fetchUserContext();
  }, [permission]);

  return { hasPermission, loading, userContext };
}

/**
 * Hook to check multiple permissions
 */
export function usePermissions(permissions: Permission[]) {
  const [permissionMap, setPermissionMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const response = await fetch('/api/user/context');
        
        if (response.ok) {
          const context = await response.json();
          
          const map: Record<string, boolean> = {};
          permissions.forEach(permission => {
            map[permission] = checkPermission(context.role, permission);
          });
          
          setPermissionMap(map);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        // Set all permissions to false on error
        const map: Record<string, boolean> = {};
        permissions.forEach(permission => {
          map[permission] = false;
        });
        setPermissionMap(map);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, [permissions.join(',')]);

  return { permissions: permissionMap, loading };
}

/**
 * Hook to check if user has minimum role level
 */
export function useMinimumRole(requiredRole: Role) {
  const [hasMinimumRole, setHasMinimumRole] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<Role | null>(null);

  useEffect(() => {
    async function checkRole() {
      try {
        const response = await fetch('/api/user/context');
        
        if (response.ok) {
          const context = await response.json();
          setUserRole(context.role);
          
          const roleLevels: Record<Role, number> = {
            owner: 4,
            admin: 3,
            member: 2,
            viewer: 1
          };
          
          const userLevel = roleLevels[context.role] || 0;
          const requiredLevel = roleLevels[requiredRole] || 0;
          
          setHasMinimumRole(userLevel >= requiredLevel);
        }
      } catch (error) {
        console.error('Error checking role:', error);
        setHasMinimumRole(false);
      } finally {
        setLoading(false);
      }
    }

    checkRole();
  }, [requiredRole]);

  return { hasMinimumRole, loading, userRole };
}

/**
 * Component to conditionally render based on permissions
 */
interface PermissionGateProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

export function PermissionGate({ 
  permission, 
  children, 
  fallback = null, 
  loading: loadingComponent = null 
}: PermissionGateProps) {
  const { hasPermission, loading } = usePermission(permission);

  if (loading) {
    return loadingComponent;
  }

  if (!hasPermission) {
    return fallback;
  }

  return children;
}

/**
 * Component to conditionally render based on minimum role
 */
interface RoleGateProps {
  minimumRole: Role;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

export function RoleGate({ 
  minimumRole, 
  children, 
  fallback = null, 
  loading: loadingComponent = null 
}: RoleGateProps) {
  const { hasMinimumRole, loading } = useMinimumRole(minimumRole);

  if (loading) {
    return loadingComponent;
  }

  if (!hasMinimumRole) {
    return fallback;
  }

  return children;
}