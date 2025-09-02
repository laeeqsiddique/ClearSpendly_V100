"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, DollarSign } from "lucide-react";

interface ExpenseBreakdownProps {
  data?: {
    categories: Array<{
      category: string;
      amount: number;
      count: number;
    }>;
    totalExpenses: number;
  };
  loading?: boolean;
}

export function SimpleExpenseBreakdown({ data, loading }: ExpenseBreakdownProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Expense Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.categories) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-600" />
            Expense Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No expense data available for selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-bold text-sm sm:text-base">Expense Categories</span>
          </div>
          <Badge variant="outline" className="border-purple-200 text-purple-700 w-fit text-xs sm:text-sm">
            ${data.totalExpenses.toLocaleString()} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-3">
          {data.categories.map((category, index) => {
            const percentage = data.totalExpenses > 0 ? (category.amount / data.totalExpenses * 100).toFixed(1) : '0';
            return (
              <div key={index} className="p-3 sm:p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                <div className="space-y-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-semibold text-sm sm:text-base text-purple-900 truncate">{category.category}</span>
                    <span className="text-base sm:text-lg font-bold text-purple-700 tabular-nums">${category.amount.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex-1 bg-purple-100 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-medium text-purple-600">{percentage}%</span>
                      <span className="text-purple-500">({category.count} receipts)</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <p className="text-sm font-semibold text-purple-800">💡 Tax Tip</p>
          <p className="text-xs text-purple-600 mt-1">
            Keep all receipts organized by category for easy tax filing. Most business expenses are deductible.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}