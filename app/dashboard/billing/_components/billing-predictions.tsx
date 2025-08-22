"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Lightbulb,
  ArrowRight,
  Clock
} from 'lucide-react';
import { BillingPredictions } from '@/lib/types/subscription';

interface BillingPredictionsCardProps {
  predictions: BillingPredictions;
  onUpgradeClick?: (planId: string) => void;
  loading?: boolean;
}

export function BillingPredictionsCard({ 
  predictions, 
  onUpgradeClick,
  loading = false
}: BillingPredictionsCardProps) {
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

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return 'text-orange-600 bg-orange-50';
      case 'decreasing':
        return 'text-green-600 bg-green-50';
      case 'stable':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4" />;
      case 'decreasing':
        return <TrendingUp className="h-4 w-4 rotate-180" />;
      case 'stable':
        return <ArrowRight className="h-4 w-4" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing Predictions
          </CardTitle>
          <CardDescription>
            AI-powered insights into your future usage and costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Billing Predictions
        </CardTitle>
        <CardDescription>
          AI-powered insights into your future usage and costs
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Next Billing Date & Amount */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Next billing date</p>
              <p className="text-xs text-blue-700">{formatDate(predictions.nextBillingDate)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-blue-900">
              {formatCurrency(predictions.estimatedAmount)}
            </p>
            <p className="text-xs text-blue-700">Estimated</p>
          </div>
        </div>

        {/* Usage Trend */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Usage Trend</h4>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <div className={`p-1 rounded ${getTrendColor(predictions.usageTrend.direction)}`}>
              {getTrendIcon(predictions.usageTrend.direction)}
            </div>
            <div className="flex-1">
              <p className="text-sm">
                Your usage is{' '}
                <span className="font-medium">
                  {predictions.usageTrend.direction}
                </span>
                {predictions.usageTrend.monthlyGrowth !== 0 && (
                  <>
                    {' '}by{' '}
                    <span className="font-medium">
                      {Math.abs(predictions.usageTrend.monthlyGrowth)}%
                    </span>
                    {' '}monthly
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Recommended Plan */}
        {predictions.recommendedPlan && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <h4 className="text-sm font-medium">Optimization Suggestion</h4>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Consider switching to {predictions.recommendedPlan.planName}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    {predictions.recommendedPlan.reason}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <DollarSign className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">
                      Save {formatCurrency(predictions.recommendedPlan.potentialSavings)}/month
                    </span>
                  </div>
                </div>
                {onUpgradeClick && (
                  <Button
                    size="sm"
                    onClick={() => onUpgradeClick(predictions.recommendedPlan!.planId)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Switch Plan
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Limit Warning */}
        {predictions.upcomingLimitExceeded && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <h4 className="text-sm font-medium">Upcoming Limit Alert</h4>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-900">
                    {predictions.upcomingLimitExceeded.feature} limit may be exceeded
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    Projected date: {formatDate(predictions.upcomingLimitExceeded.projectedDate)}
                  </p>
                  <p className="text-xs text-orange-700 mt-2">
                    <strong>Recommended:</strong> {predictions.upcomingLimitExceeded.recommendedAction}
                  </p>
                </div>
                {onUpgradeClick && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpgradeClick('')}
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    View Plans
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No recommendations state */}
        {!predictions.recommendedPlan && !predictions.upcomingLimitExceeded && (
          <div className="text-center py-4">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-900">All Good!</p>
            <p className="text-xs text-green-700 mt-1">
              Your current plan seems optimal for your usage patterns
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}