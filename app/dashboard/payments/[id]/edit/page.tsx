"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "../../../mileage/_components/confirmation-dialog";
import { 
  ArrowLeft,
  Save,
  DollarSign,
  Calendar,
  CreditCard,
  User,
  FileText,
  AlertCircle,
  Trash2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Client {
  id: string;
  name: string;
  email: string;
  company_name?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  balance_due: number;
  subject?: string;
}

interface PaymentAllocation {
  id: string;
  invoice_id: string;
  allocated_amount: number;
  invoice?: Invoice;
}

interface PaymentData {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  description?: string;
  notes?: string;
  category: string;
  client_id?: string;
  tenant_id: string;
}

export default function EditPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const paymentId = params?.id as string;
  
  const [loading, setLoading] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    if (paymentId) {
      loadPaymentData();
      fetchClients();
    }
  }, [paymentId]);

  const loadPaymentData = async () => {
    try {
      setLoadingPayment(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      // Fetch payment data with client info
      const { data: payment, error: paymentError } = await supabase
        .from('payment')
        .select(`
          *,
          client:client_id (*)
        `)
        .eq('id', paymentId)
        .eq('tenant_id', membership.tenant_id)
        .single();

      if (paymentError) throw paymentError;
      if (!payment) throw new Error("Payment not found");

      setPaymentData(payment);
      setSelectedClient(payment.client);

      // Fetch payment allocations with invoice details
      const { data: allocationsData, error: allocationsError } = await supabase
        .from('payment_allocation')
        .select(`
          *,
          invoice:invoice_id (
            id, invoice_number, total_amount, balance_due, subject
          )
        `)
        .eq('payment_id', paymentId);

      if (allocationsError) throw allocationsError;
      setAllocations(allocationsData || []);

    } catch (error) {
      console.error('Error loading payment:', error);
      toast.error("Failed to load payment data");
      router.push('/dashboard/payments');
    } finally {
      setLoadingPayment(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      const { data, error } = await supabase
        .from('client')
        .select('*')
        .eq('tenant_id', membership.tenant_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error("Failed to load clients");
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (!paymentData) return;

      // Validation
      if (paymentData.amount <= 0) {
        toast.error("Please enter a valid payment amount");
        return;
      }

      // Update payment
      const { error: paymentError } = await supabase
        .from('payment')
        .update({
          payment_date: paymentData.payment_date,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number || null,
          client_id: selectedClient?.id || null,
          description: paymentData.description || null,
          notes: paymentData.notes || null,
          category: paymentData.category,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      toast.success("Payment updated successfully!");
      router.push('/dashboard/payments');

    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error("Failed to update payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);

      // Delete payment (cascading will handle allocations)
      const { error } = await supabase
        .from('payment')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      toast.success("Payment deleted successfully!");
      router.push('/dashboard/payments');

    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error("Failed to delete payment");
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
    }
  };

  if (loadingPayment || !paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/payments')}
              className="bg-white/80 backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Payments
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Edit Payment
              </h1>
              <p className="text-muted-foreground">Update payment details</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(true)}
              className="bg-white/80 backdrop-blur-sm text-red-600 border-red-200 hover:bg-red-50"
              disabled={loading || deleteLoading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/payments')} className="bg-white/80 backdrop-blur-sm">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              {loading ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Payment
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Edit Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-date">Payment Date</Label>
                    <Input
                      id="payment-date"
                      type="date"
                      value={paymentData.payment_date}
                      onChange={(e) => setPaymentData(prev => prev ? { ...prev, payment_date: e.target.value } : null)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData(prev => prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Payment Method</Label>
                    <Select
                      value={paymentData.payment_method}
                      onValueChange={(value) => setPaymentData(prev => prev ? { ...prev, payment_method: value } : null)}
                    >
                      <SelectTrigger id="payment-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                        <SelectItem value="check">📝 Check</SelectItem>
                        <SelectItem value="cash">💵 Cash</SelectItem>
                        <SelectItem value="credit_card">💳 Credit Card</SelectItem>
                        <SelectItem value="paypal">🅿️ PayPal</SelectItem>
                        <SelectItem value="other">💰 Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference Number</Label>
                    <Input
                      id="reference"
                      placeholder="Reference number"
                      value={paymentData.reference_number || ''}
                      onChange={(e) => setPaymentData(prev => prev ? { ...prev, reference_number: e.target.value } : null)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select
                    value={selectedClient?.id || 'none'}
                    onValueChange={(value) => {
                      const client = value === 'none' ? null : clients.find(c => c.id === value) || null;
                      setSelectedClient(client);
                    }}
                  >
                    <SelectTrigger id="client">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client selected</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div>
                            <div className="font-medium">{client.name}</div>
                            {client.company_name && <div className="text-xs text-gray-500">{client.company_name}</div>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Payment for..."
                    value={paymentData.description || ''}
                    onChange={(e) => setPaymentData(prev => prev ? { ...prev, description: e.target.value } : null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes"
                    value={paymentData.notes || ''}
                    onChange={(e) => setPaymentData(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Invoice Allocations */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Applied to Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allocations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>This payment is not allocated to any invoices</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allocations.map((allocation) => (
                      <div key={allocation.id} className="border rounded-lg p-3 bg-blue-50">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{allocation.invoice?.invoice_number}</span>
                          <Badge variant="secondary">
                            ${allocation.allocated_amount.toFixed(2)}
                          </Badge>
                        </div>
                        {allocation.invoice?.subject && (
                          <p className="text-sm text-gray-600 mb-2">{allocation.invoice.subject}</p>
                        )}
                        <div className="text-xs text-gray-500">
                          Total: ${allocation.invoice?.total_amount.toFixed(2)} • 
                          Balance: ${allocation.invoice?.balance_due.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {allocations.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">Note</p>
                        <p className="text-xs mt-1">
                          Changing payment amount or deleting will affect invoice payment status.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Payment"
        description="Are you sure you want to delete this payment? This action cannot be undone and will affect any invoice payment status."
        confirmText="Delete Payment"
        isDestructive={true}
        loading={deleteLoading}
      />
    </div>
  );
}