"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Check,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { PaymentMethod, PaymentMethodForm } from '@/lib/types/subscription';

interface PaymentMethodManagerProps {
  paymentMethods: PaymentMethod[];
  onUpdate: (paymentMethodId: string) => void;
}

export function PaymentMethodManager({ 
  paymentMethods, 
  onUpdate 
}: PaymentMethodManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PaymentMethodForm>({
    type: 'card',
    billing_address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // In a real implementation, this would use Stripe Elements or PayPal SDK
      const response = await fetch('/api/billing/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Payment method added successfully!');
        setShowAddDialog(false);
        // Reset form
        setFormData({
          type: 'card',
          billing_address: {
            line1: '',
            city: '',
            state: '',
            postal_code: '',
            country: 'US'
          }
        });
      } else {
        toast.error(data.error || 'Failed to add payment method');
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error('Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/billing/payment-methods/default', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Default payment method updated!');
        onUpdate(paymentMethodId);
      } else {
        toast.error('Failed to update default payment method');
      }
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Failed to update payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/billing/payment-methods/${paymentMethodId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Payment method removed!');
        onUpdate(paymentMethodId);
      } else {
        toast.error('Failed to remove payment method');
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Failed to remove payment method');
    } finally {
      setLoading(false);
    }
  };

  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      case 'discover':
        return '💳';
      default:
        return '💳';
    }
  };

  const formatCardNumber = (last4?: string) => {
    return last4 ? `•••• •••• •••• ${last4}` : 'Card ending in ••••';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Manage your payment methods and billing preferences
            </CardDescription>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
                <DialogDescription>
                  Add a new card or bank account for billing
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddPaymentMethod} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-type">Payment Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: 'card' | 'bank_account') => 
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="bank_account">Bank Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === 'card' && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="card-number">Card Number</Label>
                        <Input
                          id="card-number"
                          placeholder="1234 5678 9012 3456"
                          onChange={(e) => setFormData({
                            ...formData,
                            card: { ...formData.card, number: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="card-name">Name on Card</Label>
                        <Input
                          id="card-name"
                          placeholder="John Doe"
                          onChange={(e) => setFormData({
                            ...formData,
                            card: { ...formData.card, name: e.target.value }
                          })}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="exp-month">Month</Label>
                        <Select
                          onValueChange={(value) => setFormData({
                            ...formData,
                            card: { ...formData.card, exp_month: parseInt(value) }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {(i + 1).toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="exp-year">Year</Label>
                        <Select
                          onValueChange={(value) => setFormData({
                            ...formData,
                            card: { ...formData.card, exp_year: parseInt(value) }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="YYYY" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => {
                              const year = new Date().getFullYear() + i;
                              return (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvc">CVC</Label>
                        <Input
                          id="cvc"
                          placeholder="123"
                          maxLength={4}
                          onChange={(e) => setFormData({
                            ...formData,
                            card: { ...formData.card, cvc: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Billing Address */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Billing Address</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address-line1">Address Line 1</Label>
                    <Input
                      id="address-line1"
                      value={formData.billing_address.line1}
                      onChange={(e) => setFormData({
                        ...formData,
                        billing_address: {
                          ...formData.billing_address,
                          line1: e.target.value
                        }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address-line2">Address Line 2 (Optional)</Label>
                    <Input
                      id="address-line2"
                      value={formData.billing_address.line2 || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        billing_address: {
                          ...formData.billing_address,
                          line2: e.target.value
                        }
                      })}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.billing_address.city}
                        onChange={(e) => setFormData({
                          ...formData,
                          billing_address: {
                            ...formData.billing_address,
                            city: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.billing_address.state}
                        onChange={(e) => setFormData({
                          ...formData,
                          billing_address: {
                            ...formData.billing_address,
                            state: e.target.value
                          }
                        })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="postal-code">Postal Code</Label>
                      <Input
                        id="postal-code"
                        value={formData.billing_address.postal_code}
                        onChange={(e) => setFormData({
                          ...formData,
                          billing_address: {
                            ...formData.billing_address,
                            postal_code: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select 
                        value={formData.billing_address.country}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          billing_address: {
                            ...formData.billing_address,
                            country: value
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    In a production environment, this would use Stripe Elements or PayPal SDK for secure payment processing. Never collect sensitive payment information directly.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? 'Adding...' : 'Add Payment Method'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payment methods</h3>
            <p className="text-muted-foreground mb-4">
              Add a payment method to manage your subscription billing
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getCardIcon(method.brand)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {method.type === 'card' ? formatCardNumber(method.last4) : 'Bank Account'}
                      </p>
                      {method.is_default && (
                        <Badge variant="secondary">
                          <Check className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {method.type === 'card' && method.exp_month && method.exp_year && (
                        `Expires ${method.exp_month.toString().padStart(2, '0')}/${method.exp_year}`
                      )}
                      {method.type === 'card' && method.brand && (
                        <span className="ml-2 capitalize">{method.brand}</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!method.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                      disabled={loading}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePaymentMethod(method.id)}
                    disabled={loading || method.is_default}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}