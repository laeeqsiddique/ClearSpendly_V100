"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lightbulb, TrendingUp, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Insight {
  type: 'increase' | 'decrease' | 'anomaly' | 'achievement' | 'warning';
  icon: string;
  message: string;
  severity: 'info' | 'warning' | 'success' | 'error';
}

interface InsightsData {
  insights: Insight[];
  periodInfo: {
    startDate: string;
    endDate: string;
    daysElapsed: number;
    daysInPeriod: number;
  };
}

async function fetchInsights(startDate?: string, endDate?: string): Promise<InsightsData | null> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`/api/dashboard/insights?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Failed to fetch insights:', error);
    return null;
  }
}

interface SpendingInsightsProps {
  startDate?: string;
  endDate?: string;
}

export function SpendingInsights({ startDate, endDate }: SpendingInsightsProps) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchInsights(startDate, endDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Spending Insights
            </span>
          </CardTitle>
          <CardDescription>AI-powered analysis of your expenses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.insights.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Spending Insights
            </span>
          </CardTitle>
          <CardDescription>AI-powered analysis of your expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No insights available yet.</p>
            <p className="text-xs mt-1">Upload more receipts to see trends!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Spending Insights
          </span>
        </CardTitle>
        <CardDescription>
          {data.periodInfo.daysElapsed} of {data.periodInfo.daysInPeriod} days analyzed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.insights.map((insight, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-sm ${getSeverityStyles(insight.severity)}`}
          >
            <span className="text-xl mt-0.5">{insight.icon}</span>
            <p className="text-sm leading-relaxed flex-1">{insight.message}</p>
          </div>
        ))}
        
        {data.insights.length < 4 && (
          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              More insights will appear as you add receipts
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}