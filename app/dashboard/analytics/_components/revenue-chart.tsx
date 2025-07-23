"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ComposedChart,
  Line,
  LineChart
} from "recharts";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueChartProps {
  data?: any[];
  detailed?: boolean;
}

export function RevenueChart({ data, detailed = false }: RevenueChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!data) {
    return (
      <Card className={detailed ? "col-span-full" : ""}>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={detailed ? "col-span-full" : ""}>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>No revenue data available for selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            <p>No revenue data to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(item => ({
    month: format(new Date(item.month), 'MMM yyyy'),
    revenue: item.revenue || 0,
    invoices: item.invoice_count || 0,
    avgInvoice: item.avg_invoice || 0
  }));

  return (
    <Card className={detailed ? "col-span-full" : ""}>
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
        <CardDescription>
          {detailed ? "Detailed revenue analysis with invoice metrics" : "Monthly revenue over time"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            {detailed ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `$${(value / 1000).toFixed(0)}k`;
                    }
                    return `$${value.toFixed(0)}`;
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="revenue" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                  name="Total Revenue"
                />
                <Bar 
                  dataKey="avgInvoice" 
                  fill="#8b5cf6" 
                  radius={[4, 4, 0, 0]}
                  name="Avg Invoice"
                />
              </BarChart>
            ) : (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `$${(value / 1000).toFixed(0)}k`;
                    }
                    return `$${value.toFixed(0)}`;
                  }}
                  domain={['dataMin', 'dataMax']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#colorRevenue)"
                  name="Revenue"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#059669', strokeWidth: 2 }}
                />
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {detailed && chartData.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">
                {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0))}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold">
                {chartData.reduce((sum, item) => sum + item.invoices, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Invoice Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  chartData.reduce((sum, item) => sum + item.revenue, 0) / 
                  chartData.reduce((sum, item) => sum + item.invoices, 0) || 0
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}