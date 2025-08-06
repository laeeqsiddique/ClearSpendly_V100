"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Wallet, 
  Settings, 
  Check, 
  AlertTriangle,
  ExternalLink,
  Shield,
  Globe,
  CreditCard,
  Eye,
  EyeOff,
  TestTube,
  Loader2,
  CheckCircle2,
  Save,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

interface PayPalSettings {
  enabled: boolean;
  environment: 'sandbox' | 'live';
  clientId: string;
  clientSecret: string;
  email: string;
  businessName: string;
  webhookId?: string;
  lastTested?: string;
  status: 'disconnected' | 'connected' | 'testing' | 'error';
}

export default function PayPalSettingsPage() {
  const [settings, setSettings] = useState<PayPalSettings>({
    enabled: false,
    environment: 'sandbox',
    clientId: '',
    clientSecret: '',
    email: '',
    businessName: '',
    status: 'disconnected'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load existing settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/paypal/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings || settings);
        }
      } catch (error) {
        console.error('Error loading PayPal settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSetting = (field: keyof PayPalSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleTestConnection = async () => {
    if (!settings.clientId || !settings.clientSecret) {
      toast.error("Please enter your PayPal Client ID and Secret first");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch('/api/paypal/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: settings.clientId,
          clientSecret: settings.clientSecret,
          environment: settings.environment
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setSettings(prev => ({ 
          ...prev, 
          status: 'connected',
          lastTested: new Date().toISOString()
        }));
        toast.success("PayPal connection test successful!");
      } else {
        setSettings(prev => ({ ...prev, status: 'error' }));
        toast.error(result.error || "PayPal connection test failed");
      }
    } catch (error) {
      setSettings(prev => ({ ...prev, status: 'error' }));
      toast.error("Failed to test PayPal connection");
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/paypal/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setHasChanges(false);
        toast.success("PayPal settings saved successfully!");
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save PayPal settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect PayPal? This will disable PayPal payments.")) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/paypal/settings', {
        method: 'DELETE'
      });

      if (response.ok) {
        setSettings({
          enabled: false,
          environment: 'sandbox',
          clientId: '',
          clientSecret: '',
          email: '',
          businessName: '',
          status: 'disconnected'
        });
        setHasChanges(false);
        toast.success("PayPal disconnected successfully");
      } else {
        toast.error("Failed to disconnect PayPal");
      }
    } catch (error) {
      toast.error("Failed to disconnect PayPal");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = () => {
    switch (settings.status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><Check className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'testing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Testing</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Disconnected</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto p-6 max-w-4xl">
          <Card className="animate-pulse bg-white/70 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-300 opacity-20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-300 opacity-20 blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg">
              <Wallet className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                PayPal Settings
              </h1>
              <p className="text-gray-600 mt-1">
                Configure PayPal to accept payments from customers worldwide
              </p>
            </div>
          </div>

          {/* Status Alert */}
          <Alert className="border-blue-200 bg-blue-50/50 backdrop-blur-sm">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Your PayPal credentials are encrypted and stored securely. We never store your actual PayPal login credentials.
            </AlertDescription>
          </Alert>
        </motion.div>

        {/* Main Settings Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">💙</div>
                  <div>
                    <CardTitle className="text-2xl">PayPal Integration</CardTitle>
                    <p className="text-gray-600 mt-1">Enable PayPal payments for your invoices</p>
                  </div>
                </div>
                {getStatusBadge()}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Settings className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">Enable PayPal Payments</Label>
                    <p className="text-sm text-gray-600">Allow customers to pay with PayPal</p>
                  </div>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => updateSetting('enabled', checked)}
                />
              </div>

              <Separator />

              {/* Environment Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Environment</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={settings.environment === 'sandbox' ? 'default' : 'outline'}
                    onClick={() => updateSetting('environment', 'sandbox')}
                    className={settings.environment === 'sandbox' 
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" 
                      : "border-purple-200 hover:bg-purple-50"
                    }
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Sandbox (Testing)
                  </Button>
                  <Button
                    type="button"
                    variant={settings.environment === 'live' ? 'default' : 'outline'}
                    onClick={() => updateSetting('environment', 'live')}
                    className={settings.environment === 'live' 
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" 
                      : "border-purple-200 hover:bg-purple-50"
                    }
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Live (Production)
                  </Button>
                </div>
                {settings.environment === 'sandbox' && (
                  <Alert className="border-yellow-200 bg-yellow-50/50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Sandbox mode is for testing only. No real money will be processed.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              {/* API Credentials */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">API Credentials</Label>
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href="https://developer.paypal.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Get Credentials
                    </a>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID *</Label>
                    <Input
                      id="clientId"
                      placeholder="Enter PayPal Client ID"
                      value={settings.clientId}
                      onChange={(e) => updateSetting('clientId', e.target.value)}
                      className="border-purple-200 focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientSecret">Client Secret *</Label>
                    <div className="relative">
                      <Input
                        id="clientSecret"
                        type={showClientSecret ? "text" : "password"}
                        placeholder="Enter PayPal Client Secret"
                        value={settings.clientSecret}
                        onChange={(e) => updateSetting('clientSecret', e.target.value)}
                        className="border-purple-200 focus:border-purple-500 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowClientSecret(!showClientSecret)}
                      >
                        {showClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Business Information */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Business Information</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      placeholder="Your business name"
                      value={settings.businessName}
                      onChange={(e) => updateSetting('businessName', e.target.value)}
                      className="border-purple-200 focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">PayPal Account Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="paypal@yourbusiness.com"
                      value={settings.email}
                      onChange={(e) => updateSetting('email', e.target.value)}
                      className="border-purple-200 focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Connection Status */}
              {settings.status === 'connected' && settings.lastTested && (
                <Alert className="border-green-200 bg-green-50/50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Last tested: {new Date(settings.lastTested).toLocaleString()}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  onClick={handleTestConnection}
                  disabled={testing || !settings.clientId || !settings.clientSecret}
                  variant="outline"
                  className="border-blue-200 hover:bg-blue-50"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSaveSettings}
                  disabled={saving || !hasChanges}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>

                {settings.status === 'connected' && (
                  <Button
                    onClick={handleDisconnect}
                    disabled={saving}
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Features Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                PayPal Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50/50 rounded-lg">
                  <Globe className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900">Global Reach</h4>
                  <p className="text-sm text-gray-600">Accept payments from 200+ countries</p>
                </div>
                <div className="text-center p-4 bg-green-50/50 rounded-lg">
                  <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900">Buyer Protection</h4>
                  <p className="text-sm text-gray-600">Built-in fraud protection</p>
                </div>
                <div className="text-center p-4 bg-purple-50/50 rounded-lg">
                  <CreditCard className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900">Multiple Payment Methods</h4>
                  <p className="text-sm text-gray-600">PayPal wallets, cards, and bank transfers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}