"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard,
  DollarSign,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface PaymentSimulatorProps {
  onSimulatePayment: (type: 'success' | 'failure', amount: number) => Promise<void>;
}

export function PaymentSimulator({ onSimulatePayment }: PaymentSimulatorProps) {
  const [amount, setAmount] = useState(19.99);
  const [paymentType, setPaymentType] = useState<'success' | 'failure'>('success');
  const [failureReason, setFailureReason] = useState('card_declined');
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState('4242424242424242');

  const testCards = [
    { number: '4242424242424242', brand: 'Visa', result: 'Success', type: 'success' },
    { number: '4000000000000002', brand: 'Visa', result: 'Card Declined', type: 'failure' },
    { number: '4000000000009995', brand: 'Visa', result: 'Insufficient Funds', type: 'failure' },
    { number: '4000000000000069', brand: 'Visa', result: 'Expired Card', type: 'failure' },
    { number: '4000000000000119', brand: 'Visa', result: 'Processing Error', type: 'failure' },
  ];

  const failureReasons = [
    { value: 'card_declined', label: 'Card Declined' },
    { value: 'insufficient_funds', label: 'Insufficient Funds' },
    { value: 'expired_card', label: 'Expired Card' },
    { value: 'incorrect_cvc', label: 'Incorrect CVC' },
    { value: 'processing_error', label: 'Processing Error' },
    { value: 'authentication_required', label: '3D Secure Required' }
  ];

  const handleSimulate = async () => {
    try {
      setLoading(true);
      await onSimulatePayment(paymentType, amount);
    } catch (error) {
      toast.error('Payment simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCardSelect = (cardNumber: string) => {
    setSelectedCard(cardNumber);
    const card = testCards.find(c => c.number === cardNumber);
    if (card) {
      setPaymentType(card.type as 'success' | 'failure');
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Payment Simulation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Payment Simulation
          </CardTitle>
          <CardDescription>
            Simulate payments with different outcomes to test subscription flows
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-type">Payment Outcome</Label>
              <Select value={paymentType} onValueChange={(value: 'success' | 'failure') => setPaymentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Success
                    </div>
                  </SelectItem>
                  <SelectItem value="failure">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Failure
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {paymentType === 'failure' && (
            <div className="space-y-2">
              <Label htmlFor="failure-reason">Failure Reason</Label>
              <Select value={failureReason} onValueChange={setFailureReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {failureReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button 
            onClick={handleSimulate} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Simulating...' : `Simulate ${paymentType === 'success' ? 'Successful' : 'Failed'} Payment`}
          </Button>
        </CardContent>
      </Card>

      {/* Test Card Simulation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Test Card Simulation
          </CardTitle>
          <CardDescription>
            Use predefined test cards to simulate different payment scenarios
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3">
              {testCards.map((card) => (
                <div
                  key={card.number}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCard === card.number 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleCardSelect(card.number)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">💳</div>
                      <div>
                        <div className="font-mono text-sm">
                          {card.number.replace(/(.{4})/g, '$1 ')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {card.brand}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        card.type === 'success' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.result}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={() => onSimulatePayment(paymentType, amount)}
                disabled={loading}
                className="w-full"
                variant={paymentType === 'success' ? 'default' : 'destructive'}
              >
                {loading ? 'Processing...' : `Test Payment with Selected Card`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Triggers */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Event Triggers</CardTitle>
          <CardDescription>
            Trigger specific webhook events to test your system's response
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <Button variant="outline" className="justify-start">
              customer.subscription.created
            </Button>
            <Button variant="outline" className="justify-start">
              customer.subscription.updated
            </Button>
            <Button variant="outline" className="justify-start">
              customer.subscription.deleted
            </Button>
            <Button variant="outline" className="justify-start">
              invoice.payment_succeeded
            </Button>
            <Button variant="outline" className="justify-start">
              invoice.payment_failed
            </Button>
            <Button variant="outline" className="justify-start">
              customer.subscription.trial_will_end
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Testing Guidelines */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Testing Guidelines:</p>
            <ul className="text-sm space-y-1">
              <li>• All simulated payments use test data and do not involve real money</li>
              <li>• Failed payments will trigger appropriate error handling and retry logic</li>
              <li>• Webhook events are processed asynchronously and may take a few seconds</li>
              <li>• Check the webhook testing tab to monitor event processing</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}