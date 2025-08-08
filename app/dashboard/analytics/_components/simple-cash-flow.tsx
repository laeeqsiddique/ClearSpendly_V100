"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react";

interface SimpleCashFlowProps {
  data?: {
    monthlyData: Array<{
      month: string;
      income: number;
      expenses: number;
      profit: number;
    }>;
    currentMonth: {
      income: number;
      expenses: number;
      profit: number;
    };
  };
  loading?: boolean;
}

export function SimpleCashFlow({ data, loading }: SimpleCashFlowProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cash Flow Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            Cash Flow Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No cash flow data available for selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  const avgProfit = data.monthlyData.length > 0 
    ? data.monthlyData.reduce((sum, m) => sum + m.profit, 0) / data.monthlyData.length 
    : 0;
  const isCurrentMonthGood = data.currentMonth.profit > avgProfit;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Cash Flow Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Current Month Overview */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-600">Money In</p>
            <p className="text-2xl font-bold text-green-700">${data.currentMonth.income.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-600">Money Out</p>
            <p className="text-2xl font-bold text-red-700">${data.currentMonth.expenses.toLocaleString()}</p>
          </div>
          <div className={`text-center p-3 rounded-lg border ${
            data.currentMonth.profit > 0 
              ? 'bg-muted/30' 
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm ${data.currentMonth.profit > 0 ? 'text-muted-foreground' : 'text-red-600'}`}>
              Net Profit
            </p>
            <p className={`text-2xl font-bold ${data.currentMonth.profit > 0 ? '' : 'text-red-700'}`}>
              ${data.currentMonth.profit.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Recent Months */}
        <div>
          <h4 className="font-medium mb-3">Recent Months</h4>
          <div className="space-y-2">
            {data.monthlyData.slice(-3).reverse().map((month, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm w-12">{month.month}</span>
                  <span className="text-sm text-muted-foreground">
                    ${month.income.toLocaleString()} in • ${month.expenses.toLocaleString()} out
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {month.profit > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`font-semibold ${month.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(month.profit).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Simple Insights */}
        <div className="mt-4 space-y-2">
          {data.currentMonth.profit < 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Expenses exceeded income this month</p>
                <p className="text-xs text-red-600">Consider reviewing your biggest expense categories</p>
              </div>
            </div>
          )}
          
          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="text-sm font-medium">💡 Business Tip</p>
            <p className="text-xs text-muted-foreground mt-1">
              Track your profit margin: This month you kept {data.currentMonth.income > 0 ? ((data.currentMonth.profit / data.currentMonth.income) * 100).toFixed(0) : 0}% of your income.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}