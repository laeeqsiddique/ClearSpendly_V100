"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Check, 
  Settings, 
  Clock, 
  Globe, 
  CreditCard, 
  Zap,
  ExternalLink,
  Shield,
  AlertTriangle
} from "lucide-react";

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

interface StripeProviderCardProps {
  provider: PaymentProvider;
  onToggle: (providerId: string, enabled: boolean) => void;
}

export function StripeProviderCard({ provider, onToggle }: StripeProviderCardProps) {
  const [showDetails, setShowDetails] = useState(false);

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
        return null;
    }
  };

  return (
    <Card className="group bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-200/50">
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
                {provider.type === 'stripe' && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Primary
                  </Badge>
                )}
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
                      {provider.accountInfo.accountId && (
                        <div className="font-mono text-xs">ID: {provider.accountInfo.accountId}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Features for Stripe */}
              <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-200/50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Enhanced Security Features</span>
                </div>
                <div className="text-xs text-blue-700 grid grid-cols-2 gap-2">
                  <div>• 3D Secure Authentication</div>
                  <div>• Advanced Fraud Detection</div>
                  <div>• PCI Compliance</div>
                  <div>• Chargeback Protection</div>
                </div>
              </div>
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
                  onCheckedChange={(checked) => onToggle(provider.id, checked)}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {provider.status === 'connected' && (
                <>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </>
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

        {/* Stripe-specific advanced features */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50/50 rounded-lg">
                <div className="font-medium text-gray-900 mb-1">Subscription Billing</div>
                <div className="text-gray-600">Automated recurring payments</div>
              </div>
              <div className="p-3 bg-gray-50/50 rounded-lg">
                <div className="font-medium text-gray-900 mb-1">Multi-party Payments</div>
                <div className="text-gray-600">Split payments automatically</div>
              </div>
              <div className="p-3 bg-gray-50/50 rounded-lg">
                <div className="font-medium text-gray-900 mb-1">International Cards</div>
                <div className="text-gray-600">135+ currencies supported</div>
              </div>
              <div className="p-3 bg-gray-50/50 rounded-lg">
                <div className="font-medium text-gray-900 mb-1">Real-time Reporting</div>
                <div className="text-gray-600">Advanced analytics dashboard</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}