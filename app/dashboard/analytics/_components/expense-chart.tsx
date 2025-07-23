"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ExpenseChartProps {
  data?: Record<string, number>;
  detailed?: boolean;
}

const COLORS = [
  '#8b5cf6', // Purple
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
];

export function ExpenseChart({ data, detailed = false }: ExpenseChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm">
            Amount: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm text-muted-foreground">
            {((payload[0].value / totalExpenses) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data) {
    return (
      <Card className={detailed ? "col-span-full" : ""}>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Distribution by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (Object.keys(data).length === 0) {
    return (
      <Card className={detailed ? "col-span-full" : ""}>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>No expense data available for selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            <p>No expense data to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = Object.entries(data)
    .map(([category, amount]) => ({
      name: category,
      value: amount
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, detailed ? 10 : 6); // Show more categories in detailed view

  const totalExpenses = chartData.reduce((sum, item) => sum + item.value, 0);

  const renderCustomLabel = (entry: any) => {
    const percent = ((entry.value / totalExpenses) * 100).toFixed(0);
    return `${percent}%`;
  };

  return (
    <Card className={detailed ? "col-span-full" : ""}>
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>
          {detailed ? "Top expense categories with detailed analysis" : "Distribution by category"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          {detailed ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number"
                  tick={{ fill: 'currentColor' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'currentColor' }}
                  width={120}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry: any) => (
                    <span className="text-sm">
                      {value}: {formatCurrency(entry.value)}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        
        {detailed && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Total Expenses</p>
              <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="space-y-2">
              {chartData.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({((item.value / totalExpenses) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}