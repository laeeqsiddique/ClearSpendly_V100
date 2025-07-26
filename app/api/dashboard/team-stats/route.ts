import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, context) => {
    try {
      // For now, return mock data with plan-based logic
      // TODO: Replace with actual user plan detection
      const userPlan = 'enterprise'; // This should come from user's subscription/plan
      
      // Mock team stats based on plan
      const planLimits = {
        free: 1,        // Free: 1 user only
        pro: 1,         // Pro: 1 user only  
        enterprise: 5   // Enterprise: 5 users by default (can be increased by customer service)
      };
      
      // In real implementation, this would come from user's custom limit set by customer service
      // TODO: Add user_limit field to tenant or user table that customer service can modify
      // Example: SELECT user_limit FROM tenant WHERE id = ? (defaults to plan limit if NULL)
      // For now, use default plan limit
      const planLimit = planLimits[userPlan as keyof typeof planLimits] || 1;
      
      // In a real implementation, this would query the membership table
      // For now, return realistic data showing current state
      const teamStats = {
        totalMembers: 2, // Current: owner + 1 pending user
        activeMembers: 1, // Only owner is active 
        pendingInvitations: 1, // 1 pending invitation
        planLimit: planLimit,
        change: 0 // No change from previous period
      };

      return NextResponse.json({
        success: true,
        data: teamStats
      });
    } catch (error) {
      console.error('Error fetching team stats:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch team stats' },
        { status: 500 }
      );
    }
  });
}