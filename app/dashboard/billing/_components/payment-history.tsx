"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  CreditCard, 
  Download, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface PaymentTransaction {
  id: string;
  subscription_id: string;
  tenant_id: string;
  transaction_type: 'charge' | 'refund' | 'dispute' | 'adjustment';
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  provider: 'stripe' | 'paypal';
  provider_transaction_id: string;
  provider_fee: number;
  billing_period_start?: string;
  billing_period_end?: string;
  description: string;
  failure_reason?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export function PaymentHistory() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      
      // This endpoint would need to be implemented
      const response = await fetch('/api/subscriptions/payment-history');
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.data || []);
      } else {
        // For now, show mock data
        setTransactions([
          {
            id: '1',
            subscription_id: 'sub_123',
            tenant_id: 'tenant_123',
            transaction_type: 'charge',
            amount: 19.99,
            currency: 'usd',
            status: 'succeeded',
            provider: 'stripe',
            provider_transaction_id: 'ch_123',
            provider_fee: 0.59,
            billing_period_start: '2024-01-01T00:00:00Z',
            billing_period_end: '2024-02-01T00:00:00Z',
            description: 'Payment for monthly subscription',
            metadata: {
              invoice_number: 'INV-001',
              hosted_invoice_url: 'https://stripe.com/invoice'
            },
            created_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '2',
            subscription_id: 'sub_123',
            tenant_id: 'tenant_123',
            transaction_type: 'charge',
            amount: 19.99,
            currency: 'usd',
            status: 'failed',
            provider: 'stripe',
            provider_transaction_id: 'ch_124',
            provider_fee: 0,
            billing_period_start: '2024-02-01T00:00:00Z',
            billing_period_end: '2024-03-01T00:00:00Z',
            description: 'Failed payment for monthly subscription',
            failure_reason: 'Your card was declined.',
            metadata: {},
            created_at: '2024-02-01T00:00:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'charge':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'refund':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'dispute':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'adjustment':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'stripe':
        return '💳';
      case 'paypal':
        return '🅿️';
      default:
        return '💵';
    }
  };

  const handleDownloadInvoice = (transaction: PaymentTransaction) => {
    const invoiceUrl = transaction.metadata?.hosted_invoice_url;
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank');
    } else {
      toast.error('Invoice not available for this transaction');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            Your subscription payment history and invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            Your subscription payment history and invoices
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPaymentHistory}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payment history</h3>
            <p className="text-muted-foreground">
              Your payment transactions will appear here once you have an active subscription.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {formatDate(transaction.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTransactionTypeColor(transaction.transaction_type)}>
                        {transaction.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={transaction.transaction_type === 'refund' ? 'text-green-600' : ''}>
                          {transaction.transaction_type === 'refund' ? '+' : ''}${transaction.amount.toFixed(2)}
                        </span>
                        {transaction.provider_fee > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Fee: ${transaction.provider_fee.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span>{getProviderIcon(transaction.provider)}</span>
                        <span className="capitalize text-sm">{transaction.provider}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm">{transaction.description}</p>
                        {transaction.failure_reason && (
                          <p className="text-xs text-red-600 mt-1">
                            {transaction.failure_reason}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {transaction.metadata?.hosted_invoice_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadInvoice(transaction)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Open provider transaction details
                            if (transaction.provider === 'stripe') {
                              window.open(`https://dashboard.stripe.com/payments/${transaction.provider_transaction_id}`, '_blank');
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}