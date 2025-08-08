"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Zap,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ROIInsightsProps {
  data?: {
    categoryROI: Array<{
      category: string;
      spent: number;
      revenueGenerated: number;
      roi: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    subscriptionAnalysis: Array<{
      name: string;
      monthlyCost: number;
      utilization: number;
      valueScore: number;
      recommendation: 'keep' | 'optimize' | 'cancel';
    }>;
    topPerformers: Array<{
      category: string;
      roi: number;
      amount: number;
    }>;
    savingsOpportunities: Array<{
      id: string;
      title: string;
      category: string;
      potentialSavings: number;
      difficulty: 'easy' | 'medium' | 'hard';
      description: string;
    }>;
  };
  loading?: boolean;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export function ROIInsights({ data, loading }: ROIInsightsProps) {
  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            ROI Insights & Cost Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
            <div className="mt-6 space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mock data for demonstration
  const mockData = data || {
    categoryROI: [
      { category: 'Software', spent: 2400, revenueGenerated: 8500, roi: 254, trend: 'up' as const },
      { category: 'Marketing', spent: 1800, revenueGenerated: 5200, roi: 189, trend: 'up' as const },
      { category: 'Equipment', spent: 3200, revenueGenerated: 4800, roi: 50, trend: 'stable' as const },
      { category: 'Office', spent: 1200, revenueGenerated: 0, roi: -100, trend: 'down' as const },
      { category: 'Travel', spent: 800, revenueGenerated: 2100, roi: 163, trend: 'stable' as const }
    ],
    subscriptionAnalysis: [
      { name: 'Design Software', monthlyCost: 99, utilization: 85, valueScore: 92, recommendation: 'keep' as const },
      { name: 'Project Management', monthlyCost: 49, utilization: 45, valueScore: 65, recommendation: 'optimize' as const },
      { name: 'Cloud Storage', monthlyCost: 29, utilization: 90, valueScore: 88, recommendation: 'keep' as const },
      { name: 'Analytics Tool', monthlyCost: 79, utilization: 15, valueScore: 25, recommendation: 'cancel' as const },
      { name: 'CRM Software', monthlyCost: 149, utilization: 78, valueScore: 85, recommendation: 'keep' as const }
    ],
    topPerformers: [
      { category: 'Software', roi: 254, amount: 2400 },
      { category: 'Marketing', roi: 189, amount: 1800 },
      { category: 'Travel', roi: 163, amount: 800 }
    ],
    savingsOpportunities: [
      {
        id: '1',
        title: 'Cancel Analytics Tool subscription',
        category: 'Software',
        potentialSavings: 948,
        difficulty: 'easy' as const,
        description: 'Low utilization (15%) - save $79/month'
      },
      {
        id: '2',
        title: 'Downgrade Project Management plan',
        category: 'Software',
        potentialSavings: 294,
        difficulty: 'medium' as const,
        description: 'Switch to basic plan - save $25/month'
      },
      {
        id: '3',
        title: 'Negotiate better rates with suppliers',
        category: 'Equipment',
        potentialSavings: 480,
        difficulty: 'hard' as const,
        description: 'Bulk discounts available - save ~15%'
      }
    ]
  };

  const totalPotentialSavings = mockData.savingsOpportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm">Spent: ${data.spent?.toLocaleString()}</p>
          <p className="text-sm">Generated: ${data.revenueGenerated?.toLocaleString()}</p>
          <p className="text-sm font-medium text-purple-600">ROI: {data.roi}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            ROI Insights & Cost Optimization
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            ${totalPotentialSavings.toLocaleString()} potential savings
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ROI by Category */}
          <div>
            <h4 className="font-semibold mb-4">ROI by Category</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockData.categoryROI}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="roi" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subscription Analysis */}
          <div>
            <h4 className="font-semibold mb-4">Subscription Value Analysis</h4>
            <div className="space-y-3">
              {mockData.subscriptionAnalysis.map((sub, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{sub.name}</span>
                      <Badge 
                        variant={sub.recommendation === 'keep' ? 'default' : 
                                sub.recommendation === 'optimize' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {sub.recommendation}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>${sub.monthlyCost}/mo</span>
                      <span>{sub.utilization}% used</span>
                      <span>Value: {sub.valueScore}/100</span>
                    </div>
                  </div>
                  {sub.recommendation === 'keep' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : sub.recommendation === 'optimize' ? (
                    <Zap className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div>
          <h4 className="font-semibold mb-4">Top Performing Categories</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockData.topPerformers.map((performer, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{performer.category}</span>
                    <Badge variant="default">{performer.roi}% ROI</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ${performer.amount.toLocaleString()} invested
                  </p>
                  <div className="mt-2">
                    <Progress value={Math.min(performer.roi, 300) / 3} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Savings Opportunities */}
        <div>
          <h4 className="font-semibold mb-4">Savings Opportunities</h4>
          <div className="space-y-3">
            {mockData.savingsOpportunities.map((opportunity) => (
              <div key={opportunity.id} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{opportunity.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {opportunity.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {opportunity.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{opportunity.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium text-green-600">
                      Save ${opportunity.potentialSavings}/year
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Take Action
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}