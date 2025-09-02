"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, 
  CreditCard, 
  Calendar,
  TrendingUp,
  Settings,
  Download,
  Shield,
  CheckCircle,
  AlertTriangle,
  Zap,
  Users,
  BarChart3,
  Clock,
  RefreshCw,
  ExternalLink,
  Star,
  ChevronRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UsageLimitIndicator } from '@/components/feature-gating/feature-gate';

interface SubscriptionDashboardProps {
  subscription: {
    id: string;
    plan_name: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    trial_end?: string;
  };
  usage: Record<string, { current: number; limit: number }>;
  planFeatures: Record<string, boolean>;
  billingHistory?: Array<{
    id: string;
    amount: number;
    status: string;
    created: string;
    invoice_pdf?: string;
  }>;
  onUpgrade?: () => void;
  onManageBilling?: () => void;
  onCancelSubscription?: () => void;
}

export function SubscriptionDashboard({
  subscription,
  usage,
  planFeatures,
  billingHistory = [],
  onUpgrade,
  onManageBilling,
  onCancelSubscription
}: SubscriptionDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'billing'>('overview');
  
  const isTrialActive = subscription.trial_end && new Date(subscription.trial_end) > new Date();
  const trialDaysLeft = subscription.trial_end 
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  const nextBillingDate = new Date(subscription.current_period_end);
  const daysUntilBilling = Math.ceil((nextBillingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const getPlanColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'pro': return 'from-purple-600 to-blue-600';
      case 'enterprise': return 'from-blue-600 to-indigo-600';
      case 'free': return 'from-gray-600 to-gray-700';
      default: return 'from-purple-600 to-blue-600';
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'pro': return <Zap className="w-5 h-5" />;
      case 'enterprise': return <Crown className="w-5 h-5" />;
      case 'free': return <Star className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  const getStatusBadge = () => {
    if (isTrialActive) {
      return <Badge className="bg-blue-100 text-blue-700">Trial Active</Badge>;
    }
    
    switch (subscription.status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case 'past_due':
        return <Badge className="bg-orange-100 text-orange-700">Past Due</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-700">Canceled</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-700">Unpaid</Badge>;
      default:
        return <Badge variant="outline">{subscription.status}</Badge>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile-first tab navigation */}
      <div className="flex overflow-x-auto pb-2">
        <div className="flex space-x-1 sm:space-x-2 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'usage', label: 'Usage', icon: TrendingUp },
            { id: 'billing', label: 'Billing', icon: CreditCard }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                activeTab === id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Current Plan Card - Mobile Optimized */}
          <Card className="border-2 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-white bg-gradient-to-r",
                    getPlanColor(subscription.plan_name)
                  )}>
                    {getPlanIcon(subscription.plan_name)}
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl capitalize">
                      {subscription.plan_name} Plan
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge()}
                      {subscription.cancel_at_period_end && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          Canceling
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  {subscription.plan_name !== 'enterprise' && (
                    <Button
                      onClick={onUpgrade}
                      size="sm"
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onManageBilling}
                    className="border-2"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Manage</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Trial Information */}
              {isTrialActive && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="font-medium">
                        Trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}
                      </span>
                      {trialDaysLeft <= 3 && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                          Add Payment Method
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Billing Information */}
              {!isTrialActive && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">Next Billing</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {nextBillingDate.toLocaleDateString()} ({daysUntilBilling} days)
                    </p>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">Billing Status</span>
                    </div>
                    <p className="text-sm text-gray-600 capitalize">{subscription.status}</p>
                  </div>
                </div>
              )}

              {/* Cancellation Warning */}
              {subscription.cancel_at_period_end && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span>Your subscription will end on {nextBillingDate.toLocaleDateString()}</span>
                      <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                        Reactivate
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Quick Usage Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(usage).slice(0, 3).map(([feature, data]) => (
              <Card key={feature} className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {feature.replace('_', ' ')}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {data.current}/{data.limit === -1 ? '∞' : data.limit}
                    </Badge>
                  </div>
                  <UsageLimitIndicator feature={feature} showDetails={false} compact />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Usage Details</h3>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="space-y-4">
            {Object.entries(usage).map(([feature, data]) => (
              <UsageLimitIndicator key={feature} feature={feature} showDetails />
            ))}
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Billing History</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onManageBilling}
              className="border-2 self-start sm:self-auto"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Manage Billing
            </Button>
          </div>

          {billingHistory.length === 0 ? (
            <Card className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No billing history available</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {billingHistory.map((invoice) => (
                <Card key={invoice.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          ${(invoice.amount / 100).toFixed(2)}
                        </span>
                        <Badge 
                          variant={invoice.status === 'paid' ? 'default' : 'outline'}
                          className={cn(
                            "text-xs",
                            invoice.status === 'paid' && "bg-green-100 text-green-700"
                          )}
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(invoice.created).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {invoice.invoice_pdf && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}