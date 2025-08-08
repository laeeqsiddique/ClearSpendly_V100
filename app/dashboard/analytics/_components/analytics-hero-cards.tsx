"use client";

import { DollarSign, Receipt, TrendingUp, Clock } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AnalyticsHeroCardsProps {
  data?: {
    revenue: {
      current: number;
      previous: number;
      change: number;
      trend: 'up' | 'down' | 'stable';
    };
    expenses: {
      current: number;
      previous: number;
      change: number;
      trend: 'up' | 'down' | 'stable';
    };
    netProfit: {
      current: number;
      previous: number;
      change: number;
      trend: 'up' | 'down' | 'stable';
    };
    outstandingInvoices: {
      current: number;
      previous: number;
      change: number;
      trend: 'up' | 'down' | 'stable';
    };
  };
  loading?: boolean;
}

export function AnalyticsHeroCards({ data, loading }: AnalyticsHeroCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-24"></div>
              <div className="h-8 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-32"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };


  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Revenue Card */}
      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            Revenue
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {formatCurrency(data.revenue.current)}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Expenses Card */}
      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-red-600" />
            Expenses
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
            {formatCurrency(data.expenses.current)}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Net Profit Card */}
      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            Net Profit
          </CardDescription>
          <CardTitle className={`text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r ${
            data.netProfit.current >= 0 
              ? 'from-purple-600 to-indigo-600' 
              : 'from-red-600 to-pink-600'
          } bg-clip-text text-transparent`}>
            {formatCurrency(data.netProfit.current)}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Outstanding Invoices Card */}
      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600" />
            Outstanding
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {formatCurrency(data.outstandingInvoices.current)}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}