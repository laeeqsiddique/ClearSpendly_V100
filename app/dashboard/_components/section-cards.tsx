"use client";

import { IconTrendingDown, IconTrendingUp, IconAlertTriangle, IconReceipt, IconBuilding, IconCreditCard } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DashboardStats {
  totalSpending: number;
  totalSpendingChange: number;
  receiptsProcessed: number;
  receiptsProcessedChange: number;
  uniqueVendors: number;
  uniqueVendorsChange: number;
  priceAlerts: number;
  categorizedExpenses: {
    business: number;
    personal: number;
    office: number;
    travel: number;
    meals: number;
  };
  monthlyTrend: 'up' | 'down' | 'stable';
  // New fields for meaningful display
  topCategories: Array<{ name: string; amount: number }>;
  tagCoverage: number;
  unaccountedAmount: number;
  receiptsFullyTagged: number;
  receiptsNeedReview: number;
  topVendors: Array<{ name: string; count: number }>;
  previousPeriodTotal: number;
}

async function fetchDashboardStats(startDate?: string, endDate?: string): Promise<DashboardStats> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`/api/dashboard/stats?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch dashboard stats');
    }

    return result.data;
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    
    // Fallback to mock data if API fails
    return {
      totalSpending: 0,
      totalSpendingChange: 0,
      receiptsProcessed: 0,
      receiptsProcessedChange: 0,
      uniqueVendors: 0,
      uniqueVendorsChange: 0,
      priceAlerts: 0,
      categorizedExpenses: {
        business: 0,
        personal: 0,
        office: 0,
        travel: 0,
        meals: 0,
      },
      monthlyTrend: 'stable',
      // Default values for new fields
      topCategories: [],
      tagCoverage: 0,
      unaccountedAmount: 0,
      receiptsFullyTagged: 0,
      receiptsNeedReview: 0,
      topVendors: [],
      previousPeriodTotal: 0
    };
  }
}

interface SectionCardsProps {
  startDate?: string;
  endDate?: string;
}

export function SectionCards({ startDate, endDate }: SectionCardsProps = {}) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats(startDate, endDate)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
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

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-3">
      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconCreditCard className="h-4 w-4 text-green-600" />
            Total Spending
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            ${stats.totalSpending.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant={stats.totalSpendingChange > 0 ? "outline" : "secondary"}>
              {stats.totalSpendingChange > 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {stats.totalSpendingChange > 0 ? '+' : ''}{stats.totalSpendingChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.topCategories.length > 0 ? (
              stats.topCategories.map((cat, i) => (
                <span key={i}>
                  {cat.name}: ${cat.amount.toLocaleString()}
                  {i < stats.topCategories.length - 1 && ' • '}
                </span>
              ))
            ) : (
              'No categorized spending'
            )}
          </div>
          <div className="text-muted-foreground">
            {stats.tagCoverage}% tagged • ${stats.unaccountedAmount.toLocaleString()} unaccounted
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconReceipt className="h-4 w-4 text-purple-600" />
            Receipts Processed
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {stats.receiptsProcessed}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +{stats.receiptsProcessedChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.receiptsFullyTagged} fully tagged • {stats.receiptsNeedReview} need review
          </div>
          <div className="text-muted-foreground">
            {stats.receiptsProcessed === 0 ? 'No receipts this period' : 
             stats.receiptsNeedReview === 0 ? 'All receipts categorized ✓' : 
             'Some receipts need tags'}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconBuilding className="h-4 w-4 text-blue-600" />
            Unique Vendors
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {stats.uniqueVendors}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +{stats.uniqueVendorsChange}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.topVendors.length > 0 ? (
              stats.topVendors.map((vendor, i) => (
                <span key={i}>
                  {vendor.name} ({vendor.count})
                  {i < stats.topVendors.length - 1 && ' • '}
                </span>
              ))
            ) : (
              'No vendors this period'
            )}
          </div>
          <div className="text-muted-foreground">
            {stats.uniqueVendorsChange > 0 ? `${Math.abs(stats.uniqueVendorsChange)} new` : 
             stats.uniqueVendorsChange < 0 ? `${Math.abs(stats.uniqueVendorsChange)} fewer` : 
             'Same as last period'} vendors
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
