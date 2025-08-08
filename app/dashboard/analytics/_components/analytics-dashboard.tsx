"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeroMetrics } from "./hero-metrics";
import { RevenueChart } from "./revenue-chart";
import { ExpenseChart } from "./expense-chart";
import { ClientPerformance } from "./client-performance";
import { ProfitLossStatement } from "./profit-loss-statement";
import { QuickActions } from "./quick-actions";
import { SimpleExpenseBreakdown } from "./simple-expense-breakdown";
import { SimpleCashFlow } from "./simple-cash-flow";
import { UnpaidInvoices } from "./unpaid-invoices";
import { AnalyticsHeroCards } from "./analytics-hero-cards";
import { 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  Users,
  FileText,
  Download,
  Calendar,
  Target,
  Droplets,
  Zap,
  BarChart3
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format, startOfToday, startOfWeek, startOfMonth, startOfYear, subDays, subWeeks, subMonths } from "date-fns";
import { toast } from "sonner";

export function AnalyticsDashboard() {
  const [datePreset, setDatePreset] = useState<string>('this-month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [metricsData, setMetricsData] = useState<any>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [startDate, endDate]);
  
  // Initialize date range on component mount
  useEffect(() => {
    handleDatePresetChange('this-month');
  }, []);

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    switch (preset) {
      case 'today':
        setStartDate(formatDate(today));
        setEndDate(formatDate(today));
        break;
      case 'this-week':
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        setStartDate(formatDate(weekStart));
        setEndDate(formatDate(new Date()));
        break;
      case 'this-month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(formatDate(monthStart));
        setEndDate(formatDate(new Date()));
        break;
      case 'last-month':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(formatDate(lastMonthStart));
        setEndDate(formatDate(lastMonthEnd));
        break;
      case 'this-quarter':
        const currentQuarter = Math.floor(today.getMonth() / 3);
        const quarterStart = new Date(today.getFullYear(), currentQuarter * 3, 1);
        setStartDate(formatDate(quarterStart));
        setEndDate(formatDate(new Date()));
        break;
      case 'last-quarter':
        const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
        const lastQuarterStart = new Date(today.getFullYear() + (lastQuarter < 0 ? -1 : 0), (lastQuarter < 0 ? 3 : 0) + lastQuarter * 3, 1);
        const lastQuarterEnd = new Date(today.getFullYear() + (lastQuarter < 0 ? -1 : 0), (lastQuarter < 0 ? 3 : 0) + lastQuarter * 3 + 3, 0);
        setStartDate(formatDate(lastQuarterStart));
        setEndDate(formatDate(lastQuarterEnd));
        break;
      case 'this-year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        setStartDate(formatDate(yearStart));
        setEndDate(formatDate(new Date()));
        break;
      case 'last-year':
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
        setStartDate(formatDate(lastYearStart));
        setEndDate(formatDate(lastYearEnd));
        break;
      case 'custom':
        // Keep current dates
        break;
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append('from', startDate);
      }
      if (endDate) {
        params.append('to', endDate);
      }

      const response = await fetch(`/api/analytics/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setMetricsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };


  return (
    <section className="flex flex-col items-start justify-start p-6 w-full bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      <div className="w-full">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start justify-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Business Analytics
              </h1>
              <p className="text-muted-foreground">
                Track your business performance and insights for better decision making.
              </p>
            </div>
          </div>
          
          {/* Date Range Filter */}
          <div className="flex items-center justify-end gap-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
              <Select value={datePreset} onValueChange={handleDatePresetChange}>
                <SelectTrigger className="w-40 border-purple-200 focus:border-purple-500">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-quarter">This Quarter</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              
              {datePreset === 'custom' && (
                <>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-auto border-purple-200 focus:border-purple-500"
                    placeholder="Start date"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-auto border-purple-200 focus:border-purple-500"
                    placeholder="End date"
                  />
                </>
              )}
            </div>
          </div>
        </div>
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Hero Cards - Matching Dashboard Style */}
            <AnalyticsHeroCards data={metricsData?.heroMetrics} loading={loading} />

            {/* Quick Actions */}
            <QuickActions data={metricsData?.quickActions} />

            {/* Main Dashboard - Simple Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cash Flow Summary */}
              <SimpleCashFlow data={metricsData?.cashFlowData} loading={loading} />
              
              {/* Expense Breakdown */}
              <SimpleExpenseBreakdown data={metricsData?.expenseBreakdown} loading={loading} />
              
              {/* Outstanding Invoices */}
              <UnpaidInvoices data={metricsData?.unpaidInvoices} loading={loading} />
              
              {/* Client Performance (simplified) */}
              <ClientPerformance data={metricsData?.topClients} />
            </div>

            {/* Detailed Reports */}
            <div className="mt-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Detailed Reports</h2>
                <p className="text-muted-foreground">Deep dive into your business data with comprehensive reports and analysis.</p>
              </div>
              
              <Tabs defaultValue="expenses" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-white shadow-lg border rounded-lg">
                  <TabsTrigger 
                    value="expenses" 
                    className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white font-medium transition-all duration-200 hover:bg-gray-50 data-[state=active]:hover:bg-gradient-to-r data-[state=active]:hover:from-purple-700 data-[state=active]:hover:to-blue-700"
                  >
                    <Receipt className="h-5 w-5" />
                    <span className="text-sm font-semibold">Expenses</span>
                    <span className="text-xs opacity-70">Category breakdown</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="revenue" 
                    className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white font-medium transition-all duration-200 hover:bg-gray-50 data-[state=active]:hover:bg-gradient-to-r data-[state=active]:hover:from-purple-700 data-[state=active]:hover:to-blue-700"
                  >
                    <DollarSign className="h-5 w-5" />
                    <span className="text-sm font-semibold">Revenue</span>
                    <span className="text-xs opacity-70">Income trends</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="clients" 
                    className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white font-medium transition-all duration-200 hover:bg-gray-50 data-[state=active]:hover:bg-gradient-to-r data-[state=active]:hover:from-purple-700 data-[state=active]:hover:to-blue-700"
                  >
                    <Users className="h-5 w-5" />
                    <span className="text-sm font-semibold">Clients</span>
                    <span className="text-xs opacity-70">Performance</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pnl" 
                    className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white font-medium transition-all duration-200 hover:bg-gray-50 data-[state=active]:hover:bg-gradient-to-r data-[state=active]:hover:from-purple-700 data-[state=active]:hover:to-blue-700"
                  >
                    <FileText className="h-5 w-5" />
                    <span className="text-sm font-semibold">P&L Statement</span>
                    <span className="text-xs opacity-70">📊 Tax ready</span>
                  </TabsTrigger>
                </TabsList>

              <TabsContent value="expenses">
                <ExpenseChart data={metricsData?.expenseData} detailed />
              </TabsContent>

              <TabsContent value="revenue">
                <RevenueChart data={metricsData?.revenueData} detailed />
              </TabsContent>

              <TabsContent value="clients">
                <ClientPerformance data={metricsData?.clientData} detailed />
              </TabsContent>

              <TabsContent value="pnl">
                <ProfitLossStatement dateRange={{ from: startDate ? new Date(startDate) : undefined, to: endDate ? new Date(endDate) : undefined }} />
              </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}