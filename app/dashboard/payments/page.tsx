"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const supabase = createClient();

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, []);

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

      const { data, error } = await supabase
        .from('payment_summary')
        .select('*')
        .eq('tenant_id', membership.tenant_id)
        .order('payment_date', { ascending: false });

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Payment Management
            </h1>
            <p className="text-muted-foreground">Track and manage all your payments</p>
          </div>
          <Button 
            onClick={() => router.push('/dashboard/payments/record')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Received</p>
                  <p className="text-2xl font-bold">${stats.total_received.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Payments</p>
                  <p className="text-2xl font-bold">${stats.total_pending.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clients Paid</p>
                  <p className="text-2xl font-bold">{stats.total_clients_paid}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Payment</p>
                  <p className="text-2xl font-bold">${stats.average_payment.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments List */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle>Recent Payments</CardTitle>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search payments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
          
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-24"></div>
                    <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-32"></div>
                    <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-20"></div>
                    <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : paginatedPayments.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || methodFilter !== "all" 
                    ? "Try adjusting your filters"
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-center">
                          <div>Payment Amount</div>
                          <div className="text-xs font-normal text-gray-500">(Cash Received)</div>
                        </TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>
                          <div>Applied To Invoices</div>
                          <div className="text-xs font-normal text-gray-500">(Allocation Details)</div>
                        </TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPayments.map((payment) => (
                        <TableRow key={payment.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            {payment.client_name ? (
                              <div>
                                <div className="font-medium">{payment.client_name}</div>
                                {payment.client_email && <div className="text-sm text-gray-500">{payment.client_email}</div>}
                              </div>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-semibold text-green-600 text-lg">
                              ${payment.amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">received</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">
                              {getMethodIcon(payment.payment_method)} {getMethodLabel(payment.payment_method)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payment.reference_number || <span className="text-gray-500">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm max-w-xs">
                              {payment.allocated_to === 'Unallocated' ? (
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300">
                                    💰 Unallocated
                                  </Badge>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="text-xs text-gray-600 font-medium">Applied to:</div>
                                  {payment.allocated_to?.split(', ').map((allocation, idx) => (
                                    <div key={idx} className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded border-l-2 border-blue-200">
                                      📋 {allocation}
                                    </div>
                                  ))}
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
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} payments
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
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
  );
}