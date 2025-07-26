"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  CalendarDays, 
  Receipt, 
  Car, 
  FileText, 
  CreditCard, 
  Palette, 
  Settings,
  ArrowRight,
  Plus,
  Upload,
  Mail
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  expenses: {
    totalSpending: number;
    totalSpendingChange: number;
    receiptsProcessed: number;
    topCategories: Array<{ name: string; amount: number }>;
  };
  mileage: {
    totalMiles: number;
    totalDeduction: number;
    tripsLogged: number;
    topRoute: string;
    change: number;
  };
  invoices: {
    totalInvoiced: number;
    totalInvoices: number;
    paidInvoices: number;
    pendingAmount: number;
    collectionRate: number;
    change: number;
  };
  payments: {
    totalReceived: number;
    totalPayments: number;
    avgPaymentAmount: number;
    topPaymentMethod: string;
    change: number;
  };
}

const cardData = [
  {
    id: "expenses",
    title: "Expenses",
    description: "Track receipts & spending",
    icon: Receipt,
    href: "/dashboard/receipts",
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    gradient: "from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20",
    borderColor: "border-gray-200 hover:border-purple-300 dark:border-gray-700 dark:hover:border-purple-600"
  },
  {
    id: "mileage",
    title: "Mileage",
    description: "Log miles & deductions", 
    icon: Car,
    href: "/dashboard/mileage",
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    gradient: "from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20",
    borderColor: "border-gray-200 hover:border-purple-300 dark:border-gray-700 dark:hover:border-purple-600"
  },
  {
    id: "invoices",
    title: "Invoices", 
    description: "Create & send invoices",
    icon: FileText,
    href: "/dashboard/invoices",
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    gradient: "from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20",
    borderColor: "border-gray-200 hover:border-purple-300 dark:border-gray-700 dark:hover:border-purple-600"
  },
  {
    id: "payments",
    title: "Payments",
    description: "Record & track payments",
    icon: CreditCard,
    href: "/dashboard/payments",
    color: "text-purple-600", 
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    gradient: "from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20",
    borderColor: "border-gray-200 hover:border-purple-300 dark:border-gray-700 dark:hover:border-purple-600"
  },
  {
    id: "branding",
    title: "Branding",
    description: "Templates & styling",
    icon: Palette,
    href: "#", // Will be handled by button clicks instead
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/20", 
    gradient: "from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20",
    borderColor: "border-gray-200 hover:border-purple-300 dark:border-gray-700 dark:hover:border-purple-600"
  },
  {
    id: "settings",
    title: "Settings",
    description: "Account & preferences",
    icon: Settings,
    href: "/dashboard/admin",
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    gradient: "from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20", 
    borderColor: "border-gray-200 hover:border-purple-300 dark:border-gray-700 dark:hover:border-purple-600"
  }
];

