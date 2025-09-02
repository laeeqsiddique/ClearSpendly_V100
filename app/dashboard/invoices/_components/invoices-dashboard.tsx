"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  FileText, 
  Clock, 
  DollarSign, 
  Users, 
  Send,
  Settings,
  TrendingUp,
  Calendar,
  AlertCircle,
  CalendarDays
} from "lucide-react";
import { InvoiceStats } from "./invoice-stats";
import { InvoiceList } from "./invoice-list";
import { ClientManagement } from "./client-management";
import { InvoiceTemplatesRedesigned } from "./invoice-templates-redesigned";
import { RemindersManager } from "./reminders-manager";
import { createClient } from "@/lib/supabase/client";

export function InvoicesDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "invoices");
  const [openClientForm, setOpenClientForm] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  
  // Date filter states
  const [dateRange, setDateRange] = useState<string>('this-month');
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const supabase = createClient();

  const handleNewInvoice = () => {
    router.push('/dashboard/invoices/create');
  };

  const handleManageClients = () => {
    setActiveTab("clients");
    setOpenClientForm(true);
  };

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setOpenClientForm(false); // Reset form state when switching tabs
    
    // Update URL without scrolling
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    
    // Use window.history.replaceState to avoid router scroll behavior
    window.history.replaceState({}, '', url.toString());
  };

  // Handle date range changes - matching main dashboard
  const handleDateRangeChange = (preset: string) => {
    setDateRange(preset);
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
  
  // Initialize date range on component mount
  useEffect(() => {
    handleDateRangeChange('this-month');
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Date Range Filter - Mobile Optimized */}
      <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg p-3 sm:p-4">
        {/* Mobile: Stack vertically */}
        <div className="flex flex-col gap-3 sm:hidden">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Date Range</span>
          </div>
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-full border-purple-200 focus:border-purple-500 h-11">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="last-quarter">Last Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-blue-200 focus:border-blue-500 h-11"
                placeholder="Start date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-blue-200 focus:border-blue-500 h-11"
                placeholder="End date"
              />
            </div>
          )}
        </div>
        
        {/* Desktop: Horizontal layout */}
        <div className="hidden sm:flex items-center justify-end gap-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
            <Select value={dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-40 border-purple-200 focus:border-purple-500">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-quarter">This Quarter</SelectItem>
                <SelectItem value="last-quarter">Last Quarter</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            
            {dateRange === 'custom' && (
              <>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-auto border-blue-200 focus:border-blue-500"
                  placeholder="Start date"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-auto border-blue-200 focus:border-blue-500"
                  placeholder="End date"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <InvoiceStats refreshTrigger={refreshTrigger} startDate={startDate} endDate={endDate} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card 
          className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer active:scale-[0.98] min-h-[120px] sm:min-h-[140px]"
          onClick={handleNewInvoice}
        >
          <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2 sm:mb-4">
              <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Create New Invoice</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Start a new invoice from template</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98] min-h-[120px] sm:min-h-[140px]" onClick={handleManageClients}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Manage Clients</p>
                <p className="text-base sm:text-lg font-bold">Add & Edit</p>
                <p className="text-xs sm:text-sm text-purple-600">Client information</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98] min-h-[120px] sm:min-h-[140px] sm:col-span-2 lg:col-span-1" onClick={() => setActiveTab("templates")}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Invoice Templates</p>
                <p className="text-base sm:text-lg font-bold">Customize</p>
                <p className="text-xs sm:text-sm text-blue-600">Design & settings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <div ref={tabsRef}>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 sm:gap-0 h-auto p-1">
            <TabsTrigger value="invoices" className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Invoices</span>
              <span className="sm:hidden">Invoice</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Templates</span>
              <span className="sm:hidden">Template</span>
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Reminders</span>
              <span className="sm:hidden">Remind</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm col-span-2 sm:col-span-1">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base sm:text-lg font-semibold">Recent Invoices</h3>
              <Button onClick={handleNewInvoice} size="sm" className="w-full sm:w-auto min-h-[44px] touch-manipulation">
                <Plus className="w-4 h-4 mr-2" />
                <span className="text-sm sm:text-base">New Invoice</span>
              </Button>
            </div>
            <InvoiceList refreshTrigger={refreshTrigger} startDate={startDate} endDate={endDate} />
          </TabsContent>

          <TabsContent value="clients" className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold">Client Management</h3>
            </div>
            <ClientManagement 
              refreshTrigger={refreshTrigger} 
              openFormDirectly={openClientForm}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-3 sm:space-y-4">
            <InvoiceTemplatesRedesigned />
          </TabsContent>

          <TabsContent value="reminders" className="space-y-3 sm:space-y-4">
            <RemindersManager refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base sm:text-lg font-semibold">Invoice Analytics</h3>
              <Badge variant="secondary" className="w-fit text-xs sm:text-sm">
                Year: {new Date().getFullYear()}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Invoices Sent</span>
                      <span className="font-medium text-sm sm:text-base">8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Total Amount</span>
                      <span className="font-medium text-sm sm:text-base tabular-nums">$12,450</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Collected</span>
                      <span className="font-medium text-green-600 text-sm sm:text-base tabular-nums">$8,300</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    Growth
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">vs Last Month</span>
                      <span className="font-medium text-green-600 text-sm sm:text-base tabular-nums">+12%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Avg Invoice</span>
                      <span className="font-medium text-sm sm:text-base tabular-nums">$1,556</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Collection Rate</span>
                      <span className="font-medium text-sm sm:text-base tabular-nums">88%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="sm:col-span-2 lg:col-span-1">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                    Payment Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Avg Days to Pay</span>
                      <span className="font-medium text-sm sm:text-base tabular-nums">18 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Fastest</span>
                      <span className="font-medium text-green-600 text-sm sm:text-base tabular-nums">2 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Overdue Rate</span>
                      <span className="font-medium text-red-600 text-sm sm:text-base tabular-nums">8%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}