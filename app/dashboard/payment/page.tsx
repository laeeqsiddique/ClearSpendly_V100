import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getSubscriptionDetails } from "@/lib/subscription";
import Link from "next/link";
import ManageSubscription from "./_components/manage-subscription";
import { 
  CreditCard, 
  Calendar, 
  Activity, 
  AlertCircle, 
  CheckCircle2,
  Receipt,
  TrendingUp,
  Zap
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { getPrimaryTenant } from "@/lib/tenant";

// Helper function to get usage stats
async function getUsageStats() {
  const user = await getUser();
  if (!user) return null;
  
  const tenant = await getPrimaryTenant();
  if (!tenant) return null;
  
  const supabase = await createClient();
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  
  // Get current month's receipt count for this tenant
  const { count } = await supabase
    .from('receipts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .gte('created_at', `${currentMonth}-01`);
  
  const limit = tenant.receipts_limit === -1 ? 'Unlimited' : tenant.receipts_limit;
  const isUnlimited = tenant.receipts_limit === -1;
  
  return {
    currentUsage: count || 0,
    limit: limit,
    isUnlimited,
    percentage: isUnlimited ? 0 : Math.min(((count || 0) / tenant.receipts_limit) * 100, 100)
  };
}

export default async function PaymentPage() {
  const subscriptionDetails = await getSubscriptionDetails();
  const usageStats = await getUsageStats();

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start justify-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Subscription Management
              </h1>
              <p className="text-muted-foreground">
                Manage your plan, billing, and usage
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Usage Overview Card - Always visible */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Usage Overview
                </span>
              </CardTitle>
              <CardDescription>
                Your receipt processing usage for this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageStats && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Receipts Processed</span>
                    <span className="text-2xl font-bold">
                      {usageStats.currentUsage} / {usageStats.limit}
                    </span>
                  </div>
                  {!usageStats.isUnlimited && (
                    <>
                      <Progress value={usageStats.percentage} className="h-3" />
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>{usageStats.percentage.toFixed(0)}% of monthly limit</span>
                        <span>{usageStats.limit - usageStats.currentUsage} remaining</span>
                      </div>
                    </>
                  )}
                  {usageStats.isUnlimited && (
                    <div className="text-center text-sm text-muted-foreground">
                      <span>✨ Unlimited processing with Pro plan</span>
                    </div>
                  )}
                  {!usageStats.isUnlimited && usageStats.percentage >= 80 && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <p className="text-sm text-yellow-800">
                        You're approaching your monthly limit. Consider upgrading for unlimited processing.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {!subscriptionDetails.hasSubscription ||
          subscriptionDetails.subscription?.status !== "active" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Plan Card */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Current Plan
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                      <h3 className="text-xl font-semibold mb-2">Free Plan</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Perfect for getting started with expense tracking
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>10 receipts per month</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>AI-powered categorization</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>Basic analytics</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>Export to CSV/Excel</span>
                        </li>
                      </ul>
                    </div>
                    <div className="pt-4">
                      <Link href="/pricing">
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Upgrade to Pro
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Benefits Card */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-green-600" />
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Pro Benefits
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Unlock the full power of ClearSpendly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="rounded-full bg-purple-100 p-1 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Unlimited Receipts</p>
                        <p className="text-sm text-muted-foreground">Process as many receipts as you need</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="rounded-full bg-purple-100 p-1 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Advanced Analytics</p>
                        <p className="text-sm text-muted-foreground">Deep insights into spending patterns</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="rounded-full bg-purple-100 p-1 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Priority Support</p>
                        <p className="text-sm text-muted-foreground">Get help when you need it</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="rounded-full bg-purple-100 p-1 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">API Access</p>
                        <p className="text-sm text-muted-foreground">Integrate with your tools</p>
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Active Subscription Card */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Pro Subscription
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Your current subscription details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant="default" className="bg-green-600">
                      {subscriptionDetails.subscription.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Plan</span>
                      <span className="font-medium">ClearSpendly Pro</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Billing</span>
                      <span className="font-medium">
                        ${subscriptionDetails.subscription.amount / 100} / {subscriptionDetails.subscription.recurringInterval}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Next billing</span>
                      <span className="font-medium">
                        {new Date(subscriptionDetails.subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {subscriptionDetails.subscription.cancelAtPeriodEnd && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <p className="text-sm text-yellow-800">
                          Subscription will cancel on {new Date(subscriptionDetails.subscription.currentPeriodEnd).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <ManageSubscription />
                  </div>
                </CardContent>
              </Card>
              
              {/* Billing History Card */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Billing History
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Your recent payments and invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">
                            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-muted-foreground">Pro Subscription</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">
                            ${subscriptionDetails.subscription.amount / 100}
                          </p>
                          <Badge variant="outline" className="text-xs">Paid</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        Access your full billing history in the customer portal
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* FAQ Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-purple-600" />
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Frequently Asked Questions
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">What happens if I exceed my free limit?</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll need to upgrade to Pro to continue processing receipts for the month.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Can I cancel anytime?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes, you can cancel your Pro subscription at any time. You'll continue to have access until the end of your billing period.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Do unused receipts roll over?</h4>
                  <p className="text-sm text-muted-foreground">
                    No, the free tier limit of 10 receipts resets at the beginning of each month.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
