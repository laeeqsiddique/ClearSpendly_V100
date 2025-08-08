"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Droplets,
  Calendar,
  DollarSign
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface CashFlowForecastProps {
  data?: {
    currentBalance: number;
    projectedData: Array<{
      date: string;
      projected: number;
      actual?: number;
      inflow: number;
      outflow: number;
    }>;
    alerts: Array<{
      id: string;
      type: 'warning' | 'danger' | 'info';
      date: string;
      message: string;
      amount?: number;
    }>;
    runway: number; // days until cash runs out
  };
  loading?: boolean;
}

export function CashFlowForecast({ data, loading }: CashFlowForecastProps) {
  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            90-Day Cash Flow Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mock data for demonstration
  const mockData = data || {
    currentBalance: 45000,
    projectedData: [
      { date: 'Jan 15', projected: 45000, actual: 45000, inflow: 8000, outflow: 5200 },
      { date: 'Jan 22', projected: 47800, inflow: 12000, outflow: 6200 },
      { date: 'Jan 29', projected: 53600, inflow: 8500, outflow: 4800 },
      { date: 'Feb 5', projected: 57300, inflow: 15000, outflow: 7200 },
      { date: 'Feb 12', projected: 65100, inflow: 9000, outflow: 5400 },
      { date: 'Feb 19', projected: 68700, inflow: 11000, outflow: 6800 },
      { date: 'Feb 26', projected: 72900, inflow: 7500, outflow: 5200 },
      { date: 'Mar 5', projected: 75200, inflow: 13000, outflow: 8100 },
      { date: 'Mar 12', projected: 80100, inflow: 8000, outflow: 4900 },
      { date: 'Mar 19', projected: 83200, inflow: 10000, outflow: 6200 },
      { date: 'Mar 26', projected: 87000, inflow: 9500, outflow: 5500 },
      { date: 'Apr 2', projected: 91000, inflow: 12000, outflow: 7000 },
    ],
    alerts: [
      {
        id: '1',
        type: 'warning' as const,
        date: 'Feb 12',
        message: 'Large client payment ($15K) expected - monitor for delays',
        amount: 15000
      },
      {
        id: '2',
        type: 'info' as const,
        date: 'Mar 1',
        message: 'Quarterly tax payment due ($8K)',
        amount: 8000
      }
    ],
    runway: 180
  };

  const getRunwayColor = (days: number) => {
    if (days > 90) return "text-green-600";
    if (days > 30) return "text-yellow-600";
    return "text-red-600";
  };

  const getRunwayBadge = (days: number) => {
    if (days > 90) return { variant: "default" as const, label: "Healthy" };
    if (days > 30) return { variant: "secondary" as const, label: "Caution" };
    return { variant: "destructive" as const, label: "Critical" };
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-green-600">
            Inflow: +${data.inflow?.toLocaleString()}
          </p>
          <p className="text-sm text-red-600">
            Outflow: -${data.outflow?.toLocaleString()}
          </p>
          <p className="text-sm font-medium">
            Balance: ${data.projected?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const runwayBadge = getRunwayBadge(mockData.runway);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-600" />
            90-Day Cash Flow Forecast
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={runwayBadge.variant} className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {mockData.runway} days runway
            </Badge>
            <Badge variant="outline">
              ${mockData.currentBalance.toLocaleString()} current
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="h-64 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockData.projectedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={0} 
                stroke="red" 
                strokeDasharray="2 2" 
                label="Break Even"
              />
              <Line 
                type="monotone" 
                dataKey="projected" 
                stroke="rgb(59 130 246)" 
                strokeWidth={3}
                dot={{ fill: "rgb(59 130 246)", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "rgb(59 130 246)", strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="rgb(34 197 94)" 
                strokeWidth={2}
                dot={{ fill: "rgb(34 197 94)", r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projected Growth</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(mockData.projectedData[mockData.projectedData.length - 1]?.projected - mockData.currentBalance).toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Monthly Burn</p>
                  <p className="text-2xl font-bold text-red-600">
                    $5,600
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cash Runway</p>
                  <p className={`text-2xl font-bold ${getRunwayColor(mockData.runway)}`}>
                    {mockData.runway} days
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {mockData.alerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Cash Flow Alerts
            </h4>
            {mockData.alerts.map((alert) => (
              <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${
                alert.type === 'danger' ? 'bg-red-50 border-l-4 border-l-red-500' :
                alert.type === 'warning' ? 'bg-yellow-50 border-l-4 border-l-yellow-500' :
                'bg-blue-50 border-l-4 border-l-blue-500'
              }`}>
                <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                  alert.type === 'danger' ? 'text-red-500' :
                  alert.type === 'warning' ? 'text-yellow-500' :
                  'text-blue-500'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{alert.date}</span>
                    {alert.amount && (
                      <Badge variant="outline" className="text-xs">
                        ${alert.amount.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}