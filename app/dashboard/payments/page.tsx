"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardAction,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  Filter,
  DollarSign,
  Calendar,
  CalendarDays,
  CreditCard,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  User,
  Edit,
  Eye,
  MoreHorizontal
} from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  description?: string;
  category: string;
  client_name?: string;
  client_email?: string;
  client_company?: string;
  allocated_to?: string;
}

interface PaymentStats {
  total_received: number;
  total_pending: number;
  total_clients_paid: number;
  average_payment: number;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    total_received: 0,
    total_pending: 0,
    total_clients_paid: 0,
    average_payment: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState("this-month");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const supabase = createClient();

  useEffect(() => {
    updateDateRange(dateRange);
  }, [dateRange]);

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [startDate, endDate]);

  const updateDateRange = (range: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'this-week':
        start = new Date(today.setDate(today.getDate() - today.getDay()));
        end = new Date();
        break;
      case 'this-month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
        break;
      case 'last-month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'this-year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date();
        break;
      default:
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      let query = supabase
        .from('payment_summary')
        .select('*')
        .eq('tenant_id', membership.tenant_id);

      // Apply date filters
      if (startDate) {
        query = query.gte('payment_date', startDate);
      }
      if (endDate) {
        query = query.lte('payment_date', endDate);
      }

      const { data, error } = await query.order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

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

      // Fetch total received
      const { data: paymentsData } = await supabase
        .from('payment')
        .select('amount')
        .eq('tenant_id', membership.tenant_id);

      const totalReceived = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Fetch pending invoices
      const { data: invoicesData } = await supabase
        .from('invoice')
        .select('balance_due')
        .eq('tenant_id', membership.tenant_id)
        .gt('balance_due', 0);

      const totalPending = invoicesData?.reduce((sum, i) => sum + Number(i.balance_due), 0) || 0;

      // Count unique clients who have made payments
      const { data: clientsData } = await supabase
        .from('payment')
        .select('client_id')
        .eq('tenant_id', membership.tenant_id)
        .not('client_id', 'is', null);

      const uniqueClients = new Set(clientsData?.map(p => p.client_id)).size;

      setStats({
        total_received: totalReceived,
        total_pending: totalPending,
        total_clients_paid: uniqueClients,
        average_payment: paymentsData?.length ? totalReceived / paymentsData.length : 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !searchTerm || 
      payment.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMethod = methodFilter === "all" || payment.payment_method === methodFilter;
    
    return matchesSearch && matchesMethod;
  });

  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const getMethodIcon = (method: string) => {
    switch(method) {
      case 'bank_transfer': return '🏦';
      case 'check': return '📝';
      case 'cash': return '💵';
      case 'credit_card': return '💳';
      case 'paypal': return '🅿️';
      default: return '💰';
    }
  };

  const getMethodLabel = (method: string) => {
    return method.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatPaymentDate = (dateStr: string) => {
    if (!dateStr) return "Invalid Date";
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric", 
        year: "numeric"
      });
    }
    
    if (dateStr.includes('T')) {
      const datePart = dateStr.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    }
    
    return format(new Date(dateStr), 'MMM dd, yyyy');
  };

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      <div className="w-full">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start justify-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Payment Management
              </h1>
              <p className="text-muted-foreground">
                Track and manage all your business payments and client transactions.
              </p>
            </div>
            <Button 
              onClick={() => router.push('/dashboard/payments/record')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-11 px-4 touch-manipulation w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </div>
        </div>
        
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            
            {/* Date Range Filter */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-end gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-800">Date Range:</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={dateRange} onValueChange={handleDateRangeChange}>
                      <SelectTrigger className="w-full sm:w-auto sm:min-w-[120px] h-11 border-purple-200 focus:border-purple-500 touch-manipulation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent 
                        className="max-h-[60vh] w-full sm:w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]"
                        position="popper"
                        side="bottom"
                        align="start"
                        avoidCollisions={true}
                        sticky="always"
                      >
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="this-week">This Week</SelectItem>
                        <SelectItem value="this-month">This Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="this-year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
              <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardDescription className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Total Received (Selected Period)
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {formatCurrency(stats.total_received)}
                  </CardTitle>
                  <CardAction>
                    <Badge variant="secondary">
                      <CheckCircle />
                      Cash received
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    {formatNumber(payments.length)} payments received
                  </div>
                  <div className="text-muted-foreground">
                    Tracked in selected date range
                  </div>
                </CardFooter>
              </Card>

              <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    Pending Payments
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    {formatCurrency(stats.total_pending)}
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      Outstanding invoices
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Awaiting client payment
                  </div>
                  <div className="text-muted-foreground">
                    Invoice balance due amounts
                  </div>
                </CardFooter>
              </Card>

              <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardDescription className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    Unique Clients Paid
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    {formatNumber(stats.total_clients_paid)}
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      Active clients
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Clients who have paid
                  </div>
                  <div className="text-muted-foreground">
                    Unique client relationships
                  </div>
                </CardFooter>
              </Card>

              <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    Average Payment Amount
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {formatCurrency(stats.average_payment)}
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      Per transaction
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Payment size analysis
                  </div>
                  <div className="text-muted-foreground">
                    Average across all payments
                  </div>
                </CardFooter>
              </Card>
            </div>

            {/* Payments List */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                  <CardTitle className="text-lg sm:text-xl">Recent Payments</CardTitle>
                  
                  <div className="flex flex-col gap-3 w-full">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search payments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full h-11 touch-manipulation"
                      />
                    </div>
                    
                    <Select value={methodFilter} onValueChange={setMethodFilter}>
                      <SelectTrigger className="w-full sm:w-40 sm:min-w-[140px] h-11 touch-manipulation">
                        <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent 
                        className="max-h-[60vh] w-full sm:w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]"
                        position="popper"
                        side="bottom"
                        align="start"
                        avoidCollisions={true}
                        sticky="always"
                      >
                        <SelectItem value="all">All Methods</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 sm:p-6">
                {loading ? (
                  <div className="space-y-3 sm:space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-3 sm:space-x-4 animate-pulse">
                        <div className="h-3 sm:h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-20 sm:w-24"></div>
                        <div className="h-3 sm:h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-24 sm:w-32"></div>
                        <div className="h-3 sm:h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-16 sm:w-20"></div>
                        <div className="h-3 sm:h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-12 sm:w-16"></div>
                      </div>
                    ))}
                  </div>
                ) : paginatedPayments.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No payments found</h3>
                    <p className="text-sm sm:text-base text-gray-500 mb-4">
                      {searchTerm || methodFilter !== "all" 
                        ? "Try adjusting your filter criteria"
                        : "Record your first payment to get started"
                      }
                    </p>
                    {!searchTerm && methodFilter === "all" && (
                      <Button onClick={() => router.push('/dashboard/payments/record')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Record First Payment
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Mobile: Card Layout */}
                    <div className="block lg:hidden space-y-3">
                      {paginatedPayments.map((payment) => (
                        <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                          {/* Header Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="font-medium text-sm">{formatPaymentDate(payment.payment_date)}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {getMethodIcon(payment.payment_method)} {getMethodLabel(payment.payment_method)}
                              </Badge>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] p-2 touch-manipulation">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent 
                                align="end" 
                                className="w-48 max-w-[calc(100vw-2rem)] shadow-lg border-gray-200"
                                side="bottom"
                                sideOffset={8}
                                avoidCollisions={true}
                                sticky="always"
                              >
                                <DropdownMenuItem 
                                  onClick={() => router.push(`/dashboard/payments/${payment.id}`)}
                                  className="h-11 px-4 py-3 cursor-pointer touch-manipulation hover:bg-gray-100 focus:bg-gray-100"
                                >
                                  <Eye className="w-4 h-4 mr-3" />
                                  <span className="text-sm font-medium">View Details</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => router.push(`/dashboard/payments/${payment.id}/edit`)}
                                  className="h-11 px-4 py-3 cursor-pointer touch-manipulation hover:bg-gray-100 focus:bg-gray-100"
                                >
                                  <Edit className="w-4 h-4 mr-3" />
                                  <span className="text-sm font-medium">Edit Payment</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {/* Client Info */}
                          {payment.client_name && (
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">{payment.client_name}</div>
                                {payment.client_email && (
                                  <div className="text-xs text-gray-500 truncate">{payment.client_email}</div>
                                )}
                                {payment.client_company && (
                                  <div className="text-xs text-gray-500 truncate">{payment.client_company}</div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Payment Amount - Prominent */}
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(payment.amount)}
                            </div>
                            <div className="text-xs text-green-700 flex items-center justify-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Payment received
                            </div>
                          </div>
                          
                          {/* Details Grid */}
                          <div className="grid grid-cols-1 gap-3">
                            {/* Reference Number */}
                            {payment.reference_number && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  Reference:
                                </span>
                                <span className="font-medium">{payment.reference_number}</span>
                              </div>
                            )}
                            
                            {/* Category */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Category:</span>
                              <Badge variant="outline" className="text-xs">
                                {payment.category.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            {/* Allocation Info */}
                            <div className="border-t pt-3">
                              <div className="text-xs text-gray-600 font-medium mb-2">Invoice Allocation:</div>
                              {payment.allocated_to === 'Unallocated' ? (
                                <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300">
                                  💰 Unallocated funds
                                </Badge>
                              ) : (
                                <div className="space-y-1">
                                  {payment.allocated_to?.split(', ').slice(0, 3).map((allocation, idx) => (
                                    <div key={idx} className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded border-l-2 border-blue-200">
                                      📋 {allocation}
                                    </div>
                                  ))}
                                  {payment.allocated_to?.split(', ').length > 3 && (
                                    <div className="text-xs text-gray-500">+{payment.allocated_to.split(', ').length - 3} more allocations</div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Description if available */}
                            {payment.description && (
                              <div className="border-t pt-3">
                                <div className="text-xs text-gray-600 font-medium mb-1">Description:</div>
                                <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded">{payment.description}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Desktop: Table Layout */}
                    <div className="hidden lg:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead className="text-center">
                              <div className="text-xs font-semibold text-gray-700">Payment Amount</div>
                              <div className="text-xs font-normal text-gray-500">(Cash Received)</div>
                            </TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>
                              <div className="text-xs font-semibold text-gray-700">Applied To Invoices</div>
                              <div className="text-xs font-normal text-gray-500">(Allocation Details)</div>
                            </TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedPayments.map((payment) => (
                            <TableRow key={payment.id} className="hover:bg-muted/50 transition-colors">
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span>{formatPaymentDate(payment.payment_date)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {payment.client_name ? (
                                  <div className="flex items-center space-x-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <div>
                                      <div className="font-medium">{payment.client_name}</div>
                                      {payment.client_email && <div className="text-sm text-gray-500">{payment.client_email}</div>}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="font-semibold text-green-600 text-lg">
                                  {formatCurrency(payment.amount)}
                                </div>
                                <div className="text-xs text-gray-500">received</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="font-normal">
                                  {getMethodIcon(payment.payment_method)} {getMethodLabel(payment.payment_method)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm max-w-[120px] truncate" title={payment.reference_number}>
                                  {payment.reference_number || <span className="text-gray-500">—</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm max-w-[200px]">
                                  {payment.allocated_to === 'Unallocated' ? (
                                    <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300">
                                      💰 Unallocated
                                    </Badge>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-600 font-medium">Applied to:</div>
                                      {payment.allocated_to?.split(', ').slice(0, 2).map((allocation, idx) => (
                                        <div key={idx} className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded border-l-2 border-blue-200 truncate" title={allocation}>
                                          📋 {allocation}
                                        </div>
                                      ))}
                                      {payment.allocated_to?.split(', ').length > 2 && (
                                        <div className="text-xs text-gray-500">+{payment.allocated_to.split(', ').length - 2} more</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {payment.category.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">More actions</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => router.push(`/dashboard/payments/${payment.id}`)}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push(`/dashboard/payments/${payment.id}/edit`)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Payment
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
                        <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                          Showing {formatNumber(((currentPage - 1) * itemsPerPage) + 1)} to {formatNumber(Math.min(currentPage * itemsPerPage, filteredPayments.length))} of {formatNumber(filteredPayments.length)} payments
                        </div>
                        <div className="flex items-center justify-center sm:justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="h-10 px-4 touch-manipulation"
                          >
                            Previous
                          </Button>
                          <span className="text-sm px-2">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="h-10 px-4 touch-manipulation"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}