export function MainDashboard() {
  // Initialize dates for "this-year" preset
  const initializeThisYearDates = () => {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    return {
      startDate: formatDate(yearStart),
      endDate: formatDate(today)
    };
  };

  const { startDate: initialStartDate, endDate: initialEndDate } = initializeThisYearDates();

  // Date range state
  const [dateRange, setDateRange] = useState<string>('this-year');
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [expensesRes, mileageRes, invoicesRes, paymentsRes] = await Promise.all([
          fetch(`/api/dashboard/stats?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/dashboard/mileage-stats?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/dashboard/invoice-stats?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/dashboard/payment-stats?startDate=${startDate}&endDate=${endDate}`)
        ]);

        const [expensesData, mileageData, invoicesData, paymentsData] = await Promise.all([
          expensesRes.json(),
          mileageRes.json(),
          invoicesRes.json(),
          paymentsRes.json()
        ]);

        if (expensesData.success && mileageData.success && invoicesData.success && paymentsData.success) {
          setStats({
            expenses: expensesData.data,
            mileage: mileageData.data,
            invoices: invoicesData.data,
            payments: paymentsData.data
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [startDate, endDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatValue = (cardId: string) => {
    if (!stats) return { primary: '$0', secondary: '', change: 0 };
    
    switch (cardId) {
      case 'expenses':
        return {
          primary: formatCurrency(stats.expenses.totalSpending),
          secondary: `${stats.expenses.receiptsProcessed} receipts`,
          change: stats.expenses.totalSpendingChange
        };
      case 'mileage':
        return {
          primary: `${stats.mileage.totalMiles.toLocaleString()} mi`,
          secondary: `${formatCurrency(stats.mileage.totalDeduction)} deduction`,
          change: stats.mileage.change
        };
      case 'invoices':
        return {
          primary: formatCurrency(stats.invoices.totalInvoiced),
          secondary: `${stats.invoices.totalInvoices} invoices, ${stats.invoices.collectionRate}% paid`,
          change: stats.invoices.change
        };
      case 'payments':
        return {
          primary: formatCurrency(stats.payments.totalReceived),
          secondary: `${stats.payments.totalPayments} payments received`,
          change: stats.payments.change
        };
      default:
        return { primary: '', secondary: '', change: 0 };
    }
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-transparent to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-300 opacity-20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-300 opacity-20 blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative p-6 min-h-screen">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex flex-col items-start justify-center gap-2">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
                >
                  Welcome to Flowvya
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-lg text-muted-foreground"
                >
                  Your complete financial workflow in one place
                </motion.p>
              </div>
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex gap-2"
              >
                <Button size="sm" asChild className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  <Link href="/dashboard/upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Add Receipt
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/invoices/create">
                    <Plus className="h-4 w-4 mr-2" />
                    New Invoice
                  </Link>
                </Button>
              </motion.div>
            </div>
            
            {/* Date Range Filter */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex items-center justify-end gap-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg p-4"
            >
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
            </motion.div>

            {/* Dashboard Cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {cardData.map((card, index) => {
                const statData = getStatValue(card.id);
                const Icon = card.icon;
                
                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    transition={{ duration: 0.5, delay: 0.4 + (index * 0.1) }}
                    viewport={{ once: true }}
                    className="group cursor-pointer"
                  >
                    {card.id === 'branding' ? (
                      // Branding Card - No Link wrapper, handled by buttons
                      <div className={`relative h-full overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border ${card.borderColor} shadow-sm hover:shadow-xl transition-all duration-300`}>
                        {/* Gradient background */}
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${card.gradient}`} />
                        
                        {/* Floating elements */}
                        <div className="absolute top-6 right-6 h-12 w-12 rounded-full bg-gradient-to-br from-purple-400/20 to-blue-400/20 blur-xl group-hover:scale-150 transition-transform duration-700" />
                        <div className="absolute bottom-6 left-6 h-8 w-8 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-lg group-hover:scale-125 transition-transform duration-500" />
                        
                        <div className="relative p-6">
                          {/* Icon with enhanced styling */}
                          <div className={`inline-flex rounded-2xl p-4 mb-4 ${card.bgColor} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                            <Icon className={`h-8 w-8 ${card.color} group-hover:scale-110 transition-transform duration-300`} />
                          </div>

                          {/* Enhanced content */}
                          <div className="space-y-3">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                              {card.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                              {card.description}
                            </p>

                            {/* Branding Card Buttons */}
                            <div className="pt-4 grid grid-cols-2 gap-2">
                              <Link href="/dashboard/invoice-templates">
                                <Button 
                                  size="sm" 
                                  className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-sm hover:shadow-md transition-all duration-200 text-xs"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Invoices
                                </Button>
                              </Link>
                              <Link href="/dashboard/email-templates">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950/50 transition-all duration-200 text-xs"
                                >
                                  <Mail className="h-3 w-3 mr-1" />
                                  Emails
                                </Button>
                              </Link>
                            </div>
                          </div>

                          {/* Animated bottom border */}
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                        </div>
                      </div>
                    ) : (
                      // Regular Cards - Link wrapper
                      <Link href={card.href}>
                        <div className={`relative h-full overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border ${card.borderColor} shadow-sm hover:shadow-xl transition-all duration-300`}>
                          {/* Gradient background */}
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${card.gradient}`} />
                          
                          {/* Floating elements */}
                          <div className="absolute top-6 right-6 h-12 w-12 rounded-full bg-gradient-to-br from-purple-400/20 to-blue-400/20 blur-xl group-hover:scale-150 transition-transform duration-700" />
                          <div className="absolute bottom-6 left-6 h-8 w-8 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-lg group-hover:scale-125 transition-transform duration-500" />
                          
                          <div className="relative p-6">
                            {/* Icon with enhanced styling */}
                            <div className={`inline-flex rounded-2xl p-4 mb-4 ${card.bgColor} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                              <Icon className={`h-8 w-8 ${card.color} group-hover:scale-110 transition-transform duration-300`} />
                            </div>

                            {/* Enhanced content */}
                            <div className="space-y-3">
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                                {card.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                                {card.description}
                              </p>

                              {/* Stats Display */}
                              {!loading && statData.primary && (card.id === 'expenses' || card.id === 'mileage' || card.id === 'invoices' || card.id === 'payments') && (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {statData.primary}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {statData.secondary}
                                  </div>
                                </div>
                              )}

                              {/* Navigation Arrow */}
                              <div className="flex items-center justify-between pt-2">
                                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium group-hover:text-purple-700 dark:group-hover:text-purple-300">
                                  View Details
                                </span>
                                <ArrowRight className="h-4 w-4 text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-300" />
                              </div>
                            </div>

                            {/* Animated bottom border */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                          </div>
                        </div>
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}