"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  History,
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  X,
  Sparkles,
  Activity,
  Receipt
} from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface PaymentHistoryItem {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  description?: string;
  allocated_amount: number;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: string;
  status: string;
  subject?: string;
}

interface InvoicePaymentHistoryProps {
  invoice: Invoice;
  trigger?: React.ReactNode;
}

export function InvoicePaymentHistory({ invoice, trigger }: InvoicePaymentHistoryProps) {
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (open) {
      fetchPaymentHistory();
    }
  }, [open, invoice.id]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('payment_allocation')
        .select(`
          id,
          allocated_amount,
          created_at,
          payment:payment_id (
            id,
            payment_date,
            amount,
            payment_method,
            reference_number,
            description,
            created_at
          )
        `)
        .eq('invoice_id', invoice.id);

      if (error) throw error;

      const formattedPayments = (data || []).map(allocation => ({
        id: allocation.payment.id,
        payment_date: allocation.payment.payment_date,
        amount: allocation.payment.amount,
        payment_method: allocation.payment.payment_method,
        reference_number: allocation.payment.reference_number,
        description: allocation.payment.description,
        allocated_amount: allocation.allocated_amount,
        created_at: allocation.created_at
      }));

      // Sort payments by actual payment_date in ascending order (chronological)
      formattedPayments.sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

      setPayments(formattedPayments);

    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error("Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch(method) {
      case 'bank_transfer': return '🏦';
      case 'check': return '📝';
      case 'cash': return '💵';
      case 'credit_card': return '💳';
      case 'paypal': return '🅿️';
      default: return '💰';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    return method.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'partial': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'overdue': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const calculatePaymentPercentage = (paidAmount: number, totalAmount: number) => {
    return Math.round((paidAmount / totalAmount) * 100);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300">
            <Activity className="w-4 h-4 mr-2" />
            Payment History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-5xl h-[95vh] max-h-[900px] p-0 flex flex-col bg-gradient-to-br from-slate-50 to-gray-100 border-0 shadow-2xl">
        <DialogHeader className="px-8 py-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white shrink-0 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                  Document Flow Timeline
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </DialogTitle>
                <p className="text-blue-100 text-base">
                  Invoice {invoice.invoice_number} • Complete payment history & timeline
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setOpen(false)}
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Invoice Summary */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50/50 border-b border-gray-100">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                Invoice Summary
                <div className="ml-auto">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    invoice.payment_status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : invoice.payment_status === 'partial'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {invoice.payment_status === 'partial' 
                      ? `${calculatePaymentPercentage(invoice.amount_paid, invoice.total_amount)}% Paid`
                      : invoice.payment_status.charAt(0).toUpperCase() + invoice.payment_status.slice(1)
                    }
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-xl border border-blue-200/50">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-200 rounded-lg shrink-0">
                        <DollarSign className="w-3 h-3 text-blue-700" />
                      </div>
                      <p className="text-xs font-medium text-blue-700">Total Amount</p>
                    </div>
                    <div className="pl-1">
                      <p className="text-lg font-bold text-blue-900">${invoice.total_amount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-4 rounded-xl border border-green-200/50">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-200 rounded-lg shrink-0">
                        <CheckCircle className="w-3 h-3 text-green-700" />
                      </div>
                      <p className="text-xs font-medium text-green-700">Amount Paid</p>
                    </div>
                    <div className="pl-1">
                      <p className="text-lg font-bold text-green-900">${invoice.amount_paid.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-4 rounded-xl border border-red-200/50">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-200 rounded-lg shrink-0">
                        <AlertCircle className="w-3 h-3 text-red-700" />
                      </div>
                      <p className="text-xs font-medium text-red-700">Balance Due</p>
                    </div>
                    <div className="pl-1">
                      <p className="text-lg font-bold text-red-900">${invoice.balance_due.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Payment Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Payment Progress</span>
                  <span>{calculatePaymentPercentage(invoice.amount_paid, invoice.total_amount)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${Math.min(100, calculatePaymentPercentage(invoice.amount_paid, invoice.total_amount))}%` 
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50/50 border-b border-purple-100">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                Document Flow & Timeline
                <div className="ml-auto flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Live Timeline</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Create chronological timeline combining invoice creation and payments */}
                  {(() => {
                    // Create timeline events array
                    const timelineEvents = [];

                    // Add invoice creation event
                    timelineEvents.push({
                      type: 'invoice_created',
                      date: new Date(invoice.issue_date),
                      data: invoice
                    });

                    // Add all payment events
                    payments.forEach(payment => {
                      timelineEvents.push({
                        type: 'payment_received',
                        date: new Date(payment.payment_date),
                        data: payment
                      });
                    });

                    // Sort all events by date in ascending order (chronological)
                    timelineEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

                    return timelineEvents.map((event, index) => {
                      const isLast = index === timelineEvents.length - 1;
                      
                      if (event.type === 'invoice_created') {
                        return (
                          <div key="invoice-created" className="flex items-start gap-6 group">
                            <div className="flex flex-col items-center relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200">
                                <FileText className="w-6 h-6 text-white" />
                              </div>
                              {!isLast && <div className="w-0.5 h-12 bg-gradient-to-b from-blue-300 to-gray-200 mt-2"></div>}
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-200 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              </div>
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="bg-gradient-to-r from-blue-50 to-transparent p-4 rounded-xl border border-blue-100/50">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                                      Invoice Created
                                      <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">Start</span>
                                    </h3>
                                    <p className="text-sm text-blue-700 mt-1">
                                      {event.data.subject || `Invoice ${event.data.invoice_number}`}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-blue-900">${event.data.total_amount.toFixed(2)}</p>
                                    <p className="text-sm text-blue-600 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {format(event.date, 'MMM dd, yyyy')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        const payment = event.data;
                        return (
                          <div key={payment.id} className="flex items-start gap-6 group">
                            <div className="flex flex-col items-center relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200">
                                <DollarSign className="w-6 h-6 text-white" />
                              </div>
                              {!isLast && <div className="w-0.5 h-12 bg-gradient-to-b from-green-300 to-gray-200 mt-2"></div>}
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-200 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                              </div>
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="bg-gradient-to-r from-green-50 to-transparent p-4 rounded-xl border border-green-100/50">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-2">
                                    <h3 className="font-semibold text-green-900 flex items-center gap-2">
                                      Payment Received
                                      <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full">+${payment.allocated_amount.toFixed(2)}</span>
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm">
                                      <div className="flex items-center gap-2 text-green-700">
                                        <span className="text-base">{getPaymentMethodIcon(payment.payment_method)}</span>
                                        <span className="font-medium">{getPaymentMethodLabel(payment.payment_method)}</span>
                                      </div>
                                      {payment.reference_number && (
                                        <div className="flex items-center gap-1 text-green-600">
                                          <span>•</span>
                                          <span className="font-mono text-xs bg-green-100 px-2 py-1 rounded">{payment.reference_number}</span>
                                        </div>
                                      )}
                                    </div>
                                    {payment.description && (
                                      <p className="text-sm text-green-700 bg-green-100/50 p-2 rounded-lg">{payment.description}</p>
                                    )}
                                    {payment.amount !== payment.allocated_amount && (
                                      <div className="bg-yellow-100 border border-yellow-200 p-2 rounded-lg">
                                        <p className="text-xs text-yellow-800">
                                          <strong>Partial Payment:</strong> ${payment.allocated_amount.toFixed(2)} of ${payment.amount.toFixed(2)} total payment
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-green-900">
                                      +${payment.allocated_amount.toFixed(2)}
                                    </p>
                                    <p className="text-sm text-green-600 flex items-center gap-1 justify-end">
                                      <Calendar className="w-3 h-3" />
                                      {format(event.date, 'MMM dd, yyyy')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    });
                  })()}

                  {/* No Payments Message */}
                  {payments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No payments received yet</p>
                      <p className="text-sm">Payment history will appear here once payments are recorded</p>
                    </div>
                  )}

                  {/* Current Status */}
                  {payments.length > 0 && (
                    <div className="flex items-start gap-6 group">
                      <div className="flex flex-col items-center relative">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 ${
                          invoice.payment_status === 'paid' 
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                            : 'bg-gradient-to-br from-yellow-500 to-amber-600'
                        }`}>
                          {invoice.payment_status === 'paid' 
                            ? <CheckCircle className="w-6 h-6 text-white" />
                            : <Clock className="w-6 h-6 text-white" />
                          }
                        </div>
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                          invoice.payment_status === 'paid' ? 'bg-green-200' : 'bg-yellow-200'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            invoice.payment_status === 'paid' ? 'bg-green-600' : 'bg-yellow-600 animate-pulse'
                          }`}></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className={`p-4 rounded-xl border ${
                          invoice.payment_status === 'paid' 
                            ? 'bg-gradient-to-r from-green-50 to-transparent border-green-100/50' 
                            : 'bg-gradient-to-r from-yellow-50 to-transparent border-yellow-100/50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className={`font-semibold flex items-center gap-2 ${
                                invoice.payment_status === 'paid' ? 'text-green-900' : 'text-yellow-900'
                              }`}>
                                {invoice.payment_status === 'paid' ? 'Fully Paid' : 'Partially Paid'}
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  invoice.payment_status === 'paid' 
                                    ? 'bg-green-200 text-green-800' 
                                    : 'bg-yellow-200 text-yellow-800'
                                }`}>
                                  {invoice.payment_status === 'paid' ? 'Complete' : 'Pending'}
                                </span>
                              </h3>
                              <p className={`text-sm mt-1 ${
                                invoice.payment_status === 'paid' ? 'text-green-700' : 'text-yellow-700'
                              }`}>
                                {invoice.payment_status === 'paid' 
                                  ? 'Invoice has been paid in full' 
                                  : `$${invoice.balance_due.toFixed(2)} remaining balance`
                                }
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${
                                invoice.payment_status === 'paid' ? 'text-green-900' : 'text-yellow-900'
                              }`}>
                                ${invoice.amount_paid.toFixed(2)} / ${invoice.total_amount.toFixed(2)}
                              </p>
                              <p className={`text-sm flex items-center gap-1 justify-end ${
                                invoice.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                              }`}>
                                <TrendingUp className="w-3 h-3" />
                                {calculatePaymentPercentage(invoice.amount_paid, invoice.total_amount)}% complete
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Timeline Footer */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/60 shadow-sm">
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Real-time Timeline</span>
              </div>
              <span className="text-gray-400">•</span>
              <span>Invoice: {invoice.invoice_number}</span>
              <span className="text-gray-400">•</span>
              <span>{payments.length} Payment{payments.length !== 1 ? 's' : ''} Recorded</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}