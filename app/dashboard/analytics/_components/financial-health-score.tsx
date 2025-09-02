"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  DollarSign,
  Target
} from "lucide-react";

interface HealthMetrics {
  cashFlowHealth: number;
  expenseEfficiency: number;
  revenueGrowth: number;
  riskFactors: number;
}

interface FinancialHealthScoreProps {
  data?: {
    overallScore: number;
    metrics: HealthMetrics;
    recommendations: Array<{
      id: string;
      title: string;
      impact: 'high' | 'medium' | 'low';
      category: string;
      description: string;
    }>;
    trend: 'up' | 'down' | 'stable';
    previousScore?: number;
  };
  loading?: boolean;
}

export function FinancialHealthScore({ data, loading }: FinancialHealthScoreProps) {
  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Financial Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const mockData = data || {
    overallScore: 742,
    metrics: {
      cashFlowHealth: 85,
      expenseEfficiency: 78,
      revenueGrowth: 92,
      riskFactors: 15
    },
    recommendations: [
      {
        id: '1',
        title: 'Reduce unused subscriptions',
        impact: 'high' as const,
        category: 'Cost Optimization',
        description: 'Save $200/month by canceling 3 underutilized software subscriptions'
      },
      {
        id: '2',
        title: 'Improve invoice collection',
        impact: 'medium' as const,
        category: 'Cash Flow',
        description: 'Reduce average payment time from 32 to 25 days'
      }
    ],
    trend: 'up' as const,
    previousScore: 698
  };

  const getScoreColor = (score: number) => {
    if (score >= 800) return "text-green-600";
    if (score >= 600) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 800) return "Excellent";
    if (score >= 600) return "Good";
    if (score >= 400) return "Fair";
    return "Needs Attention";
  };

  const scoreDiff = mockData.previousScore ? mockData.overallScore - mockData.previousScore : 0;

  return (
    <Card className="col-span-full">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            <span className="text-base sm:text-lg">Financial Health Score</span>
          </div>
          {scoreDiff !== 0 && (
            <Badge variant={scoreDiff > 0 ? "default" : "destructive"} className="flex items-center gap-1 w-fit text-xs sm:text-sm">
              {scoreDiff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {scoreDiff > 0 ? '+' : ''}{scoreDiff}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Main Score Display */}
          <div className="flex flex-col items-center space-y-3 sm:space-y-4">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="rgb(229 231 235)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="rgb(139 69 255)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(mockData.overallScore / 1000) * 251.2} 251.2`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl sm:text-3xl font-bold tabular-nums ${getScoreColor(mockData.overallScore)}`}>
                  {mockData.overallScore}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {getScoreLabel(mockData.overallScore)}
                </span>
              </div>
            </div>
          </div>

          {/* Health Metrics Breakdown */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
              Health Metrics
            </h4>
            
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium">Cash Flow Health</span>
                <span className="text-xs sm:text-sm text-muted-foreground tabular-nums">{mockData.metrics.cashFlowHealth}%</span>
              </div>
              <Progress value={mockData.metrics.cashFlowHealth} className="h-1.5 sm:h-2" />
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium">Expense Efficiency</span>
                <span className="text-xs sm:text-sm text-muted-foreground tabular-nums">{mockData.metrics.expenseEfficiency}%</span>
              </div>
              <Progress value={mockData.metrics.expenseEfficiency} className="h-1.5 sm:h-2" />
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium">Revenue Growth</span>
                <span className="text-xs sm:text-sm text-muted-foreground tabular-nums">{mockData.metrics.revenueGrowth}%</span>
              </div>
              <Progress value={mockData.metrics.revenueGrowth} className="h-1.5 sm:h-2" />
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium">Risk Level</span>
                <span className="text-xs sm:text-sm text-muted-foreground tabular-nums">{mockData.metrics.riskFactors}%</span>
              </div>
              <Progress value={100 - mockData.metrics.riskFactors} className="h-1.5 sm:h-2" />
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
          <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide mb-3 sm:mb-4">
            Recommended Actions
          </h4>
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            {mockData.recommendations.map((rec) => (
              <div key={rec.id} className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-muted/50 rounded-lg">
                {rec.impact === 'high' ? (
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 mb-1">
                    <span className="font-medium text-xs sm:text-sm">{rec.title}</span>
                    <Badge variant="outline" className="text-xs w-fit">
                      {rec.impact} impact
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}