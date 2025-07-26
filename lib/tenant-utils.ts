import { createClient } from '@/lib/supabase/server';

/**
 * Get user's plan/subscription level
 * TODO: Replace with actual plan detection from billing/subscription system
 */
async function getUserPlan(userId: string): Promise<'free' | 'pro' | 'enterprise'> {
  // For now, return 'enterprise' for testing team features
  // In a real implementation, this would query the user's subscription
  return 'enterprise';
}

/**
 * Check if user's plan supports team features
 */
function planSupportsTeamFeatures(plan: string): boolean {
  return plan === 'enterprise'; // Only enterprise plan supports teams
}

/**
 * Check if a tenant has multiple users (team functionality needed)
 */
export async function isMultiUserTenant(
  tenantId: string, 
  includeTestMode: boolean = false
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // In test mode (development), also count pending users to allow testing multi-user features
    const statuses = includeTestMode 
      ? ['accepted', 'pending'] 
      : ['accepted'];
    
    const { count, error } = await supabase
      .from('membership')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('invitation_status', statuses);
    
    if (error) {
      console.error('Error checking tenant user count:', error);
      return false; // Default to single-user if error
    }
    
    return (count || 0) > 1;
  } catch (error) {
    console.error('Error in isMultiUserTenant:', error);
    return false; // Default to single-user if error
  }
}

/**
 * Get tenant member count
 */
export async function getTenantMemberCount(
  tenantId: string, 
  includeTestMode: boolean = false
): Promise<number> {
  try {
    const supabase = await createClient();
    
    // In test mode (development), also count pending users to allow testing multi-user features
    const statuses = includeTestMode 
      ? ['accepted', 'pending'] 
      : ['accepted'];
    
    const { count, error } = await supabase
      .from('membership')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('invitation_status', statuses);
    
    if (error) {
      console.error('Error getting tenant member count:', error);
      return 1; // Default to 1 if error
    }
    
    return count || 1;
  } catch (error) {
    console.error('Error in getTenantMemberCount:', error);
    return 1; // Default to 1 if error
  }
}

/**
 * Check if current user should see team features (plan-based)
 */
export async function shouldShowTeamFeatures(
  userId: string, 
  tenantId: string,
  includeTestMode: boolean = false
): Promise<{
  showTeamFeatures: boolean;
  isMultiUser: boolean;
  memberCount: number;
  userRole: string;
  userPlan: string;
}> {
  try {
    const supabase = await createClient();
    
    // Get user's role and membership info
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (membershipError || !membership) {
      return {
        showTeamFeatures: false,
        isMultiUser: false,
        memberCount: 1,
        userRole: 'unknown',
        userPlan: 'free'
      };
    }
    
    // Get user's plan
    const userPlan = await getUserPlan(userId);
    
    // Get tenant member count (with optional test mode)
    const memberCount = await getTenantMemberCount(tenantId, includeTestMode);
    const isMultiUser = memberCount > 1;
    
    // Show team features if:
    // 1. User's plan supports teams (not free plan)
    // 2. User can manage team (owner/admin role)
    const canManageTeam = ['owner', 'admin'].includes(membership.role);
    const showTeamFeatures = planSupportsTeamFeatures(userPlan) && canManageTeam;
    
    return {
      showTeamFeatures,
      isMultiUser,
      memberCount,
      userRole: membership.role,
      userPlan
    };
  } catch (error) {
    console.error('Error in shouldShowTeamFeatures:', error);
    return {
      showTeamFeatures: false,
      isMultiUser: false,
      memberCount: 1,
      userRole: 'unknown',
      userPlan: 'free'
    };
  }
}

/**
 * Get team context for UI components
 */
export interface TeamContext {
  isMultiUser: boolean;
  memberCount: number;
  userRole: string;
  userPlan: string;
  showTeamFeatures: boolean;
  showUserFiltering: boolean; // Whether to show "My Data" toggles
  showCreatedBy: boolean;     // Whether to show "Created by" columns
}

export async function getTeamContext(
  userId: string, 
  tenantId: string,
  includeTestMode: boolean = false
): Promise<TeamContext> {
  const teamInfo = await shouldShowTeamFeatures(userId, tenantId, includeTestMode);
  
  return {
    isMultiUser: teamInfo.isMultiUser,
    memberCount: teamInfo.memberCount,
    userRole: teamInfo.userRole,
    userPlan: teamInfo.userPlan,
    showTeamFeatures: teamInfo.showTeamFeatures,
    // Show filtering options for owners/admins in multi-user tenants
    showUserFiltering: teamInfo.isMultiUser && ['owner', 'admin'].includes(teamInfo.userRole),
    // Show created by info in multi-user tenants
    showCreatedBy: teamInfo.isMultiUser
  };
}