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
    <div className="space-y-6">
      {/* Date Range Filter - Matching main dashboard */}
      <div className="flex items-center justify-end gap-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg p-4">
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

      {/* Detailed Stats */}
      <InvoiceStats refreshTrigger={refreshTrigger} startDate={startDate} endDate={endDate} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
          onClick={handleNewInvoice}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Create New Invoice</h3>
            <p className="text-sm text-muted-foreground">Start a new invoice from template</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleManageClients}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Manage Clients</p>
                <p className="text-lg font-bold">Add & Edit</p>
                <p className="text-sm text-purple-600">Client information</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("templates")}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Invoice Templates</p>
                <p className="text-lg font-bold">Customize</p>
                <p className="text-sm text-blue-600">Design & settings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <div ref={tabsRef}>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Reminders
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Invoices</h3>
            <Button onClick={handleNewInvoice} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </div>
          <InvoiceList refreshTrigger={refreshTrigger} startDate={startDate} endDate={endDate} />
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Client Management</h3>
          </div>
          <ClientManagement 
            refreshTrigger={refreshTrigger} 
            openFormDirectly={openClientForm}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <InvoiceTemplatesRedesigned />
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <RemindersManager refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Invoice Analytics</h3>
            <Badge variant="secondary">
              Year: {new Date().getFullYear()}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Invoices Sent</span>
                    <span className="font-medium">8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Amount</span>
                    <span className="font-medium">$12,450</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Collected</span>
                    <span className="font-medium text-green-600">$8,300</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">vs Last Month</span>
                    <span className="font-medium text-green-600">+12%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Invoice</span>
                    <span className="font-medium">$1,556</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Collection Rate</span>
                    <span className="font-medium">88%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Payment Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Days to Pay</span>
                    <span className="font-medium">18 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fastest</span>
                    <span className="font-medium text-green-600">2 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Overdue Rate</span>
                    <span className="font-medium text-red-600">8%</span>
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