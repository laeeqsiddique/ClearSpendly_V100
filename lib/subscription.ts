import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryTenant } from "@/lib/tenant";

export type SubscriptionDetails = {
  id: string;
  productId: string;
  status: string;
  amount: number;
  currency: string;
  recurringInterval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  organizationId: string | null;
};

export type SubscriptionDetailsResult = {
  hasSubscription: boolean;
  subscription?: SubscriptionDetails;
  error?: string;
  errorType?: "CANCELED" | "EXPIRED" | "GENERAL";
};

export async function getSubscriptionDetails(): Promise<SubscriptionDetailsResult> {
  try {
    const user = await getUser();

    if (!user?.id) {
      return { hasSubscription: false };
    }

    // Get user's primary tenant
    const tenant = await getPrimaryTenant();
    if (!tenant) {
      return { hasSubscription: false };
    }

    // Check if user has an active subscription
    const hasActiveSubscription = tenant.subscription_status === 'active' || 
                                 tenant.subscription_status === 'trialing';

    if (hasActiveSubscription) {
      return {
        hasSubscription: true,
        subscription: {
          id: tenant.polar_subscription_id || 'mock-subscription-id',
          productId: 'pro',
          status: tenant.subscription_status,
          amount: 1500, // $15.00 in cents
          currency: 'usd',
          recurringInterval: 'month',
          currentPeriodStart: new Date(),
          currentPeriodEnd: tenant.subscription_current_period_end ? 
            new Date(tenant.subscription_current_period_end) : 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: false,
          canceledAt: null,
          organizationId: tenant.id,
        }
      };
    }

    return { hasSubscription: false };

  } catch (error) {
    console.error("Error fetching subscription details:", error);
    return {
      hasSubscription: false,
      error: "Failed to load subscription details",
      errorType: "GENERAL",
    };
  }
}

// Simple helper to check if user has an active subscription
export async function isUserSubscribed(): Promise<boolean> {
  const result = await getSubscriptionDetails();
  return result.hasSubscription && result.subscription?.status === "active";
}

// Helper to check if user has access to a specific product/tier
export async function hasAccessToProduct(productId: string): Promise<boolean> {
  const result = await getSubscriptionDetails();
  return (
    result.hasSubscription &&
    result.subscription?.status === "active" &&
    result.subscription?.productId === productId
  );
}

// Helper to get user's current subscription status
export async function getUserSubscriptionStatus(): Promise<"active" | "canceled" | "expired" | "none"> {
  const result = await getSubscriptionDetails();
  
  if (!result.hasSubscription) {
    return "none";
  }
  
  if (result.subscription?.status === "active") {
    return "active";
  }
  
  if (result.errorType === "CANCELED") {
    return "canceled";
  }
  
  if (result.errorType === "EXPIRED") {
    return "expired";
  }
  
  return "none";
}