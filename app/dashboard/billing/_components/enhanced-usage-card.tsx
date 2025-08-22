"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LucideIcon, TrendingUp, TrendingDown, Minus, AlertTriangle, Zap } from 'lucide-react';
import { EnhancedUsageCardProps } from '@/lib/types/subscription';

export function EnhancedUsageCard({ 
  title, 
  icon: Icon, 
  current, 
  limit, 
  isUnlimited, 
  unit = '',
  color = 'blue',
  trend,
  predictions,
  onUpgradeClick
}: EnhancedUsageCardProps) {
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const remaining = isUnlimited ? null : Math.max(limit - current, 0);
  
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          icon: 'text-green-600 bg-green-50',
          progress: 'bg-green-600',
          badge: 'bg-green-50 text-green-700'
        };
      case 'purple':
        return {
          icon: 'text-purple-600 bg-purple-50',
          progress: 'bg-purple-600',
          badge: 'bg-purple-50 text-purple-700'
        };
      case 'orange':
        return {
          icon: 'text-orange-600 bg-orange-50',
          progress: 'bg-orange-600',
          badge: 'bg-orange-50 text-orange-700'
        };
      case 'red':
        return {
          icon: 'text-red-600 bg-red-50',
          progress: 'bg-red-600',
          badge: 'bg-red-50 text-red-700'
        };
      default:
        return {
          icon: 'text-blue-600 bg-blue-50',
          progress: 'bg-blue-600',
          badge: 'bg-blue-50 text-blue-700'
        };
    }
  };

  const colors = getColorClasses(color);

  const getStatusColor = () => {
    if (isUnlimited) return colors.badge;
    if (percentage >= 100) return 'bg-red-50 text-red-700 border-red-200';
    if (percentage >= 90) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (percentage >= 75) return 'bg-orange-50 text-orange-700 border-orange-200';
    return colors.badge;
  };

  const getProgressColor = () => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 90) return 'bg-yellow-500';
    if (percentage >= 75) return 'bg-orange-500';
    return colors.progress;
  };

  const formatNumber = (num: number) => {
    if (unit === 'MB' && num >= 1000) {
      return `${(num / 1000).toFixed(1)} GB`;
    }
    return num.toLocaleString();
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      case 'stable':
        return <Minus className="h-3 w-3 text-gray-600" />;
      default:
        return null;
    }
  };

  const shouldShowUpgradePrompt = !isUnlimited && (percentage >= 85 || (predictions && predictions.willExceedLimit));

  return (
    <Card className={`relative overflow-hidden ${shouldShowUpgradePrompt ? 'ring-2 ring-yellow-200' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${colors.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Current Usage with Trend */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {formatNumber(current)}
              </span>
              {unit && (
                <span className="text-sm text-muted-foreground">
                  {unit.toLowerCase()}
                </span>
              )}
            </div>
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                {getTrendIcon()}
                <span className={
                  trend.direction === 'up' ? 'text-green-600' :
                  trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                }>
                  {trend.percentage}% {trend.period}
                </span>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <Badge className={getStatusColor()}>
            {isUnlimited ? (
              'Unlimited'
            ) : percentage >= 100 ? (
              'Limit Exceeded'
            ) : percentage >= 90 ? (
              'Near Limit'
            ) : percentage >= 75 ? (
              'High Usage'
            ) : (
              'Good'
            )}
          </Badge>

          {/* Progress Bar */}
          {!isUnlimited && (
            <div className="space-y-2">
              <Progress 
                value={Math.min(percentage, 100)} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatNumber(current)} used</span>
                <span>Limit: {formatNumber(limit)}</span>
              </div>
              {remaining !== null && (
                <p className="text-xs text-muted-foreground">
                  {remaining > 0 ? `${formatNumber(remaining)} remaining` : 'Limit exceeded'}
                </p>
              )}
            </div>
          )}

          {/* Predictions */}
          {predictions && !isUnlimited && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Projected next month: {formatNumber(predictions.nextMonth)}</p>
              {predictions.willExceedLimit && (
                <div className="flex items-center gap-1 text-orange-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>May exceed limit next month</span>
                </div>
              )}
            </div>
          )}

          {/* Unlimited Display */}
          {isUnlimited && (
            <div className="text-xs text-muted-foreground">
              No limits on your current plan
            </div>
          )}
        </div>

        {/* Upgrade Prompt */}
        {shouldShowUpgradePrompt && onUpgradeClick && (
          <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  {percentage >= 100 ? 'Limit exceeded!' : 'Approaching limit'}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  {predictions && predictions.willExceedLimit 
                    ? 'Upgrade to avoid service interruption'
                    : 'Consider upgrading for more capacity'
                  }
                </p>
              </div>
              <Button
                size="sm"
                onClick={onUpgradeClick}
                className="ml-2 bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Zap className="h-3 w-3 mr-1" />
                Upgrade
              </Button>
            </div>
          </div>
        )}

        {/* Regular Warning for high usage */}
        {!shouldShowUpgradePrompt && !isUnlimited && percentage >= 80 && (
          <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-xs text-blue-800">
              Usage is getting high. Monitor your consumption to avoid hitting limits.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}