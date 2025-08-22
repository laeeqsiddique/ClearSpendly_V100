"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Users, 
  FileText, 
  HardDrive,
  Star,
  Crown,
  Zap,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { PricingCard } from './_components/pricing-card';
import { UsageCard } from './_components/usage-card';
import { EnhancedUsageCard } from './_components/enhanced-usage-card';
import { BillingPredictionsCard } from './_components/billing-predictions';
import { SubscriptionManagement } from './_components/subscription-management';
import { SubscriptionDetails } from './_components/subscription-details';
import { PaymentHistory } from './_components/payment-history';
import { BillingPredictions, PaymentMethod } from '@/lib/types/subscription';

export const dynamic = 'force-dynamic';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: Record<string, any>;
  limits: Record<string, any>;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  paypal_plan_id_monthly?: string;
  paypal_plan_id_yearly?: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

interface CurrentSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  cancel_at_period_end: boolean;
  amount: number;
  currency: string;
  provider: 'stripe' | 'paypal';
  usage_counts: Record<string, number>;
  subscription_plan?: {
    name: string;
    slug: string;
    features: Record<string, any>;
    limits: Record<string, any>;
  };
}

interface UsageData {
  tenantId: string;
  usage: Record<string, {
    allowed: boolean;
    currentUsage: number;
    limit: number;
    isUnlimited: boolean;
    remainingUsage?: number;
  }>;
}

interface UsageTrend {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  period: string;
}

interface UsagePrediction {
  nextMonth: number;
  willExceedLimit: boolean;
}

