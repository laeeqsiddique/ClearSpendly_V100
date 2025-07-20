"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  Link as LinkIcon, 
  Copy,
  ExternalLink,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Calendar,
  User
} from "lucide-react";
import { toast } from "sonner";

interface PaymentLinkManagerProps {
  open: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    total_amount: number;
    due_date: string;
    stripe_payment_link_id?: string;
    stripe_payment_link_url?: string;
    client: {
      name: string;
      email: string;
      company_name?: string;
    };
  } | null;
  onPaymentLinkUpdated?: () => void;
}

export function PaymentLinkManager({ open, onClose, invoice, onPaymentLinkUpdated }: PaymentLinkManagerProps) {
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [copying, setCopying] = useState(false);

  if (!invoice) return null;

  const hasPaymentLink = invoice.stripe_payment_link_id && invoice.stripe_payment_link_url;
  const canCreatePaymentLink = !hasPaymentLink && !['paid', 'cancelled'].includes(invoice.status);
  const canDeactivatePaymentLink = hasPaymentLink && invoice.status !== 'paid';

  const handleCreatePaymentLink = async () => {
    try {
      setCreating(true);

      const response = await fetch('/api/invoices/payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create payment link');
      }

      toast.success('Payment link created successfully!');
      onPaymentLinkUpdated?.();
      
    } catch (error) {
      console.error('Error creating payment link:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create payment link');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivatePaymentLink = async () => {
    try {
      setDeactivating(true);

      const response = await fetch('/api/invoices/payment-link', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to deactivate payment link');
      }

      toast.success('Payment link deactivated successfully!');
      onPaymentLinkUpdated?.();
      
    } catch (error) {
      console.error('Error deactivating payment link:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate payment link');
    } finally {
      setDeactivating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!invoice.stripe_payment_link_url) return;

    try {
      setCopying(true);
      await navigator.clipboard.writeText(invoice.stripe_payment_link_url);
      toast.success('Payment link copied to clipboard!');
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Failed to copy link');
    } finally {
      setCopying(false);
    }
  };

  const handleOpenLink = () => {
    if (invoice.stripe_payment_link_url) {
      window.open(invoice.stripe_payment_link_url, '_blank', 'noopener,noreferrer');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'sent':
      case 'viewed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const daysOverdue = invoice.due_date ? 
    Math.max(0, Math.ceil((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Link Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invoice Summary */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Invoice {invoice.invoice_number}</span>
                </div>
                <Badge className={getStatusColor(invoice.status)}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{invoice.client.name}</div>
                    <div className="text-gray-600">{invoice.client.email}</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Due Date</span>
                  </div>
                  <div className={`font-medium ${daysOverdue > 0 ? 'text-red-600' : ''}`}>
                    {new Date(invoice.due_date).toLocaleDateString()}
                    {daysOverdue > 0 && (
                      <span className="text-red-600 ml-1">({daysOverdue} days overdue)</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Amount</span>
                  </div>
                  <div className="font-medium">${invoice.total_amount.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Link Status */}
          {hasPaymentLink ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Payment link is active and ready to receive payments.
                </AlertDescription>
              </Alert>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <LinkIcon className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Active Payment Link</span>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 break-all">
                        {invoice.stripe_payment_link_url}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      disabled={copying}
                      className="flex-1"
                    >
                      {copying ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      Copy Link
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenLink}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {canDeactivatePaymentLink && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    You can deactivate this payment link to prevent new payments. This action cannot be undone.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {canCreatePaymentLink ? (
                <>
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Create a secure payment link that your client can use to pay this invoice online with their credit card or bank account.
                    </AlertDescription>
                  </Alert>

                  <Card className="border-dashed border-2">
                    <CardContent className="text-center py-8">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold mb-2">No Payment Link Created</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Create a payment link to allow online payments for this invoice.
                      </p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Alert className="border-gray-200 bg-gray-50">
                  <AlertCircle className="w-4 h-4 text-gray-600" />
                  <AlertDescription className="text-gray-800">
                    {invoice.status === 'paid' 
                      ? 'This invoice has been paid and does not need a payment link.'
                      : 'Payment links cannot be created for cancelled invoices.'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Features List */}
          <div className="space-y-2 text-sm text-gray-600">
            <h4 className="font-medium text-gray-900">Payment Link Features:</h4>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                Secure credit card and bank account payments
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                Automatic invoice status updates
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                Payment confirmation emails
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                Mobile-friendly payment experience
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          
          {canCreatePaymentLink && (
            <Button 
              onClick={handleCreatePaymentLink} 
              disabled={creating}
              className="min-w-[140px]"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Create Payment Link
                </>
              )}
            </Button>
          )}
          
          {canDeactivatePaymentLink && (
            <Button 
              variant="destructive"
              onClick={handleDeactivatePaymentLink} 
              disabled={deactivating}
              className="min-w-[120px]"
            >
              {deactivating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deactivate Link
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}