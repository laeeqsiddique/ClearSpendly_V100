"use client";

import React from 'react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Check, 
  X, 
  Crown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Calendar,
  Info
} from 'lucide-react';
import { SubscriptionPlan, ProrationCalculation } from '@/lib/types/subscription';

interface PlanComparisonDialogProps {
  currentPlan?: SubscriptionPlan;
  availablePlans: SubscriptionPlan[];
  onPlanSelect: (planId: string, billingCycle: 'monthly' | 'yearly') => void;
  onConfirm: () => void;
  prorationDetails: ProrationCalculation | null;
  loading: boolean;
  selectedPlan: string | null;
  selectedBillingCycle: 'monthly' | 'yearly';
}

export function PlanComparisonDialog({
  currentPlan,
  availablePlans,
  onPlanSelect,
  onConfirm,
  prorationDetails,
  loading,
  selectedPlan,
  selectedBillingCycle
}: PlanComparisonDialogProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateYearlySavings = (monthlyPrice: number, yearlyPrice: number) => {
    const yearlyMonthly = yearlyPrice / 12;
    const savings = (monthlyPrice - yearlyMonthly) * 12;
    const savingsPercent = Math.round((savings / (monthlyPrice * 12)) * 100);
    return { savings, savingsPercent };
  };

  const getChangeDirection = (planId: string) => {
    if (!currentPlan) return null;
    
    const plan = availablePlans.find(p => p.id === planId);
    if (!plan) return null;

    const currentPrice = currentPlan.price_monthly;
    const newPrice = plan.price_monthly;

    if (newPrice > currentPrice) return 'upgrade';
    if (newPrice < currentPrice) return 'downgrade';
    return 'same';
  };

  const getChangeIcon = (planId: string) => {
    const direction = getChangeDirection(planId);
    
    switch (direction) {
      case 'upgrade':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'downgrade':
        return <ArrowDown className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const renderFeatureList = (features: Record<string, any>) => {
    const featureList = [
      { key: 'receipts_per_month', label: 'Monthly Receipts' },
      { key: 'invoices_per_month', label: 'Monthly Invoices' },
      { key: 'storage_mb', label: 'Storage Space' },
      { key: 'users_max', label: 'Team Members' },
      { key: 'ai_processing', label: 'AI Processing' },
      { key: 'custom_branding', label: 'Custom Branding' },
      { key: 'api_access', label: 'API Access' },
      { key: 'advanced_analytics', label: 'Advanced Analytics' },
      { key: 'priority_support', label: 'Priority Support' }
    ];

    return featureList.map(feature => {
      const value = features[feature.key];
      const hasFeature = value === true || (typeof value === 'number' && value > 0);
      
      return (
        <div key={feature.key} className="flex items-center gap-2 text-sm">
          {hasFeature ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <X className="h-4 w-4 text-gray-400" />
          )}
          <span className={hasFeature ? 'text-gray-900' : 'text-gray-500'}>
            {feature.label}
            {typeof value === 'number' && value > 0 && (
              <span className="ml-1 text-muted-foreground">
                ({value === -1 ? 'Unlimited' : value.toLocaleString()})
              </span>
            )}
          </span>
        </div>
      );
    });
  };

  return (
    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Change Subscription Plan</DialogTitle>
        <DialogDescription>
          Compare plans and see how the change will affect your billing
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Plan Selection */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availablePlans.map((plan) => {
            const isCurrentPlan = currentPlan?.id === plan.id;
            const isSelected = selectedPlan === plan.id;
            const changeDirection = getChangeDirection(plan.id);
            const { savings, savingsPercent } = calculateYearlySavings(plan.price_monthly, plan.price_yearly);

            return (
              <Card 
                key={plan.id} 
                className={`relative cursor-pointer transition-all ${
                  isSelected 
                    ? 'ring-2 ring-blue-500 shadow-md' 
                    : isCurrentPlan 
                      ? 'ring-2 ring-gray-300' 
                      : 'hover:shadow-md'
                }`}
              >
                {plan.is_featured && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                      <Crown className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {getChangeIcon(plan.id)}
                    </CardTitle>
                    {isCurrentPlan && (
                      <Badge variant="outline">Current</Badge>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Pricing */}
                  <Tabs defaultValue="monthly" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="monthly">Monthly</TabsTrigger>
                      <TabsTrigger value="yearly">
                        Yearly
                        {savingsPercent > 0 && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            -{savingsPercent}%
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="monthly" className="mt-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold">
                          {formatCurrency(plan.price_monthly)}
                        </div>
                        <div className="text-sm text-muted-foreground">per month</div>
                        <Button
                          className="w-full mt-3"
                          onClick={() => onPlanSelect(plan.id, 'monthly')}
                          variant={isSelected && selectedBillingCycle === 'monthly' ? 'default' : 'outline'}
                          disabled={isCurrentPlan}
                        >
                          {isCurrentPlan ? 'Current Plan' : 'Select Monthly'}
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="yearly" className="mt-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold">
                          {formatCurrency(plan.price_yearly / 12)}
                        </div>
                        <div className="text-sm text-muted-foreground">per month</div>
                        <div className="text-xs text-green-600 font-medium">
                          Save {formatCurrency(savings)} annually
                        </div>
                        <Button
                          className="w-full mt-3"
                          onClick={() => onPlanSelect(plan.id, 'yearly')}
                          variant={isSelected && selectedBillingCycle === 'yearly' ? 'default' : 'outline'}
                          disabled={isCurrentPlan}
                        >
                          {isCurrentPlan ? 'Current Plan' : 'Select Yearly'}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Features included:</h4>
                    <div className="space-y-1">
                      {renderFeatureList(plan.features)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Proration Details */}
        {prorationDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Billing Changes
              </CardTitle>
              <CardDescription>
                Here's how your billing will be affected by this change
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Current Plan</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{prorationDetails.oldPlan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(prorationDetails.oldPlan.amount)}/month
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">New Plan</h4>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium">{prorationDetails.newPlan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(prorationDetails.newPlan.amount)}/month
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>
                      <strong>Unused time credit:</strong> {formatCurrency(prorationDetails.credit)} 
                      ({prorationDetails.unusedTime} days remaining)
                    </p>
                    <p>
                      <strong>Immediate charge:</strong> {formatCurrency(prorationDetails.immediateCharge)}
                    </p>
                    <p>
                      <strong>Next billing amount:</strong> {formatCurrency(prorationDetails.nextBillingAmount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Changes will take effect immediately on {new Date(prorationDetails.effectiveDate).toLocaleDateString()}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Confirmation */}
        {selectedPlan && prorationDetails && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {}}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Confirm Plan Change'}
            </Button>
          </div>
        )}
      </div>
    </DialogContent>
  );
}