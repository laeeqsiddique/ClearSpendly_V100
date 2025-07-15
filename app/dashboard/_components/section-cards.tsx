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
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  // TODO: Replace with actual API call when backend is ready
  // Simulating realistic data based on recent receipt uploads
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    totalSpending: 2847.32,
    totalSpendingChange: 8.2,
    receiptsProcessed: 127,
    receiptsProcessedChange: 23,
    uniqueVendors: 42,
    uniqueVendorsChange: 5,
    priceAlerts: 3,
    categorizedExpenses: {
      business: 1420.50,
      personal: 1126.82,
      office: 180.00,
      travel: 89.50,
      meals: 30.50
    },
    monthlyTrend: 'up'
  };
}

export function SectionCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="@container/card animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-8 bg-muted rounded w-32"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconCreditCard className="h-4 w-4" />
            Total Spending
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
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
            {stats.totalSpendingChange > 0 ? 'Up' : 'Down'} from last month 
            {stats.totalSpendingChange > 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
          </div>
          <div className="text-muted-foreground">
            Business: ${stats.categorizedExpenses.business.toLocaleString()} • Personal: ${stats.categorizedExpenses.personal.toLocaleString()}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconReceipt className="h-4 w-4" />
            Receipts Processed
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
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
            More uploads this month <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Browser OCR + AI processing complete
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconBuilding className="h-4 w-4" />
            Unique Vendors
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
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
            New vendors discovered <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Auto-categorized with AI insights
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconAlertTriangle className="h-4 w-4" />
            Price Alerts
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.priceAlerts}
          </CardTitle>
          <CardAction>
            <Badge variant={stats.priceAlerts > 0 ? "destructive" : "secondary"}>
              <IconAlertTriangle />
              {stats.priceAlerts > 0 ? 'Active' : 'None'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.priceAlerts > 0 ? 'Price increases detected' : 'All prices stable'} 
            <IconAlertTriangle className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {stats.priceAlerts > 0 ? 'Review recommended' : 'AI monitoring active'}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
