"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Settings,
  BarChart3,
  Download,
  RefreshCw,
  Save,
  Receipt,
  TrendingUp,
  HardDrive,
  Globe,
  Zap,
  Tags,
  User,
  CreditCard,
  Mail,
  Shield,
  Bell,
  Lock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Activity,
  Zap as ZapIcon
} from "lucide-react";
import AIChatAgent from '@/components/ai-chat-agent';

interface SystemStats {
  totalReceipts: number;
  totalAmount: number;
  totalTags: number;
  totalVendors: number;
  storageUsed: string;
  lastBackup: string;
}

interface SystemSettings {
  defaultCurrency: string;
  timezone: string;
  dateFormat: string;
  enableNotifications: boolean;
  enableAI: boolean;
  autoBackup: boolean;
}

interface UserSettings {
  name: string;
  email: string;
  company: string;
  phone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
}

interface BillingInfo {
  plan: string;
  status: string;
  nextBilling: string;
  receiptsUsed: number;
  receiptsLimit: number;
  storageUsed: string;
  storageLimit: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<SystemStats>({
    totalReceipts: 0,
    totalAmount: 0,
    totalTags: 0,
    totalVendors: 0,
    storageUsed: "0 MB",
    lastBackup: "Never"
  });
  
  const [settings, setSettings] = useState<SystemSettings>({
    defaultCurrency: "USD",
    timezone: "UTC",
    dateFormat: "MM/dd/yyyy",
    enableNotifications: true,
    enableAI: true,
    autoBackup: true
  });

