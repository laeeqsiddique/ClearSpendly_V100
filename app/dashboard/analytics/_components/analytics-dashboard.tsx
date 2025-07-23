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
import { 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  Users,
  FileText,
  Download,
  Calendar
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

  const handleExport = async (type: 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams();
      params.append('format', type);
      
      if (startDate) {
        params.append('from', startDate);
      }
      if (endDate) {
        params.append('to', endDate);
      }

      const response = await fetch(`/api/analytics/export?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Analytics exported as ${type.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export analytics');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
            Business Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your business performance and insights
          </p>
        </div>
        
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
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleExport('excel')}
              title="Export to Excel"
              className="border-purple-200 hover:border-purple-300"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Metrics */}
      <HeroMetrics data={metricsData?.heroMetrics} loading={loading} />

      {/* Quick Actions */}
      <QuickActions data={metricsData?.quickActions} />

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Revenue</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Expenses</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clients</span>
          </TabsTrigger>
          <TabsTrigger value="pnl" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">P&L</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <RevenueChart data={metricsData?.revenueData} />
            <ExpenseChart data={metricsData?.expenseData} />
          </div>
          <ClientPerformance data={metricsData?.topClients} />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueChart data={metricsData?.revenueData} detailed />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpenseChart data={metricsData?.expenseData} detailed />
        </TabsContent>

        <TabsContent value="clients">
          <ClientPerformance data={metricsData?.clientData} detailed />
        </TabsContent>

        <TabsContent value="pnl">
          <ProfitLossStatement dateRange={{ from: startDate ? new Date(startDate) : undefined, to: endDate ? new Date(endDate) : undefined }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}