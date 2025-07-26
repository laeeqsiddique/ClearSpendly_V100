"use client";

import { useState, useEffect } from 'react';

export interface TeamContext {
  isMultiUser: boolean;
  memberCount: number;
  userRole: string;
  userPlan: string;
  showTeamFeatures: boolean;
  showUserFiltering: boolean;
  showCreatedBy: boolean;
  loading: boolean;
}

/**
 * Hook to get team context for conditional UI rendering
 */
export function useTeamContext(enableTestMode: boolean = false): TeamContext {
  const [context, setContext] = useState<TeamContext>({
    isMultiUser: false,
    memberCount: 1,
    userRole: 'unknown',
    userPlan: 'free',
    showTeamFeatures: false,
    showUserFiltering: false,
    showCreatedBy: false,
    loading: true
  });

  useEffect(() => {
    async function fetchTeamContext() {
      try {
        // Add test mode parameter if enabled (for team-test page)
        const url = enableTestMode 
          ? '/api/team/context?test_mode=true'
          : '/api/team/context';
          
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          setContext({
            ...data,
            loading: false
          });
        } else {
          // Default to single-user if API fails
          setContext(prev => ({
            ...prev,
            loading: false
          }));
        }
      } catch (error) {
        console.error('Error fetching team context:', error);
        // Default to single-user if error
        setContext(prev => ({
          ...prev,
          loading: false
        }));
      }
    }

    fetchTeamContext();
  }, [enableTestMode]);

  return context;
}

/**
 * Component wrapper that only renders children for multi-user tenants
 */
interface MultiUserGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

export function MultiUserGate({ 
  children, 
  fallback = null, 
  loading: loadingComponent = null 
}: MultiUserGateProps) {
  const { isMultiUser, loading } = useTeamContext();

  if (loading) {
    return loadingComponent;
  }

  if (!isMultiUser) {
    return fallback;
  }

  return children;
}

/**
 * Component wrapper that only renders children when team features should be shown
 */
interface TeamFeatureGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

export function TeamFeatureGate({ 
  children, 
  fallback = null, 
  loading: loadingComponent = null 
}: TeamFeatureGateProps) {
  const { showTeamFeatures, loading } = useTeamContext();

  if (loading) {
    return loadingComponent;
  }

  if (!showTeamFeatures) {
    return fallback;
  }

  return children;
}