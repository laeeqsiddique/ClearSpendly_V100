"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface UsageCardProps {
  title: string;
  icon: LucideIcon;
  current: number;
  limit: number;
  isUnlimited: boolean;
  unit?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

export function UsageCard({ 
  title, 
  icon: Icon, 
  current, 
  limit, 
  isUnlimited, 
  unit = '',
  color = 'blue'
}: UsageCardProps) {
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
    if (percentage >= 90) return 'bg-red-50 text-red-700';
    if (percentage >= 75) return 'bg-yellow-50 text-yellow-700';
    return colors.badge;
  };

  const formatNumber = (num: number) => {
    if (unit === 'MB' && num >= 1000) {
      return `${(num / 1000).toFixed(1)} GB`;
    }
    return num.toLocaleString();
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${colors.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Current Usage */}
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

          {/* Unlimited Display */}
          {isUnlimited && (
            <div className="text-xs text-muted-foreground">
              No limits on your current plan
            </div>
          )}
        </div>

        {/* Warning for high usage */}
        {!isUnlimited && percentage >= 90 && (
          <div className="mt-3 p-2 bg-yellow-50 rounded-md border border-yellow-200">
            <p className="text-xs text-yellow-800">
              {percentage >= 100 
                ? 'You\'ve exceeded your limit. Consider upgrading your plan.'
                : 'You\'re approaching your limit. Consider upgrading your plan.'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}