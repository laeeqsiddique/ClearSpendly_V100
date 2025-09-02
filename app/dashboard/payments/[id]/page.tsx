"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  User,
  Building,
  Mail,
  Receipt,
  AlertTriangle
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PaymentData {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  description?: string;
  notes?: string;
  category: string;
  client: {
    id: string;
    name: string;
    email: string;
    company_name?: string;
  } | null;
}

interface PaymentAllocation {
  id: string;
  invoice_id: string;
  allocated_amount: number;
  invoice: {
    invoice_number: string;
    total_amount: number;
    balance_due: number;
    subject?: string;
  };
}

export default function PaymentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchPaymentDetails();
  }, [params.id]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      
      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        toast.error("Access denied");
        router.push('/dashboard');
        return;
      }

      // Fetch payment data
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment')
        .select(`
          *,
          client:client_id (
            id,
            name,
            email,
            company_name
          )
        `)
        .eq('id', params.id)
        .eq('tenant_id', membership.tenant_id)
        .single();

      if (paymentError) {
        if (paymentError.code === 'PGRST116') {
          toast.error("Payment not found");
          router.push('/dashboard/payments');
          return;
        }
        throw paymentError;
      }

      setPayment(paymentData);

      // Fetch payment allocations
      const { data: allocationsData, error: allocationsError } = await supabase
        .from('payment_allocation')
        .select(`
          *,
          invoice:invoice_id (
            invoice_number,
            total_amount,
            balance_due,
            subject
          )
        `)
        .eq('payment_id', params.id);

      if (allocationsError) throw allocationsError;
      setAllocations(allocationsData || []);

    } catch (error) {
      console.error('Error fetching payment:', error);
      toast.error("Failed to load payment details");
      router.push('/dashboard/payments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!payment || !confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payment')
        .delete()
        .eq('id', payment.id);

      if (error) throw error;
      
      toast.success("Payment deleted successfully");
      router.push('/dashboard/payments');
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error("Failed to delete payment");
    }
  };

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
        month: "long",
        day: "numeric", 
        year: "numeric"
      });
    }
    
    if (dateStr.includes('T')) {
      const datePart = dateStr.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    }
    
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6">
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="h-10 w-10 bg-gray-200 rounded-md"></div>
            <div className="h-8 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div className="space-y-6">
              <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6">
        <div className="container mx-auto py-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Payment not found or you don't have permission to view it.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/dashboard/payments')}
              className="bg-white/80 backdrop-blur-sm border-gray-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Payment Details
              </h1>
              <p className="text-sm text-muted-foreground">
                View payment information and allocations
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/payments/${payment.id}/edit`)}
              className="flex-1 sm:flex-none bg-white/80 backdrop-blur-sm"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Information */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Payment Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      Payment Date
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      {formatPaymentDate(payment.payment_date)}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Amount
                    </label>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-purple-600" />
                      Payment Method
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <Badge variant="secondary" className="text-sm">
                        {getMethodIcon(payment.payment_method)} {getMethodLabel(payment.payment_method)}
                      </Badge>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Category
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <Badge variant="outline">
                        {payment.category.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Reference Number */}
                {payment.reference_number && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Reference Number
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      {payment.reference_number}
                    </div>
                  </div>
                )}

                {/* Description */}
                {payment.description && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      {payment.description}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {payment.notes && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      {payment.notes}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Information */}
            {payment.client && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {payment.client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{payment.client.name}</div>
                      {payment.client.company_name && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building className="h-4 w-4" />
                          {payment.client.company_name}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        {payment.client.email}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Invoice Allocations */}
          <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-purple-600" />
                  Applied to Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allocations.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">Unallocated Payment</p>
                    <p className="text-sm text-gray-400">
                      This payment is not allocated to any invoices
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allocations.map((allocation) => (
                      <div key={allocation.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-blue-900">
                            {allocation.invoice.invoice_number}
                          </span>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {formatCurrency(allocation.allocated_amount)}
                          </Badge>
                        </div>
                        
                        {allocation.invoice.subject && (
                          <p className="text-sm text-blue-700 mb-2">
                            {allocation.invoice.subject}
                          </p>
                        )}
                        
                        <div className="text-xs text-blue-600 grid grid-cols-2 gap-2">
                          <span>Total: {formatCurrency(allocation.invoice.total_amount)}</span>
                          <span>Balance: {formatCurrency(allocation.invoice.balance_due)}</span>
                        </div>
                      </div>
                    ))}
                    
                    <Alert className="border-yellow-300 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        Editing this payment may affect the status of allocated invoices
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}