  const [userSettings, setUserSettings] = useState<UserSettings>({
    name: "John Doe",
    email: "john@example.com",
    company: "My Business",
    phone: "+1 (555) 123-4567",
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false
  });

  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    plan: "Free",
    status: "Active",
    nextBilling: "2024-02-15",
    receiptsUsed: 7,
    receiptsLimit: 10,
    storageUsed: "2.4 GB",
    storageLimit: "10 GB"
  });


  useEffect(() => {
    loadSystemStats();
    loadSettings();
  }, []);

  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        // Show success message
        console.log('Settings saved successfully');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveUserSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/user-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userSettings),
      });
      
      if (response.ok) {
        console.log('User settings saved successfully');
      }
    } catch (error) {
      console.error('Failed to save user settings:', error);
    } finally {
      setSaving(false);
    }
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.defaultCurrency
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Account & Settings
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Manage your account, billing, and system preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">All Systems Online</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Receipts</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalReceipts}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Receipt className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalAmount)}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Tags</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalTags}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Tags className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.storageUsed}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <HardDrive className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Settings */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Basic Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Currency</Label>
                  <Input
                    id="defaultCurrency"
                    value={settings.defaultCurrency}
                    onChange={(e) => setSettings({...settings, defaultCurrency: e.target.value})}
                    placeholder="USD"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={settings.timezone}
                    onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                    placeholder="UTC"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Input
                    id="dateFormat"
                    value={settings.dateFormat}
                    onChange={(e) => setSettings({...settings, dateFormat: e.target.value})}
                    placeholder="MM/dd/yyyy"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">AI Assistant</p>
                    <p className="text-sm text-muted-foreground">Enable chat-based help</p>
                  </div>
                  <Switch
                    checked={settings.enableAI}
                    onCheckedChange={(checked) => setSettings({...settings, enableAI: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Notifications</p>
                    <p className="text-sm text-muted-foreground">System alerts</p>
                  </div>
                  <Switch
                    checked={settings.enableNotifications}
                    onCheckedChange={(checked) => setSettings({...settings, enableNotifications: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Auto Backup</p>
                    <p className="text-sm text-muted-foreground">Weekly data backup</p>
                  </div>
                  <Switch
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => setSettings({...settings, autoBackup: checked})}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Information */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userName">Full Name</Label>
                  <Input
                    id="userName"
                    value={userSettings.name}
                    onChange={(e) => setUserSettings({...userSettings, name: e.target.value})}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userEmail">Email Address</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={userSettings.email}
                    onChange={(e) => setUserSettings({...userSettings, email: e.target.value})}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userCompany">Company/Business</Label>
                  <Input
                    id="userCompany"
                    value={userSettings.company}
                    onChange={(e) => setUserSettings({...userSettings, company: e.target.value})}
                    placeholder="Enter your company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userPhone">Phone Number</Label>
                  <Input
                    id="userPhone"
                    value={userSettings.phone}
                    onChange={(e) => setUserSettings({...userSettings, phone: e.target.value})}
                    placeholder="Enter your phone number"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive important updates via email</p>
                  </div>
                  <Switch
                    checked={userSettings.emailNotifications}
                    onCheckedChange={(checked) => setUserSettings({...userSettings, emailNotifications: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Browser notifications for new receipts</p>
                  </div>
                  <Switch
                    checked={userSettings.pushNotifications}
                    onCheckedChange={(checked) => setUserSettings({...userSettings, pushNotifications: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Marketing Emails</p>
                    <p className="text-sm text-muted-foreground">Tips, updates, and product news</p>
                  </div>
                  <Switch
                    checked={userSettings.marketingEmails}
                    onCheckedChange={(checked) => setUserSettings({...userSettings, marketingEmails: checked})}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-blue-800">Change Password</p>
                      <p className="text-sm text-blue-600">Update your account password</p>
                    </div>
                    <Button variant="outline" className="text-blue-600 border-blue-600">
                      <Lock className="h-4 w-4 mr-2" />
                      Change
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-green-800">Two-Factor Auth</p>
                      <p className="text-sm text-green-600">Enable 2FA for extra security</p>
                    </div>
                    <Button variant="outline" className="text-green-600 border-green-600">
                      <Shield className="h-4 w-4 mr-2" />
                      Enable
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={saveUserSettings}
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Account Settings
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          {/* Usage Overview */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Monthly Usage
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Receipts Processed</span>
                  <span className="text-2xl font-bold">
                    {billingInfo.receiptsUsed} / {billingInfo.receiptsLimit}
                  </span>
                </div>
                <Progress value={(billingInfo.receiptsUsed / billingInfo.receiptsLimit) * 100} className="h-3" />
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>{((billingInfo.receiptsUsed / billingInfo.receiptsLimit) * 100).toFixed(0)}% of monthly limit</span>
                  <span>{billingInfo.receiptsLimit - billingInfo.receiptsUsed} remaining</span>
                </div>
                {billingInfo.receiptsUsed / billingInfo.receiptsLimit >= 0.8 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                      You're approaching your monthly limit. Consider upgrading to Pro for unlimited processing.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Plan */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ZapIcon className="h-5 w-5 text-blue-600" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {billingInfo.plan === "Free" ? (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Free Plan</h3>
                        <p className="text-sm text-muted-foreground">
                          Perfect for getting started
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">$0</p>
                        <p className="text-sm text-muted-foreground">/month</p>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>10 receipts per month</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>OCR processing</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>Basic tagging & categorization</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>Dashboard analytics</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>Excel/CSV export</span>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Pro Plan</h3>
                        <p className="text-sm text-muted-foreground">Status: {billingInfo.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">$15</p>
                        <p className="text-sm text-muted-foreground">/month</p>
                      </div>
                    </div>
                    <div className="text-sm text-green-600 mb-3">
                      Next billing: {new Date(billingInfo.nextBilling).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plan Comparison / Upgrade */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Pro Plan Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="rounded-full bg-purple-100 p-1 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Unlimited Receipts</p>
                      <p className="text-sm text-muted-foreground">Process as many receipts as you need</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="rounded-full bg-purple-100 p-1 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Advanced AI Chat</p>
                      <p className="text-sm text-muted-foreground">Powered by Mistral AI for better insights</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="rounded-full bg-purple-100 p-1 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Receipt Storage</p>
                      <p className="text-sm text-muted-foreground">Keep original receipt images forever</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="rounded-full bg-purple-100 p-1 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Priority Support</p>
                      <p className="text-sm text-muted-foreground">Get help when you need it</p>
                    </div>
                  </li>
                </ul>
                
                {billingInfo.plan === "Free" && (
                  <div className="pt-4">
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Upgrade to Pro - $15/month
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {billingInfo.plan !== "Free" && (
            <>
              {/* Payment Method - Only show for paid plans */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">VISA</span>
                        </div>
                        <div>
                          <p className="font-medium">•••• •••• •••• 4242</p>
                          <p className="text-sm text-muted-foreground">Expires 12/25</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Billing History - Only show for paid plans */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Billing History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Pro Plan</p>
                        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">$15.00</p>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Invoice
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="text-center py-4">
                    <Button variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full History
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" className="text-red-600 border-red-600">
                  Cancel Subscription
                </Button>
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Customer Portal
                </Button>
              </div>
            </>
          )}

          {/* FAQ */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-purple-600" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">What happens if I exceed my free limit?</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll need to upgrade to Pro to continue processing receipts for the month.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Can I cancel anytime?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes, you can cancel your Pro subscription at any time. You'll continue to have access until the end of your billing period.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Do unused receipts roll over?</h4>
                  <p className="text-sm text-muted-foreground">
                    No, the free tier limit of 10 receipts resets at the beginning of each month.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
      
      {/* AI Chat Agent */}
      <AIChatAgent />
    </div>
  );
}