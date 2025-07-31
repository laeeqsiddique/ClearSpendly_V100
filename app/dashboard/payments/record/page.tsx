"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Using native HTML inputs instead of custom components
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Save,
  DollarSign,
  Calendar,
  CreditCard,
  User,
  FileText,
  AlertCircle,
  Plus,
  Minus
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
  client_id: string;
  total_amount: number;
  balance_due: number;
  issue_date: string;
  due_date: string;
  subject?: string;
}

interface InvoiceAllocation {
  invoice_id: string;
  amount: number;
  invoice?: Invoice;
}

function RecordPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedInvoiceId = searchParams.get('invoice');
  const [loading, setLoading] = useState(false);
  
  // Payment data
  const [paymentData, setPaymentData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    description: '',
    notes: '',
    category: 'invoice_payment'
  });
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [paymentType, setPaymentType] = useState<'invoice' | 'general'>('invoice');
  const [clients, setClients] = useState<Client[]>([]);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    fetchClients();
    
    // Handle preselected invoice
    if (preselectedInvoiceId) {
      fetchInvoiceDetails(preselectedInvoiceId);
    }
  }, [preselectedInvoiceId]);

  useEffect(() => {
    if (selectedClient && paymentType === 'invoice') {
      fetchClientInvoices(selectedClient.id);
    } else {
      setClientInvoices([]);
      setAllocations([]);
    }
  }, [selectedClient, paymentType]);

  const fetchInvoiceDetails = async (invoiceId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      const { data: invoice, error } = await supabase
        .from('invoice')
        .select(`
          *,
          client:client_id (*)
        `)
        .eq('tenant_id', membership.tenant_id)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      if (!invoice) return;

      // Set client and payment type
      setSelectedClient(invoice.client);
      setPaymentType('invoice');
      
      // Pre-fill amount with balance due
      setPaymentData(prev => ({ 
        ...prev, 
        amount: invoice.balance_due.toString() 
      }));
      
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error("Failed to load invoice details");
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

  const fetchClientInvoices = async (clientId: string) => {
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
        .from('invoice')
        .select('*')
        .eq('tenant_id', membership.tenant_id)
        .eq('client_id', clientId)
        .gt('balance_due', 0)
        .in('status', ['sent', 'viewed', 'overdue'])
        .order('issue_date');

      if (error) throw error;
      
      setClientInvoices(data || []);
      
      // Auto-select preselected invoice or single invoice
      if (data && data.length > 0) {
        if (preselectedInvoiceId) {
          const preselectedInvoice = data.find(inv => inv.id === preselectedInvoiceId);
          if (preselectedInvoice) {
            setAllocations([{
              invoice_id: preselectedInvoice.id,
              amount: preselectedInvoice.balance_due,
              invoice: preselectedInvoice
            }]);
          }
        } else if (data.length === 1) {
          setAllocations([{
            invoice_id: data[0].id,
            amount: 0,
            invoice: data[0]
          }]);
        }
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error("Failed to load client invoices");
    }
  };

  const handleInvoiceSelection = (invoiceId: string, checked: boolean) => {
    if (checked) {
      const invoice = clientInvoices.find(i => i.id === invoiceId);
      if (invoice) {
        setAllocations(prev => [...prev, {
          invoice_id: invoiceId,
          amount: 0,
          invoice
        }]);
      }
    } else {
      setAllocations(prev => prev.filter(a => a.invoice_id !== invoiceId));
    }
  };

  const updateAllocationAmount = (invoiceId: string, amount: number) => {
    setAllocations(prev => prev.map(allocation => 
      allocation.invoice_id === invoiceId 
        ? { ...allocation, amount } 
        : allocation
    ));
  };

  const autoAllocatePayment = () => {
    const totalAmount = parseFloat(paymentData.amount) || 0;
    let remainingAmount = totalAmount;
    
    const newAllocations = allocations.map(allocation => {
      if (remainingAmount <= 0 || !allocation.invoice) return { ...allocation, amount: 0 };
      
      const dueAmount = allocation.invoice.balance_due;
      const allocatedAmount = Math.min(remainingAmount, dueAmount);
      remainingAmount -= allocatedAmount;
      
      return { ...allocation, amount: allocatedAmount };
    });
    
    setAllocations(newAllocations);
  };

  const getTotalAllocated = () => {
    return allocations.reduce((sum, allocation) => sum + (allocation.amount || 0), 0);
  };

  const getRemainingUnallocated = () => {
    const totalAmount = parseFloat(paymentData.amount) || 0;
    return Math.max(0, totalAmount - getTotalAllocated());
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validation
      if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
        toast.error("Please enter a valid payment amount");
        return;
      }

      if (paymentType === 'invoice' && allocations.length === 0) {
        toast.error("Please select at least one invoice for payment allocation");
        return;
      }

      if (paymentType === 'invoice' && getTotalAllocated() > parseFloat(paymentData.amount)) {
        toast.error("Allocated amount cannot exceed payment amount");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error("No tenant membership found");

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payment')
        .insert({
          tenant_id: membership.tenant_id,
          user_id: user.id,
          payment_date: paymentData.payment_date,
          amount: parseFloat(paymentData.amount),
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number || null,
          client_id: selectedClient?.id || null,
          description: paymentData.description || null,
          notes: paymentData.notes || null,
          category: paymentType === 'invoice' ? 'invoice_payment' : paymentData.category
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create payment allocations if invoice payment
      if (paymentType === 'invoice' && allocations.length > 0) {
        const validAllocations = allocations
          .filter(a => a.amount > 0)
          .map(a => ({
            payment_id: payment.id,
            invoice_id: a.invoice_id,
            allocated_amount: a.amount
          }));

        if (validAllocations.length > 0) {
          const { error: allocationError } = await supabase
            .from('payment_allocation')
            .insert(validAllocations);

          if (allocationError) throw allocationError;
        }
      }

      toast.success("Payment recorded successfully!");
      router.push('/dashboard/payments');

    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error("Failed to record payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
                Record Payment
              </h1>
              <p className="text-muted-foreground">Record a new payment from a client</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/payments')} className="bg-white/80 backdrop-blur-sm">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              {loading ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Payment
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Payment Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Details */}
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
                      onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
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
                        placeholder="0.00"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
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
                      onValueChange={(value) => setPaymentData(prev => ({ ...prev, payment_method: value }))}
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
                      placeholder={
                        paymentData.payment_method === 'check' ? "Check number" :
                        paymentData.payment_method === 'bank_transfer' ? "Transaction ID" :
                        "Reference number"
                      }
                      value={paymentData.reference_number}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, reference_number: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client">Client (Optional)</Label>
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
              </CardContent>
            </Card>

            {/* Payment Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Payment Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="invoice"
                      name="paymentType"
                      value="invoice"
                      checked={paymentType === 'invoice'}
                      onChange={(e) => setPaymentType(e.target.value as 'invoice' | 'general')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <Label htmlFor="invoice" className="cursor-pointer">Apply to Invoice(s)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="general"
                      name="paymentType"
                      value="general"
                      checked={paymentType === 'general'}
                      onChange={(e) => setPaymentType(e.target.value as 'invoice' | 'general')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <Label htmlFor="general" className="cursor-pointer">General Payment (no specific invoice)</Label>
                  </div>
                </div>

                {paymentType === 'general' && (
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={paymentData.category}
                      onValueChange={(value) => setPaymentData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retainer">Retainer</SelectItem>
                        <SelectItem value="deposit">Deposit</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Payment for..."
                    value={paymentData.description}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes about this payment"
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Invoice Selection */}
            {paymentType === 'invoice' && selectedClient && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Apply to Invoices
                    </CardTitle>
                    {allocations.length > 0 && paymentData.amount && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={autoAllocatePayment}
                      >
                        Auto-Allocate
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {clientInvoices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No unpaid invoices for this client</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clientInvoices.map((invoice) => {
                        const allocation = allocations.find(a => a.invoice_id === invoice.id);
                        const isSelected = !!allocation;
                        
                        return (
                          <div key={invoice.id} className={`border rounded-lg p-4 ${isSelected ? 'border-blue-500 bg-blue-50' : ''}`}>
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleInvoiceSelection(invoice.id, e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <span className="font-medium">{invoice.invoice_number}</span>
                                    {invoice.subject && (
                                      <span className="text-sm text-gray-500 ml-2">- {invoice.subject}</span>
                                    )}
                                  </div>
                                  <Badge variant="secondary">
                                    Balance: ${invoice.balance_due.toFixed(2)}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm text-gray-500">
                                  <span>Issued: {format(new Date(invoice.issue_date), 'MMM dd, yyyy')}</span>
                                  <span>Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}</span>
                                </div>
                                
                                {isSelected && (
                                  <div className="mt-3">
                                    <Label htmlFor={`allocation-${invoice.id}`} className="text-sm">
                                      Allocate Amount
                                    </Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="relative flex-1">
                                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                          id={`allocation-${invoice.id}`}
                                          type="number"
                                          step="0.01"
                                          placeholder="0.00"
                                          value={allocation?.amount || ''}
                                          onChange={(e) => updateAllocationAmount(invoice.id, parseFloat(e.target.value) || 0)}
                                          className="pl-10"
                                        />
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateAllocationAmount(invoice.id, invoice.balance_due)}
                                      >
                                        Full
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Amount</span>
                    <span className="font-medium">
                      ${parseFloat(paymentData.amount || '0').toFixed(2)}
                    </span>
                  </div>
                  
                  {paymentType === 'invoice' && allocations.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        {allocations.map((allocation) => (
                          <div key={allocation.invoice_id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {allocation.invoice?.invoice_number}
                            </span>
                            <span>${(allocation.amount || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Allocated</span>
                        <span className="font-medium">${getTotalAllocated().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Unallocated</span>
                        <span className={`font-medium ${getRemainingUnallocated() > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                          ${getRemainingUnallocated().toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {paymentType === 'invoice' && getRemainingUnallocated() > 0 && paymentData.amount && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      <div className="text-sm text-red-800">
                        <p className="font-medium">Unallocated Amount: ${getRemainingUnallocated().toFixed(2)}</p>
                        <p className="text-xs mt-1">
                          All payment amounts must be allocated to invoices. Please either:
                        </p>
                        <ul className="text-xs mt-1 ml-3 list-disc space-y-1">
                          <li>Reduce payment amount to ${getTotalAllocated().toFixed(2)}</li>
                          <li>Allocate remaining amount to invoices</li>
                          <li>Use "General Payment" type for retainers/deposits</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Button 
                    className="w-full" 
                    onClick={handleSubmit} 
                    disabled={
                      loading || 
                      !paymentData.amount || 
                      parseFloat(paymentData.amount) <= 0 ||
                      (paymentType === 'invoice' && getRemainingUnallocated() > 0)
                    }
                  >
                    {loading ? (
                      <>
                        <Save className="w-4 h-4 mr-2 animate-spin" />
                        Recording Payment...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Record Payment
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecordPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <RecordPaymentContent />
    </Suspense>
  );
}