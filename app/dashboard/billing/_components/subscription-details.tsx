"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface SubscriptionDetailsProps {
  subscription: {
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
  };
}

export function SubscriptionDetails({ subscription }: SubscriptionDetailsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'stripe':
        return '💳';
      case 'paypal':
        return '🅿️';
      default:
        return '💵';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'trialing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'past_due':
      case 'unpaid':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'active':
        return 'Your subscription is active and billing normally';
      case 'trialing':
        return 'You\'re currently in your free trial period';
      case 'past_due':
        return 'Payment failed - please update your payment method';
      case 'unpaid':
        return 'Payment is required to continue service';
      case 'cancelled':
        return 'Your subscription has been cancelled';
      default:
        return 'Unknown subscription status';
    }
  };

  const isInTrial = subscription.status === 'trialing' && subscription.trial_end;
  const trialDaysRemaining = isInTrial 
    ? Math.ceil((new Date(subscription.trial_end!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Subscription Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            {getStatusIcon(subscription.status)}
            <div>
              <p className="font-medium capitalize">
                {subscription.status === 'trialing' ? 'Free Trial' : subscription.status}
              </p>
              <p className="text-sm text-muted-foreground">
                {getStatusDescription(subscription.status)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Plan & Pricing */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Plan</span>
              <span>{subscription.subscription_plan?.name || 'Unknown Plan'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Billing</span>
              <span className="capitalize">{subscription.billing_cycle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Amount</span>
              <span>${subscription.amount} {subscription.currency.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Provider</span>
              <div className="flex items-center gap-1">
                <span>{getProviderIcon(subscription.provider)}</span>
                <span className="capitalize">{subscription.provider}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trial Information */}
          {isInTrial && (
            <>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Free Trial Active</span>
                </div>
                <p className="text-sm text-blue-700">
                  {trialDaysRemaining > 0 
                    ? `${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} remaining`
                    : 'Trial ends today'
                  }
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Ends on {formatDate(subscription.trial_end!)}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Billing Dates */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Current Period</span>
              <span className="text-sm">
                {formatDate(subscription.current_period_start)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">
                {isInTrial ? 'Trial Ends' : 'Next Billing'}
              </span>
              <span className="text-sm">
                {formatDate(isInTrial ? subscription.trial_end! : subscription.current_period_end)}
              </span>
            </div>
          </div>

          {/* Cancellation Notice */}
          {subscription.cancel_at_period_end && (
            <>
              <Separator />
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Subscription Ending</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Your subscription will end on {formatDate(subscription.current_period_end)}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}