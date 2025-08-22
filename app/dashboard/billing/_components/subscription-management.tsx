"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard,
  Settings,
  Calendar,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionManagementProps, ProrationCalculation } from '@/lib/types/subscription';
import { PlanComparisonDialog } from './plan-comparison-dialog';
import { PaymentMethodManager } from './payment-method-manager';

export function SubscriptionManagement({ 
  currentSubscription,
  availablePlans,
  paymentMethods,
  onPlanChange,
  onPaymentMethodUpdate,
  onCancel
}: SubscriptionManagementProps) {
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [prorationDetails, setProrationDetails] = useState<ProrationCalculation | null>(null);
  const [loading, setLoading] = useState(false);

  const currentPlan = availablePlans.find(p => p.id === currentSubscription.plan_id);
  const isTrialing = currentSubscription.status === 'trialing';
  const isPastDue = currentSubscription.status === 'past_due';
  const isCancelled = currentSubscription.status === 'cancelled';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateProration = async (planId: string, billingCycle: 'monthly' | 'yearly') => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions/calculate-proration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSubscriptionId: currentSubscription.id,
          newPlanId: planId,
          billingCycle
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setProrationDetails(data.calculation);
      } else {
        toast.error('Failed to calculate proration');
      }
    } catch (error) {
      console.error('Error calculating proration:', error);
      toast.error('Failed to calculate proration');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelection = async (planId: string, billingCycle: 'monthly' | 'yearly') => {
    setSelectedPlan(planId);
    setSelectedBillingCycle(billingCycle);
    await calculateProration(planId, billingCycle);
  };

  const confirmPlanChange = async () => {
    if (!selectedPlan) return;

    try {
      setLoading(true);
      await onPlanChange(selectedPlan, selectedBillingCycle);
      setShowPlanDialog(false);
      setSelectedPlan(null);
      setProrationDetails(null);
      toast.success('Plan updated successfully!');
    } catch (error) {
      toast.error('Failed to update plan');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (immediate: boolean = false) => {
    try {
      setLoading(true);
      await onCancel();
      setShowCancelDialog(false);
      toast.success(immediate ? 'Subscription cancelled' : 'Subscription will cancel at period end');
    } catch (error) {
      toast.error('Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (isTrialing) return <Calendar className="h-4 w-4 text-blue-600" />;
    if (isPastDue) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    if (isCancelled) return <X className="h-4 w-4 text-red-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  const getStatusColor = () => {
    if (isTrialing) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (isPastDue) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (isCancelled) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-green-50 text-green-700 border-green-200';
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Subscription Management
          </CardTitle>
          <CardDescription>
            Manage your current subscription, change plans, and update billing information
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Current Plan Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">
                    {currentPlan?.name || 'Current Plan'}
                  </h3>
                  <Badge className={getStatusColor()}>
                    {getStatusIcon()}
                    <span className="ml-1">
                      {currentSubscription.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(currentSubscription.amount)} / {currentSubscription.billing_cycle}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isTrialing && currentSubscription.trial_end 
                    ? `Trial ends ${formatDate(currentSubscription.trial_end)}`
                    : `Next billing: ${formatDate(currentSubscription.current_period_end)}`
                  }
                </p>
              </div>
              
              <div className="text-right space-y-2">
                <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Change Plan
                    </Button>
                  </DialogTrigger>
                  <PlanComparisonDialog
                    currentPlan={currentPlan}
                    availablePlans={availablePlans}
                    onPlanSelect={handlePlanSelection}
                    onConfirm={confirmPlanChange}
                    prorationDetails={prorationDetails}
                    loading={loading}
                    selectedPlan={selectedPlan}
                    selectedBillingCycle={selectedBillingCycle}
                  />
                </Dialog>
                
                {!isCancelled && (
                  <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                        Cancel Subscription
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancel Subscription</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to cancel your subscription? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Your subscription will remain active until {formatDate(currentSubscription.current_period_end)}.
                            After this date, you'll lose access to premium features.
                          </AlertDescription>
                        </Alert>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowCancelDialog(false)}
                            className="flex-1"
                          >
                            Keep Subscription
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleCancelSubscription(false)}
                            disabled={loading}
                            className="flex-1"
                          >
                            {loading ? 'Cancelling...' : 'Cancel at Period End'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>

          {/* Past Due Warning */}
          {isPastDue && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-yellow-800">
                Your subscription payment is past due. Please update your payment method to avoid service interruption.
              </AlertDescription>
            </Alert>
          )}

          {/* Cancellation Notice */}
          {isCancelled && (
            <Alert className="border-red-200 bg-red-50">
              <X className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                Your subscription has been cancelled and will end on {formatDate(currentSubscription.current_period_end)}.
                You can reactivate it before this date.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Payment & Billing Management */}
      <Tabs defaultValue="payment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          <TabsTrigger value="billing">Billing Address</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="payment">
          <PaymentMethodManager
            paymentMethods={paymentMethods}
            onUpdate={onPaymentMethodUpdate}
          />
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
              <CardDescription>
                Update your billing address for invoices and tax calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Billing address management will be implemented here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices & Receipts</CardTitle>
              <CardDescription>
                Download your billing history and tax documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Invoice management will be implemented here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}