"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  IconTrendingDown, 
  IconTrendingUp, 
  IconCurrencyDollar, 
  IconCalendar,
  IconClock,
  IconReceiptDollar,
  IconFileText
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";

interface InvoiceStats {
  thisMonth: {
    totalAmount: number;
    invoiceCount: number;
    paidAmount: number;
    pendingAmount: number;
  };
  lastMonth: {
    totalAmount: number;
    invoiceCount: number;
  };
  thisYear: {
    totalAmount: number;
    invoiceCount: number;
    paidAmount: number;
  };
  overdue: {
    count: number;
    amount: number;
  };
  quickStats: {
    total: number;
    pending: number;
    overdue: number;
    paid: number;
  };
}

interface InvoiceStatsProps {
  refreshTrigger?: number;
  startDate?: string;
  endDate?: string;
}

export function InvoiceStats({ refreshTrigger, startDate, endDate }: InvoiceStatsProps) {
  const [stats, setStats] = useState<InvoiceStats>({
    thisMonth: { totalAmount: 0, invoiceCount: 0, paidAmount: 0, pendingAmount: 0 },
    lastMonth: { totalAmount: 0, invoiceCount: 0 },
    thisYear: { totalAmount: 0, invoiceCount: 0, paidAmount: 0 },
    overdue: { count: 0, amount: 0 },
    quickStats: { total: 0, pending: 0, overdue: 0, paid: 0 }
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger, startDate, endDate]);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      const thisYearEnd = new Date(now.getFullYear(), 11, 31);

      // Apply date filter if provided, otherwise use default ranges
      const filterStartDate = startDate || thisMonthStart.toISOString().split('T')[0];
      const filterEndDate = endDate || now.toISOString().split('T')[0];

      // This month stats (or filtered period)
      let thisMonthQuery = supabase
        .from('invoice')
        .select('total_amount, amount_paid, status, issue_date')
        .eq('tenant_id', membership.tenant_id);
      
      if (startDate && endDate) {
        thisMonthQuery = thisMonthQuery
          .gte('issue_date', filterStartDate)
          .lte('issue_date', filterEndDate);
      } else {
        thisMonthQuery = thisMonthQuery
          .gte('issue_date', thisMonthStart.toISOString().split('T')[0])
          .lte('issue_date', thisMonthEnd.toISOString().split('T')[0]);
      }
      
      const { data: thisMonthData } = await thisMonthQuery;

      // Last month stats
      const { data: lastMonthData } = await supabase
        .from('invoice')
        .select('total_amount, issue_date')
        .eq('tenant_id', membership.tenant_id)
        .gte('issue_date', lastMonthStart.toISOString().split('T')[0])
        .lte('issue_date', lastMonthEnd.toISOString().split('T')[0]);

      // This year stats (or filtered period for year total)
      let thisYearQuery = supabase
        .from('invoice')
        .select('total_amount, amount_paid, status, issue_date')
        .eq('tenant_id', membership.tenant_id);
      
      if (startDate && endDate) {
        thisYearQuery = thisYearQuery
          .gte('issue_date', filterStartDate)
          .lte('issue_date', filterEndDate);
      } else {
        thisYearQuery = thisYearQuery
          .gte('issue_date', thisYearStart.toISOString().split('T')[0])
          .lte('issue_date', thisYearEnd.toISOString().split('T')[0]);
      }
      
      const { data: thisYearData } = await thisYearQuery;

      // Overdue invoices (within the filtered period)
      let overdueQuery = supabase
        .from('invoice')
        .select('total_amount, due_date, issue_date')
        .eq('tenant_id', membership.tenant_id)
        .in('status', ['sent', 'viewed'])
        .lt('due_date', now.toISOString().split('T')[0]);
      
      if (startDate && endDate) {
        overdueQuery = overdueQuery
          .gte('issue_date', filterStartDate)
          .lte('issue_date', filterEndDate);
      }
      
      const { data: overdueData } = await overdueQuery;

      // All invoices for quick stats (within the filtered period)
      let allInvoicesQuery = supabase
        .from('invoice')
        .select('status, total_amount, issue_date')
        .eq('tenant_id', membership.tenant_id);
      
      if (startDate && endDate) {
        allInvoicesQuery = allInvoicesQuery
          .gte('issue_date', filterStartDate)
          .lte('issue_date', filterEndDate);
      }
      
      const { data: allInvoices } = await allInvoicesQuery;

      // Calculate stats
      const calculateMonthStats = (data: any[]) => {
        if (!data || data.length === 0) return { totalAmount: 0, invoiceCount: 0, paidAmount: 0, pendingAmount: 0 };
        
        const totalAmount = data.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        const paidAmount = data.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
        const pendingAmount = totalAmount - paidAmount;
        
        return {
          totalAmount,
          invoiceCount: data.length,
          paidAmount,
          pendingAmount
        };
      };

      const calculateYearStats = (data: any[]) => {
        if (!data || data.length === 0) return { totalAmount: 0, invoiceCount: 0, paidAmount: 0 };
        
        const totalAmount = data.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        const paidAmount = data.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
        
        return {
          totalAmount,
          invoiceCount: data.length,
          paidAmount
        };
      };

      const calculateOverdueStats = (data: any[]) => {
        if (!data || data.length === 0) return { count: 0, amount: 0 };
        
        const amount = data.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        
        return {
          count: data.length,
          amount
        };
      };

      // Calculate quick stats
      const quickStats = allInvoices ? allInvoices.reduce((acc, inv) => {
        acc.total += 1;
        switch (inv.status) {
          case 'sent':
          case 'viewed':
            acc.pending += 1;
            break;
          case 'overdue':
            acc.overdue += 1;
            break;
          case 'paid':
            acc.paid += 1;
            break;
        }
        return acc;
      }, { total: 0, pending: 0, overdue: 0, paid: 0 }) : { total: 0, pending: 0, overdue: 0, paid: 0 };

      setStats({
        thisMonth: calculateMonthStats(thisMonthData),
        lastMonth: {
          totalAmount: lastMonthData?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
          invoiceCount: lastMonthData?.length || 0
        },
        thisYear: calculateYearStats(thisYearData),
        overdue: calculateOverdueStats(overdueData),
        quickStats
      });
    } catch (error) {
      console.error('Error fetching invoice stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGrowthPercentage = () => {
    if (stats.lastMonth.totalAmount === 0) return null;
    const growth = ((stats.thisMonth.totalAmount - stats.lastMonth.totalAmount) / stats.lastMonth.totalAmount) * 100;
    return Math.round(growth);
  };

  const getCollectionRate = () => {
    if (stats.thisYear.totalAmount === 0) return 0;
    return Math.round((stats.thisYear.paidAmount / stats.thisYear.totalAmount) * 100);
  };

  const growth = getGrowthPercentage();
  const collectionRate = getCollectionRate();

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

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconFileText className="h-4 w-4 text-blue-600" />
            Total Invoices {startDate && endDate && '(Filtered)'}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {stats.quickStats.total}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="h-3 w-3" />
              {stats.thisMonth.invoiceCount} this month
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <span className="text-orange-600">{stats.quickStats.pending} pending</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-green-600">{stats.quickStats.paid} paid</span>
          </div>
          <div className="text-muted-foreground">
            Revenue: ${stats.thisMonth.totalAmount.toFixed(0)}{startDate && endDate ? '' : '/mo'}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconReceiptDollar className="h-4 w-4 text-blue-600" />
            Collected This Month
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ${stats.thisMonth.paidAmount.toFixed(0)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              Collection Rate: {collectionRate}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            ${stats.thisMonth.pendingAmount.toFixed(0)} pending payment
          </div>
          <div className="text-muted-foreground">
            Year total: ${stats.thisYear.paidAmount.toFixed(0)}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconClock className="h-4 w-4 text-red-600" />
            Overdue Invoices
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            {stats.overdue.count}
          </CardTitle>
          <CardAction>
            <Badge variant={stats.overdue.count > 0 ? "destructive" : "secondary"}>
              ${stats.overdue.amount.toFixed(0)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.overdue.count > 0 ? 'Needs attention' : 'All current'}
          </div>
          <div className="text-muted-foreground">
            Follow up with clients
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconCalendar className="h-4 w-4 text-purple-600" />
            Year to Date
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            ${stats.thisYear.totalAmount.toFixed(0)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              Total Revenue
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.thisYear.invoiceCount} invoices • {collectionRate}% collected
          </div>
          <div className="text-muted-foreground">
            Track for Schedule C filing
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}