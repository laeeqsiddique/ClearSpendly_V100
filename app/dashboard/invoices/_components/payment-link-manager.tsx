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
  User,
  Wallet,
  Plus
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
    paypal_payment_link_id?: string;
    paypal_payment_link_url?: string;
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
  const [selectedProvider, setSelectedProvider] = useState<'stripe' | 'paypal' | null>(null);

  if (!invoice) return null;

  const hasStripeLink = invoice.stripe_payment_link_id && invoice.stripe_payment_link_url;
  const hasPayPalLink = invoice.paypal_payment_link_id && invoice.paypal_payment_link_url;
  const hasAnyPaymentLink = hasStripeLink || hasPayPalLink;
  const canCreatePaymentLink = !['paid', 'cancelled'].includes(invoice.status);
  const canDeactivatePaymentLink = hasAnyPaymentLink && invoice.status !== 'paid';

  const handleCreatePaymentLink = async (provider: 'stripe' | 'paypal') => {
    try {
      setCreating(true);
      setSelectedProvider(provider);

      const endpoint = provider === 'paypal' ? '/api/invoices/paypal-payment-link' : '/api/invoices/payment-link';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          provider
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to create ${provider} payment link`);
      }

      toast.success(`${provider === 'paypal' ? 'PayPal' : 'Stripe'} payment link created successfully!`);
      onPaymentLinkUpdated?.();
      
    } catch (error) {
      console.error(`Error creating ${provider} payment link:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to create ${provider} payment link`);
    } finally {
      setCreating(false);
      setSelectedProvider(null);
    }
  };

  const handleDeactivatePaymentLink = async (provider: 'stripe' | 'paypal') => {
    try {
      setDeactivating(true);

      const endpoint = provider === 'paypal' ? '/api/invoices/paypal-payment-link' : '/api/invoices/payment-link';
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          provider
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to deactivate ${provider} payment link`);
      }

      toast.success(`${provider === 'paypal' ? 'PayPal' : 'Stripe'} payment link deactivated successfully!`);
      onPaymentLinkUpdated?.();
      
    } catch (error) {
      console.error(`Error deactivating ${provider} payment link:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to deactivate ${provider} payment link`);
    } finally {
      setDeactivating(false);
    }
  };

  const handleCopyLink = async (provider: 'stripe' | 'paypal') => {
    const linkUrl = provider === 'paypal' ? invoice.paypal_payment_link_url : invoice.stripe_payment_link_url;
    if (!linkUrl) return;

    try {
      setCopying(true);
      await navigator.clipboard.writeText(linkUrl);
      toast.success(`${provider === 'paypal' ? 'PayPal' : 'Stripe'} payment link copied to clipboard!`);
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Failed to copy link');
    } finally {
      setCopying(false);
    }
  };

  const handleOpenLink = (provider: 'stripe' | 'paypal') => {
    const linkUrl = provider === 'paypal' ? invoice.paypal_payment_link_url : invoice.stripe_payment_link_url;
    if (linkUrl) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          {hasAnyPaymentLink ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Payment links are active and ready to receive payments.
                </AlertDescription>
              </Alert>

              {/* Stripe Payment Link */}
              {hasStripeLink && (
                <Card className="bg-white/70 backdrop-blur-sm border border-blue-200/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Stripe Payment Link</span>
                      <Badge variant="secondary" className="text-xs">Card Payments</Badge>
                    </div>
                    
                    <div className="bg-blue-50/50 p-3 rounded-lg mb-4 border border-blue-200/50">
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
                        onClick={() => handleCopyLink('stripe')}
                        disabled={copying}
                        className="flex-1 border-blue-200 hover:bg-blue-50"
                      >
                        {copying ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        Copy Stripe Link
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenLink('stripe')}
                        className="border-blue-200 hover:bg-blue-50"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>

                      {canDeactivatePaymentLink && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeactivatePaymentLink('stripe')}
                          disabled={deactivating}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PayPal Payment Link */}
              {hasPayPalLink && (
                <Card className="bg-white/70 backdrop-blur-sm border border-purple-200/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Wallet className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">PayPal Payment Link</span>
                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">PayPal & Cards</Badge>
                    </div>
                    
                    <div className="bg-purple-50/50 p-3 rounded-lg mb-4 border border-purple-200/50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 break-all">
                          {invoice.paypal_payment_link_url}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink('paypal')}
                        disabled={copying}
                        className="flex-1 border-purple-200 hover:bg-purple-50"
                      >
                        {copying ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        Copy PayPal Link
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenLink('paypal')}
                        className="border-purple-200 hover:bg-purple-50"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>

                      {canDeactivatePaymentLink && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeactivatePaymentLink('paypal')}
                          disabled={deactivating}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {canDeactivatePaymentLink && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    You can deactivate payment links to prevent new payments. This action cannot be undone.
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
                      Create secure payment links that your client can use to pay this invoice online with their preferred payment method.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Stripe Payment Link Option */}
                    {!hasStripeLink && (
                      <Card className="border-dashed border-2 border-blue-200 hover:border-blue-300 transition-colors">
                        <CardContent className="text-center py-6">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CreditCard className="w-6 h-6 text-blue-600" />
                          </div>
                          <h3 className="font-semibold mb-2 text-blue-900">Stripe Payment</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Credit cards, debit cards, and bank transfers
                          </p>
                          <Button
                            onClick={() => handleCreatePaymentLink('stripe')}
                            disabled={creating}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {creating && selectedProvider === 'stripe' ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Stripe Link
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* PayPal Payment Link Option */}
                    {!hasPayPalLink && (
                      <Card className="border-dashed border-2 border-purple-200 hover:border-purple-300 transition-colors">
                        <CardContent className="text-center py-6">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Wallet className="w-6 h-6 text-purple-600" />
                          </div>
                          <h3 className="font-semibold mb-2 text-purple-900">PayPal Payment</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            PayPal wallets, credit cards, and bank transfers
                          </p>
                          <Button
                            onClick={() => handleCreatePaymentLink('paypal')}
                            disabled={creating}
                            size="sm"
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                          >
                            {creating && selectedProvider === 'paypal' ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-2" />
                                Create PayPal Link
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {!hasStripeLink && !hasPayPalLink && (
                    <Card className="bg-gradient-to-r from-purple-50/50 to-blue-50/50 border-purple-200/50">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Why choose multiple payment methods?</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>Increase payment success rates</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>Give customers payment flexibility</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>Reduce payment abandonment</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>Reach global customers</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  Secure credit card payments
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  PayPal wallet support
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  Bank transfer options
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  Automatic status updates
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  Payment confirmation emails
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  Mobile-friendly experience
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}