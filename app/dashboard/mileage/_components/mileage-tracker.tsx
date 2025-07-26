"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Car, MapPin, Clock, DollarSign, Route, Settings } from "lucide-react";
import { MileageForm } from "./mileage-form";
import { MileageTable } from "./mileage-table";
import { MileageStats } from "./mileage-stats";
import { QuickTemplates } from "./quick-templates";
import { MonthlyView } from "./monthly-view";
import { ExportView } from "./export-view";
import { getCurrentIRSRate, formatIRSRate } from "../_utils/irs-rate";
import { createClient } from "@/lib/supabase/client";
import { IRSRateDialog } from "./irs-rate-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";

interface MileageLog {
  id: string;
  date: string;
  start_location: string;
  end_location: string;
  miles: number;
  purpose: string;
  business_purpose_category: string;
  notes?: string;
}

export function MileageTracker() {
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<MileageLog | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [irsRate, setIrsRate] = useState(0.655);
  const [showRateDialog, setShowRateDialog] = useState(false);
  
  // Date filtering state
  const [dateRange, setDateRange] = useState("this-month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const supabase = createClient();

  const handleMileageAdded = () => {
    setShowForm(false);
    setEditData(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEdit = (log: MileageLog) => {
    setEditData(log);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditData(null);
    setShowForm(true);
  };

  useEffect(() => {
    getCurrentIRSRate().then(setIrsRate);
    initializeDateRange();
  }, []);

  const initializeDateRange = () => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    setStartDate(formatDate(monthStart));
    setEndDate(formatDate(today));
  };

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
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        setStartDate(formatDate(weekStart));
        setEndDate(formatDate(today));
        break;
      case 'this-month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(formatDate(monthStart));
        setEndDate(formatDate(today));
        break;
      case 'last-month':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(formatDate(lastMonthStart));
        setEndDate(formatDate(lastMonthEnd));
        break;
      case 'this-quarter':
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        setStartDate(formatDate(quarterStart));
        setEndDate(formatDate(today));
        break;
      case 'last-quarter':
        const lastQuarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 - 3, 1);
        const lastQuarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 0);
        setStartDate(formatDate(lastQuarterStart));
        setEndDate(formatDate(lastQuarterEnd));
        break;
      case 'this-year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        setStartDate(formatDate(yearStart));
        setEndDate(formatDate(today));
        break;
      case 'last-year':
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
        setStartDate(formatDate(lastYearStart));
        setEndDate(formatDate(lastYearEnd));
        break;
      case 'custom':
        // Keep current dates for custom range
        break;
      default:
        initializeDateRange();
    }
  };

  const handleRateUpdated = () => {
    getCurrentIRSRate().then(setIrsRate);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Date Filter Header */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-end gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-800">Date Range:</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-auto border-purple-200 focus:border-purple-500">
                  <SelectValue />
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
                    className="w-auto border-purple-200 focus:border-purple-500"
                  />
                  <span className="text-purple-600">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-auto border-purple-200 focus:border-purple-500"
                  />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <MileageStats refreshTrigger={refreshTrigger} startDate={startDate} endDate={endDate} />

      {/* Quick Action Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Add Button */}
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={handleAddNew}>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Log New Trip</h3>
            <p className="text-sm text-muted-foreground">Quick mileage entry</p>
          </CardContent>
        </Card>

        {/* IRS Rate Info */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowRateDialog(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">IRS Rate {new Date().getFullYear()}</p>
                  <p className="text-2xl font-bold">{formatIRSRate(irsRate)}</p>
                  <p className="text-sm text-blue-600">per mile • Click to edit</p>
                </div>
              </div>
              <Settings className="w-4 h-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Templates */}
      <QuickTemplates onTemplateUsed={handleMileageAdded} refreshTrigger={refreshTrigger} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Trips
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            Monthly View
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Tax Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Trips</h3>
            <Button onClick={handleAddNew} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Trip
            </Button>
          </div>
          <MileageTable onEdit={handleEdit} refreshTrigger={refreshTrigger} startDate={startDate} endDate={endDate} />
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <MonthlyView refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <ExportView refreshTrigger={refreshTrigger} startDate={startDate} endDate={endDate} />
        </TabsContent>
      </Tabs>

      {/* Mileage Form Modal */}
      {showForm && (
        <MileageForm 
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditData(null);
          }}
          onSubmit={handleMileageAdded}
          editData={editData}
        />
      )}

      {/* IRS Rate Dialog */}
      <IRSRateDialog
        open={showRateDialog}
        onClose={() => setShowRateDialog(false)}
        onRateUpdated={handleRateUpdated}
        currentRate={irsRate}
      />
    </div>
  );
}