export default function BillingPage() {
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [billingPredictions, setBillingPredictions] = useState<BillingPredictions | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch current subscription, available plans, usage data, payment methods, and predictions in parallel
      const [subscriptionRes, plansRes, usageRes, paymentMethodsRes, predictionsRes] = await Promise.all([
        fetch('/api/subscriptions/current'),
        fetch('/api/subscriptions/plans'),
        fetch('/api/subscriptions/usage'),
        fetch('/api/billing/payment-methods'),
        fetch('/api/billing/predictions')
      ]);

      if (subscriptionRes.ok) {
        const subscriptionData = await subscriptionRes.json();
        setCurrentSubscription(subscriptionData.data);
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setAvailablePlans(plansData.data || []);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsageData(usageData.data);
      }

      if (paymentMethodsRes.ok) {
        const paymentMethodsData = await paymentMethodsRes.json();
        setPaymentMethods(paymentMethodsData.data || []);
      }

      if (predictionsRes.ok) {
        const predictionsData = await predictionsRes.json();
        setBillingPredictions(predictionsData.data);
      }

    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string, billingCycle: 'monthly' | 'yearly', provider: 'stripe' | 'paypal') => {
    try {
      setActionLoading(true);

      if (currentSubscription) {
        // Change existing subscription
        const response = await fetch('/api/subscriptions/change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPlanId: planId })
        });

        const data = await response.json();

        if (data.success) {
          toast.success('Subscription updated successfully!');
          fetchData();
        } else {
          toast.error(data.error || 'Failed to update subscription');
        }
      } else {
        // Create new subscription
        const response = await fetch('/api/subscriptions/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId,
            billingCycle,
            provider
          })
        });

        const data = await response.json();

        if (data.success) {
          if (data.clientSecret) {
            // Handle Stripe payment
            // You would integrate Stripe Elements here
            toast.success('Subscription created! Complete payment to activate.');
          } else if (data.approvalUrl) {
            // Redirect to PayPal for approval
            window.location.href = data.approvalUrl;
          } else {
            toast.success('Subscription created successfully!');
            fetchData();
          }
        } else {
          toast.error(data.error || 'Failed to create subscription');
        }
      }

    } catch (error) {
      console.error('Error handling subscription:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async (cancelAtPeriodEnd: boolean = true) => {
    try {
      setActionLoading(true);

      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelAtPeriodEnd })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          cancelAtPeriodEnd 
            ? 'Subscription will be cancelled at the end of the billing period'
            : 'Subscription cancelled successfully'
        );
        fetchData();
      } else {
        toast.error(data.error || 'Failed to cancel subscription');
      }

    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaymentMethodUpdate = async (paymentMethodId: string) => {
    // Update payment methods list
    fetchData();
  };

  const handleUpgradeFromPredictions = (planId: string) => {
    // Navigate to plan selection or open upgrade dialog
    console.log('Upgrading to plan:', planId);
  };

  const getUsageTrend = (feature: string): UsageTrend | undefined => {
    // This would come from analytics data
    const trends: Record<string, UsageTrend> = {
      receipts_per_month: { direction: 'up', percentage: 15, period: 'vs last month' },
      invoices_per_month: { direction: 'stable', percentage: 2, period: 'vs last month' },
      storage_mb: { direction: 'up', percentage: 8, period: 'vs last month' },
      users_max: { direction: 'stable', percentage: 0, period: 'vs last month' }
    };
    return trends[feature];
  };

  const getUsagePredictions = (feature: string): UsagePrediction | undefined => {
    if (!usageData?.usage[feature]) return undefined;
    
    const current = usageData.usage[feature].currentUsage;
    const limit = usageData.usage[feature].limit;
    
    if (usageData.usage[feature].isUnlimited) return undefined;
    
    // Simple prediction based on current trend
    const trend = getUsageTrend(feature);
    if (!trend) return undefined;
    
    const growthFactor = trend.direction === 'up' ? 1 + (trend.percentage / 100) : 
                        trend.direction === 'down' ? 1 - (trend.percentage / 100) : 1;
    
    const predictedNext = Math.round(current * growthFactor);
    
    return {
      nextMonth: predictedNext,
      willExceedLimit: predictedNext > limit
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'trialing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'past_due': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateSavings = (monthlyPrice: number, yearlyPrice: number) => {
    const yearlyMonthly = yearlyPrice / 12;
    const savings = monthlyPrice - yearlyMonthly;
    const savingsPercent = Math.round((savings / monthlyPrice) * 100);
    return { savings: savings * 12, savingsPercent };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription, usage, and billing information
          </p>
        </div>
      </div>

      {/* Current Subscription Status */}
      {currentSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">
                      {currentSubscription.subscription_plan?.name || 'Unknown Plan'}
                    </h3>
                    <Badge className={getStatusColor(currentSubscription.status)}>
                      {currentSubscription.status === 'trialing' ? 'Trial' : 
                       currentSubscription.status === 'active' ? 'Active' :
                       currentSubscription.status === 'past_due' ? 'Past Due' :
                       currentSubscription.status === 'cancelled' ? 'Cancelled' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    ${currentSubscription.amount} / {currentSubscription.billing_cycle}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentSubscription.status === 'trialing' && currentSubscription.trial_end 
                      ? `Trial ends ${formatDate(currentSubscription.trial_end)}`
                      : `Next billing: ${formatDate(currentSubscription.current_period_end)}`}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {currentSubscription.status === 'active' && !currentSubscription.cancel_at_period_end && (
                  <Button
                    variant="outline"
                    onClick={() => handleCancelSubscription(true)}
                    disabled={actionLoading}
                  >
                    Cancel Subscription
                  </Button>
                )}
                
                {currentSubscription.cancel_at_period_end && (
                  <div className="text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Cancels on {formatDate(currentSubscription.current_period_end)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Details</TabsTrigger>
          <TabsTrigger value="plans">Plan Comparison</TabsTrigger>
          <TabsTrigger value="management">Subscription Management</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Enhanced Usage Overview */}
          {usageData && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <EnhancedUsageCard
                title="Receipts Processed"
                icon={FileText}
                current={usageData.usage.receipts_per_month?.currentUsage || 0}
                limit={usageData.usage.receipts_per_month?.limit || 0}
                isUnlimited={usageData.usage.receipts_per_month?.isUnlimited || false}
                color="blue"
                trend={getUsageTrend('receipts_per_month')}
                predictions={getUsagePredictions('receipts_per_month')}
                onUpgradeClick={() => handleUpgradeFromPredictions('')}
              />
              
              <EnhancedUsageCard
                title="Invoices Created"
                icon={CreditCard}
                current={usageData.usage.invoices_per_month?.currentUsage || 0}
                limit={usageData.usage.invoices_per_month?.limit || 0}
                isUnlimited={usageData.usage.invoices_per_month?.isUnlimited || false}
                color="green"
                trend={getUsageTrend('invoices_per_month')}
                predictions={getUsagePredictions('invoices_per_month')}
                onUpgradeClick={() => handleUpgradeFromPredictions('')}
              />
              
              <EnhancedUsageCard
                title="Storage Used"
                icon={HardDrive}
                current={usageData.usage.storage_mb?.currentUsage || 0}
                limit={usageData.usage.storage_mb?.limit || 0}
                isUnlimited={usageData.usage.storage_mb?.isUnlimited || false}
                unit="MB"
                color="purple"
                trend={getUsageTrend('storage_mb')}
                predictions={getUsagePredictions('storage_mb')}
                onUpgradeClick={() => handleUpgradeFromPredictions('')}
              />
              
              <EnhancedUsageCard
                title="Team Members"
                icon={Users}
                current={usageData.usage.users_max?.currentUsage || 0}
                limit={usageData.usage.users_max?.limit || 0}
                isUnlimited={usageData.usage.users_max?.isUnlimited || false}
                color="orange"
                trend={getUsageTrend('users_max')}
                predictions={getUsagePredictions('users_max')}
                onUpgradeClick={() => handleUpgradeFromPredictions('')}
              />
            </div>
          )}

          {/* Billing Predictions */}
          {billingPredictions && (
            <BillingPredictionsCard
              predictions={billingPredictions}
              onUpgradeClick={handleUpgradeFromPredictions}
              loading={loading}
            />
          )}

          {/* Subscription Management */}
          {currentSubscription && (
            <SubscriptionManagement
              currentSubscription={currentSubscription}
              availablePlans={availablePlans}
              paymentMethods={paymentMethods}
              onPlanChange={handleUpgrade}
              onPaymentMethodUpdate={handlePaymentMethodUpdate}
              onCancel={() => handleCancelSubscription(true)}
            />
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          {usageData && (
            <div className="grid gap-6 md:grid-cols-2">
              {Object.entries(usageData.usage).map(([key, usage]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {key === 'receipts_per_month' ? 'Monthly Receipts' :
                       key === 'invoices_per_month' ? 'Monthly Invoices' :
                       key === 'storage_mb' ? 'Storage Space' :
                       key === 'users_max' ? 'Team Members' : key}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Used: {usage.currentUsage.toLocaleString()}</span>
                        <span>
                          Limit: {usage.isUnlimited ? 'Unlimited' : usage.limit.toLocaleString()}
                        </span>
                      </div>
                      {!usage.isUnlimited && (
                        <Progress 
                          value={(usage.currentUsage / usage.limit) * 100} 
                          className="h-2"
                        />
                      )}
                      {!usage.isUnlimited && usage.remainingUsage !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          {usage.remainingUsage} remaining
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availablePlans.map((plan) => {
              const { savings, savingsPercent } = calculateSavings(plan.price_monthly, plan.price_yearly);
              const isCurrentPlan = currentSubscription?.subscription_plan?.slug === plan.slug;
              
              return (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  isCurrentPlan={isCurrentPlan}
                  onUpgrade={handleUpgrade}
                  loading={actionLoading}
                  savings={savings}
                  savingsPercent={savingsPercent}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="management" className="space-y-4">
          {currentSubscription ? (
            <SubscriptionManagement
              currentSubscription={currentSubscription}
              availablePlans={availablePlans}
              paymentMethods={paymentMethods}
              onPlanChange={handleUpgrade}
              onPaymentMethodUpdate={handlePaymentMethodUpdate}
              onCancel={() => handleCancelSubscription(true)}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active subscription to manage</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <PaymentHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}