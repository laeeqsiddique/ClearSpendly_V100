"use client";

import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Users,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricData {
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  alert?: string;
}

interface HeroMetricsData {
  revenue: MetricData;
  expenses: MetricData;
  netProfit: MetricData;
  outstandingInvoices: MetricData;
}

interface HeroMetricsProps {
  data?: HeroMetricsData;
  loading?: boolean;
}

export function HeroMetrics({ data, loading }: HeroMetricsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable', isPositive: boolean) => {
    if (trend === 'stable') return <Minus className="h-4 w-4" />;
    if (trend === 'up') return <ArrowUpRight className="h-4 w-4" />;
    return <ArrowDownRight className="h-4 w-4" />;
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isPositive: boolean) => {
    if (trend === 'stable') return 'text-gray-500';
    if (isPositive) {
      return trend === 'up' ? 'text-green-600' : 'text-red-600';
    } else {
      return trend === 'up' ? 'text-red-600' : 'text-green-600';
    }
  };

  const metrics = [
    {
      label: 'Revenue',
      value: data?.revenue.current || 0,
      change: data?.revenue.change || 0,
      trend: data?.revenue.trend || 'stable',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      iconColor: 'text-green-600 dark:text-green-400',
      isPositive: true,
      alert: data?.revenue.alert
    },
    {
      label: 'Expenses',
      value: data?.expenses.current || 0,
      change: data?.expenses.change || 0,
      trend: data?.expenses.trend || 'stable',
      icon: Receipt,
      color: 'from-red-500 to-pink-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      iconColor: 'text-red-600 dark:text-red-400',
      isPositive: false,
      alert: data?.expenses.alert
    },
    {
      label: 'Net Profit',
      value: data?.netProfit.current || 0,
      change: data?.netProfit.change || 0,
      trend: data?.netProfit.trend || 'stable',
      icon: TrendingUp,
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      isPositive: true,
      alert: data?.netProfit.alert
    },
    {
      label: 'Outstanding',
      value: data?.outstandingInvoices.current || 0,
      change: data?.outstandingInvoices.change || 0,
      trend: data?.outstandingInvoices.trend || 'stable',
      icon: Users,
      color: 'from-orange-500 to-amber-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      isPositive: false,
      alert: data?.outstandingInvoices.alert
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-4 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const trendColor = getTrendColor(metric.trend, metric.isPositive);
        
        return (
          <Card
            key={index}
            className="relative overflow-hidden transition-all hover:shadow-lg"
          >
            {/* Gradient Background */}
            <div className={cn(
              "absolute inset-0 opacity-5 bg-gradient-to-br",
              metric.color
            )} />
            
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg", metric.bgColor)}>
                  <Icon className={cn("h-5 w-5", metric.iconColor)} />
                </div>
                {metric.alert && (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(metric.value)}
                </p>
                <div className="flex items-center justify-between">
                  <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
                    {getTrendIcon(metric.trend, metric.isPositive)}
                    <span className="font-medium">
                      {formatPercentage(metric.change)}
                    </span>
                  </div>
                  {metric.label === 'Revenue' && (
                    <span className="text-xs text-muted-foreground">
                      vs last period
                    </span>
                  )}
                  {metric.label === 'Expenses' && (
                    <span className="text-xs text-muted-foreground">
                      current period
                    </span>
                  )}
                  {metric.label === 'Net Profit' && (
                    <span className="text-xs text-muted-foreground">
                      {data?.netProfit.current && data.netProfit.current > 0 ? 
                        `${((data.netProfit.current / (data.revenue?.current || 1)) * 100).toFixed(1)}% margin` :
                        'break even'
                      }
                    </span>
                  )}
                  {metric.label === 'Outstanding' && (
                    <span className="text-xs text-muted-foreground">
                      {data?.outstandingInvoices.current ? 
                        `${Math.ceil(data.outstandingInvoices.current / 1000)}+ invoices` :
                        'all clear'
                      }
                    </span>
                  )}
                </div>
              </div>
              
              {metric.alert && (
                <p className="mt-3 text-xs text-yellow-600 dark:text-yellow-500">
                  {metric.alert}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}