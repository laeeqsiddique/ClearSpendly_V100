"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  CreditCard, 
  Plus, 
  Settings, 
  Check, 
  AlertTriangle,
  ExternalLink,
  Shield,
  Zap,
  Globe,
  ChevronRight,
  Clock,
  Wallet
} from "lucide-react";
import { PayPalOnboardingFlow } from "./_components/paypal-onboarding-flow";
import { StripeProviderCard } from "./_components/stripe-provider-card";

interface PaymentProvider {
  id: string;
  name: string;
  type: 'stripe' | 'paypal' | 'square' | 'razorpay';
  status: 'connected' | 'pending' | 'disconnected' | 'error';
  capabilities: string[];
  fees: string;
  processingTime: string;
  description: string;
  logo: string;
  isEnabled: boolean;
  accountInfo?: {
    accountId?: string;
    email?: string;
    businessName?: string;
    country?: string;
    currency?: string;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  }
};

export default function PaymentProvidersPage() {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [paypalOnboardingOpen, setPaypalOnboardingOpen] = useState(false);

  // Mock data - replace with actual API calls
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setProviders([
        {
          id: '1',
          name: 'Stripe',
          type: 'stripe',
          status: 'connected',
          capabilities: ['cards', 'bank_transfers', 'apple_pay', 'google_pay'],
          fees: '2.9% + 30¢',
          processingTime: '2-7 business days',
          description: 'Accept credit cards and bank transfers with industry-leading security',
          logo: '🏦',
          isEnabled: true,
          accountInfo: {
            accountId: 'acct_1234567890',
            email: 'business@company.com',
            businessName: 'Your Business Name',
            country: 'US',
            currency: 'USD'
          }
        },
        {
          id: '2',
          name: 'PayPal',
          type: 'paypal',
          status: 'disconnected',
          capabilities: ['paypal_wallet', 'cards', 'bank_transfers'],
          fees: '2.9% + 30¢',
          processingTime: '1-3 business days',
          description: 'Enable PayPal payments with worldwide reach and buyer protection',
          logo: '💙',
          isEnabled: false
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleProviderToggle = async (providerId: string, enabled: boolean) => {
    setProviders(prev => prev.map(provider => 
      provider.id === providerId 
        ? { ...provider, isEnabled: enabled }
        : provider
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Check className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Plus className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Payment Providers
              </h1>
              <p className="text-gray-600 mt-1">
                Connect and manage your payment processing services
              </p>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50/50 backdrop-blur-sm">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Your payment data is encrypted and secure. We use industry-standard security measures to protect your financial information.
            </AlertDescription>
          </Alert>
        </motion.div>

        {/* Provider Cards */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {providers.map((provider) => (
            <motion.div key={provider.id} variants={cardVariants}>
              {provider.type === 'stripe' ? (
                <StripeProviderCard 
                  provider={provider}
                  onToggle={handleProviderToggle}
                />
              ) : (
                <Card className="group bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-purple-200/50">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{provider.logo}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{provider.name}</h3>
                            <Badge className={`${getStatusColor(provider.status)} border`}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(provider.status)}
                                <span className="capitalize">{provider.status}</span>
                              </div>
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-4">{provider.description}</p>
                          
                          {/* Provider Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">Fees: {provider.fees}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">Processing: {provider.processingTime}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{provider.capabilities.length} payment methods</span>
                            </div>
                          </div>

                          {/* Account Info */}
                          {provider.accountInfo && (
                            <div className="mt-4 p-3 bg-green-50/50 rounded-lg border border-green-200/50">
                              <div className="text-sm">
                                <div className="flex items-center gap-2 font-medium text-green-800 mb-1">
                                  <Check className="w-4 h-4" />
                                  Connected Account
                                </div>
                                <div className="text-green-700">
                                  {provider.accountInfo.businessName && (
                                    <div>Business: {provider.accountInfo.businessName}</div>
                                  )}
                                  {provider.accountInfo.email && (
                                    <div>Email: {provider.accountInfo.email}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        {/* Enable/Disable Toggle */}
                        {provider.status === 'connected' && (
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`toggle-${provider.id}`} className="text-sm">
                              {provider.isEnabled ? 'Enabled' : 'Disabled'}
                            </Label>
                            <Switch
                              id={`toggle-${provider.id}`}
                              checked={provider.isEnabled}
                              onCheckedChange={(checked) => handleProviderToggle(provider.id, checked)}
                            />
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {provider.status === 'disconnected' && provider.type === 'paypal' && (
                            <Button 
                              onClick={() => setPaypalOnboardingOpen(true)}
                              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Connect PayPal
                            </Button>
                          )}
                          
                          {provider.status === 'connected' && (
                            <Button variant="outline" size="sm">
                              <Settings className="w-4 h-4 mr-2" />
                              Configure
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Capabilities */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Payment Methods</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {provider.capabilities.map((capability) => (
                          <Badge key={capability} variant="secondary" className="text-xs">
                            {capability.replace('_', ' ').toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ))}

          {/* Add New Provider Card */}
          <motion.div variants={cardVariants}>
            <Card className="bg-white/40 backdrop-blur-sm border-2 border-dashed border-gray-300 hover:border-purple-300 transition-all duration-300 cursor-pointer group">
              <CardContent className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center group-hover:from-purple-200 group-hover:to-blue-200 transition-all duration-300">
                    <Plus className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Add Payment Provider</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Connect additional payment processors to offer more payment options
                    </p>
                    <Button variant="outline" className="group-hover:border-purple-300">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Browse Providers
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* PayPal Onboarding Flow */}
        <PayPalOnboardingFlow 
          open={paypalOnboardingOpen}
          onClose={() => setPaypalOnboardingOpen(false)}
          onComplete={(accountInfo) => {
            // Update provider status
            setProviders(prev => prev.map(provider => 
              provider.type === 'paypal' 
                ? { 
                    ...provider, 
                    status: 'connected', 
                    accountInfo,
                    isEnabled: true 
                  }
                : provider
            ));
            setPaypalOnboardingOpen(false);
          }}
        />
      </div>
    </div>
  );
}