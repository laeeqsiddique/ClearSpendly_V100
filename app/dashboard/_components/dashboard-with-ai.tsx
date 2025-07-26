"use client";

import { useState, useEffect } from "react";
import { SectionCards } from "./section-cards";
import { ReceiptsTable } from "./receipts-table";
import { CategoryBreakdown } from "./category-breakdown";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload, CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import AIChatAgent from '@/components/ai-chat-agent';

export function DashboardWithAI() {
  // Initialize dates for "this-month" preset to prevent flicker
  const initializeThisMonthDates = () => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    return {
      startDate: formatDate(monthStart),
      endDate: formatDate(today)
    };
  };

  const { startDate: initialStartDate, endDate: initialEndDate } = initializeThisMonthDates();

  // Date range state - initialize with actual dates to prevent flicker
  const [dateRange, setDateRange] = useState<string>('this-month');
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);
  
  // Handle date preset changes
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

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      <div className="w-full">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start justify-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Expense Overview
              </h1>
              <p className="text-muted-foreground">
                Track your spending, manage expenses & receipts, and get AI-powered insights.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" asChild className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Link href="/dashboard/upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Add Receipt
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/add-expense">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manual Expense
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Date Range Filter */}
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
            <SectionCards startDate={startDate} endDate={endDate} />
            <ReceiptsTable startDate={startDate} endDate={endDate} />
            <CategoryBreakdown startDate={startDate} endDate={endDate} />
          </div>
        </div>
      </div>

      {/* AI Chat Agent */}
      <AIChatAgent />
    </section>
  );
}