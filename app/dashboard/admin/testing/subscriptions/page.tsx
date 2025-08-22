"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  PlayCircle,
  Zap,
  CreditCard,
  Webhook,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Settings,
  TestTube
} from 'lucide-react';
import { toast } from 'sonner';
import { TestScenario, WebhookEvent, TestingDashboardProps } from '@/lib/types/subscription';
// Note: TestScenarioRunner component would be implemented here or imported when available
import { PaymentSimulator } from '../../_components/payment-simulator';
import { WebhookTesting } from '../../_components/webhook-testing';

export const dynamic = 'force-dynamic';

export default function SubscriptionTestingPage() {
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [runningTest, setRunningTest] = useState<string | null>(null);

  useEffect(() => {
    fetchTestData();
  }, []);

  const fetchTestData = async () => {
    try {
      setLoading(true);

      // Mock data for testing scenarios
      setScenarios([
        {
          id: 'scenario_1',
          name: 'New Subscription Flow',
          description: 'Test complete new subscription creation with Stripe payment',
          steps: [
            {
              type: 'create_subscription',
              parameters: {
                planId: 'professional',
                billingCycle: 'monthly',
                provider: 'stripe'
              },
              expectedResult: 'Subscription created successfully'
            },
            {
              type: 'payment_failure',
              parameters: {
                cardNumber: '4000000000000002',
                reason: 'card_declined'
              },
              expectedResult: 'Payment failure handled gracefully'
            }
          ]
        },
        {
          id: 'scenario_2',
          name: 'Plan Upgrade with Proration',
          description: 'Test upgrading from starter to professional plan with proration',
          steps: [
            {
              type: 'create_subscription',
              parameters: {
                planId: 'starter',
                billingCycle: 'monthly',
                provider: 'stripe'
              },
              expectedResult: 'Initial subscription created'
            },
            {
              type: 'change_plan',
              parameters: {
                newPlanId: 'professional',
                prorationMode: 'create_prorations'
              },
              expectedResult: 'Plan upgraded with correct proration'
            }
          ]
        },
        {
          id: 'scenario_3',
          name: 'Dunning Management',
          description: 'Test payment retry and dunning management flow',
          steps: [
            {
              type: 'payment_failure',
              parameters: {
                reason: 'insufficient_funds',
                retryCount: 3
              },
              expectedResult: 'Dunning emails sent according to schedule'
            },
            {
              type: 'payment_failure',
              parameters: {
                reason: 'card_declined',
                finalAttempt: true
              },
              expectedResult: 'Subscription moved to past_due status'
            }
          ]
        }
      ]);

      // Mock webhook events
      setWebhookEvents([
        {
          id: 'webhook_1',
          type: 'customer.subscription.created',
          data: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active'
          },
          processed: true,
          created_at: '2024-01-15T10:30:00Z',
          processed_at: '2024-01-15T10:30:05Z'
        },
        {
          id: 'webhook_2',
          type: 'invoice.payment_failed',
          data: {
            id: 'in_123',
            subscription: 'sub_123',
            attempt_count: 1
          },
          processed: false,
          created_at: '2024-01-16T14:20:00Z',
          error: 'Processing failed - retry scheduled'
        }
      ]);

    } catch (error) {
      console.error('Error fetching test data:', error);
      toast.error('Failed to load test data');
    } finally {
      setLoading(false);
    }
  };

  const handleRunScenario = async (scenarioId: string) => {
    try {
      setRunningTest(scenarioId);
      
      const response = await fetch('/api/admin/testing/run-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId })
      });

      const data = await response.json();
      
      if (data.success) {
        setTestResults(prev => ({
          ...prev,
          [scenarioId]: {
            status: 'success',
            results: data.results,
            timestamp: new Date().toISOString()
          }
        }));
        toast.success('Test scenario completed successfully!');
      } else {
        setTestResults(prev => ({
          ...prev,
          [scenarioId]: {
            status: 'failed',
            error: data.error,
            timestamp: new Date().toISOString()
          }
        }));
        toast.error('Test scenario failed');
      }
    } catch (error) {
      console.error('Error running scenario:', error);
      toast.error('Failed to run test scenario');
    } finally {
      setRunningTest(null);
    }
  };

  const handleSimulatePayment = async (type: 'success' | 'failure', amount: number) => {
    try {
      const response = await fetch('/api/admin/testing/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Payment ${type} simulated successfully!`);
        fetchTestData(); // Refresh webhook events
      } else {
        toast.error('Payment simulation failed');
      }
    } catch (error) {
      console.error('Error simulating payment:', error);
      toast.error('Failed to simulate payment');
    }
  };

  const getScenarioStatusIcon = (scenarioId: string) => {
    const result = testResults[scenarioId];
    
    if (runningTest === scenarioId) {
      return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
    }
    
    if (!result) {
      return <TestTube className="h-4 w-4 text-gray-400" />;
    }
    
    if (result.status === 'success') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const getScenarioStatusColor = (scenarioId: string) => {
    const result = testResults[scenarioId];
    
    if (runningTest === scenarioId) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    
    if (!result) {
      return 'bg-gray-50 text-gray-700 border-gray-200';
    }
    
    if (result.status === 'success') {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    
    return 'bg-red-50 text-red-700 border-red-200';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Subscription Testing</h1>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Testing</h1>
          <p className="text-muted-foreground">
            Test subscription scenarios, payments, and webhook processing
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTestData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Test Environment Notice */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-yellow-800">
          This is a testing environment. All transactions use test data and will not affect real subscriptions or payments.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="scenarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
          <TabsTrigger value="payments">Payment Simulation</TabsTrigger>
          <TabsTrigger value="webhooks">Webhook Testing</TabsTrigger>
          <TabsTrigger value="cards">Test Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Test Scenarios
              </CardTitle>
              <CardDescription>
                Pre-configured test scenarios for common subscription flows
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {scenarios.map((scenario) => (
                  <Card key={scenario.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{scenario.name}</h3>
                            <Badge className={getScenarioStatusColor(scenario.id)}>
                              {getScenarioStatusIcon(scenario.id)}
                              <span className="ml-1">
                                {runningTest === scenario.id ? 'Running' :
                                 testResults[scenario.id]?.status || 'Not Run'}
                              </span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {scenario.description}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            {scenario.steps.length} steps
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => handleRunScenario(scenario.id)}
                          disabled={runningTest === scenario.id}
                          size="sm"
                        >
                          {runningTest === scenario.id ? (
                            <>
                              <Clock className="h-3 w-3 mr-1 animate-spin" />
                              Running...
                            </>
                          ) : (
                            <>
                              <PlayCircle className="h-3 w-3 mr-1" />
                              Run Test
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {testResults[scenario.id] && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-muted-foreground">
                            Last run: {new Date(testResults[scenario.id].timestamp).toLocaleString()}
                          </div>
                          {testResults[scenario.id].error && (
                            <div className="text-xs text-red-600 mt-1">
                              Error: {testResults[scenario.id].error}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentSimulator onSimulatePayment={handleSimulatePayment} />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <WebhookTesting webhookEvents={webhookEvents} onRefresh={fetchTestData} />
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Test Card Numbers
              </CardTitle>
              <CardDescription>
                Use these test card numbers to simulate different payment scenarios
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Card Number</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Scenario</TableHead>
                      <TableHead>Expected Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          4242424242424242
                        </code>
                      </TableCell>
                      <TableCell>Visa</TableCell>
                      <TableCell>Successful payment</TableCell>
                      <TableCell>
                        <Badge className="bg-green-50 text-green-700">Success</Badge>
                      </TableCell>
                    </TableRow>
                    
                    <TableRow>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          4000000000000002
                        </code>
                      </TableCell>
                      <TableCell>Visa</TableCell>
                      <TableCell>Card declined</TableCell>
                      <TableCell>
                        <Badge className="bg-red-50 text-red-700">Declined</Badge>
                      </TableCell>
                    </TableRow>
                    
                    <TableRow>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          4000000000009995
                        </code>
                      </TableCell>
                      <TableCell>Visa</TableCell>
                      <TableCell>Insufficient funds</TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-50 text-yellow-700">Failed</Badge>
                      </TableCell>
                    </TableRow>
                    
                    <TableRow>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          4000000000000069
                        </code>
                      </TableCell>
                      <TableCell>Visa</TableCell>
                      <TableCell>Expired card</TableCell>
                      <TableCell>
                        <Badge className="bg-orange-50 text-orange-700">Expired</Badge>
                      </TableCell>
                    </TableRow>
                    
                    <TableRow>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          4000000000000119
                        </code>
                      </TableCell>
                      <TableCell>Visa</TableCell>
                      <TableCell>Processing error</TableCell>
                      <TableCell>
                        <Badge className="bg-purple-50 text-purple-700">Error</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Testing Notes:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Use any valid future expiration date (e.g., 12/2025)</li>
                  <li>• Use any 3-digit CVC code (e.g., 123)</li>
                  <li>• All test payments are processed in sandbox mode</li>
                  <li>• Real payment methods will not be charged</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}