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
  Zap as ZapIcon,
  Eye,
  Wallet,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import AIChatAgent from '@/components/ai-chat-agent';
import { toast } from "sonner";
import Link from "next/link";

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Admin Header with Breadcrumb Navigation - Hidden on mobile */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-200/30 hidden sm:block">
        <div className="px-4 lg:px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <Link href="/dashboard" className="flex items-center gap-1 text-gray-600 hover:text-purple-600 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <Link href="/dashboard" className="text-gray-600 hover:text-purple-600 transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Settings</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <span className="text-purple-600 font-medium">Admin Panel</span>
            </div>
          </div>

          {/* Admin Badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              <Shield className="h-3 w-3 mr-1" />
              Admin Access
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-[calc(100vh-140px)]">
        
        {/* Mobile-First Tab Navigation - Responsive Grid */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 z-10">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "overview", icon: BarChart3, label: "Overview", desc: "System statistics" },
              { value: "settings", icon: Settings, label: "System", desc: "Basic settings" },
              { value: "account", icon: User, label: "Account", desc: "Profile & notifications" }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-medium transition-all duration-200 ${
                  activeTab === tab.value
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="leading-tight">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 p-4 lg:p-6">
          {/* Mobile-optimized stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Total Receipts</p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-600 truncate">{stats.totalReceipts}</p>
                  </div>
                  <div className="flex-shrink-0 p-2 sm:p-3 bg-purple-100 rounded-xl ml-2">
                    <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600 truncate">{formatCurrency(stats.totalAmount)}</p>
                  </div>
                  <div className="flex-shrink-0 p-2 sm:p-3 bg-green-100 rounded-xl ml-2">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Total Tags</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600 truncate">{stats.totalTags}</p>
                  </div>
                  <div className="flex-shrink-0 p-2 sm:p-3 bg-blue-100 rounded-xl ml-2">
                    <Tags className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Storage Used</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600 truncate">{stats.storageUsed}</p>
                  </div>
                  <div className="flex-shrink-0 p-2 sm:p-3 bg-orange-100 rounded-xl ml-2">
                    <HardDrive className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4 p-4 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Basic Settings */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5 text-purple-600" />
                  Basic Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency" className="text-sm font-medium text-gray-700">Currency</Label>
                  <Input
                    id="defaultCurrency"
                    value={settings.defaultCurrency}
                    onChange={(e) => setSettings({...settings, defaultCurrency: e.target.value})}
                    placeholder="USD"
                    className="h-12 text-base rounded-xl border-2 border-gray-200/50 focus:border-purple-300 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-sm font-medium text-gray-700">Timezone</Label>
                  <Input
                    id="timezone"
                    value={settings.timezone}
                    onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                    placeholder="UTC"
                    className="h-12 text-base rounded-xl border-2 border-gray-200/50 focus:border-purple-300 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat" className="text-sm font-medium text-gray-700">Date Format</Label>
                  <Input
                    id="dateFormat"
                    value={settings.dateFormat}
                    onChange={(e) => setSettings({...settings, dateFormat: e.target.value})}
                    placeholder="MM/dd/yyyy"
                    className="h-12 text-base rounded-xl border-2 border-gray-200/50 focus:border-purple-300 transition-colors"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-purple-600" />
                  Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100/50">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-gray-900">AI Assistant</p>
                    <p className="text-sm text-gray-600 mt-1">Enable chat-based help</p>
                  </div>
                  <Switch
                    checked={settings.enableAI}
                    onCheckedChange={(checked) => setSettings({...settings, enableAI: checked})}
                    className="data-[state=checked]:bg-purple-600 scale-110"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100/50">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-gray-900">Notifications</p>
                    <p className="text-sm text-gray-600 mt-1">System alerts</p>
                  </div>
                  <Switch
                    checked={settings.enableNotifications}
                    onCheckedChange={(checked) => setSettings({...settings, enableNotifications: checked})}
                    className="data-[state=checked]:bg-purple-600 scale-110"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100/50">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-gray-900">Auto Backup</p>
                    <p className="text-sm text-gray-600 mt-1">Weekly data backup</p>
                  </div>
                  <Switch
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => setSettings({...settings, autoBackup: checked})}
                    className="data-[state=checked]:bg-purple-600 scale-110"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save Button - Mobile optimized */}
          <div className="flex justify-center lg:justify-end mt-6">
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="w-full sm:w-auto h-12 px-8 text-base font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl shadow-lg transition-all duration-200"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4 p-4 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Profile Information */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-purple-600" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="userName" className="text-sm font-medium text-gray-700">Full Name</Label>
                  <Input
                    id="userName"
                    value={userSettings.name}
                    onChange={(e) => setUserSettings({...userSettings, name: e.target.value})}
                    placeholder="Enter your full name"
                    className="h-12 text-base rounded-xl border-2 border-gray-200/50 focus:border-purple-300 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userEmail" className="text-sm font-medium text-gray-700">Email Address</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={userSettings.email}
                    onChange={(e) => setUserSettings({...userSettings, email: e.target.value})}
                    placeholder="Enter your email"
                    className="h-12 text-base rounded-xl border-2 border-gray-200/50 focus:border-purple-300 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userCompany" className="text-sm font-medium text-gray-700">Company/Business</Label>
                  <Input
                    id="userCompany"
                    value={userSettings.company}
                    onChange={(e) => setUserSettings({...userSettings, company: e.target.value})}
                    placeholder="Enter your company name"
                    className="h-12 text-base rounded-xl border-2 border-gray-200/50 focus:border-purple-300 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userPhone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                  <Input
                    id="userPhone"
                    value={userSettings.phone}
                    onChange={(e) => setUserSettings({...userSettings, phone: e.target.value})}
                    placeholder="Enter your phone number"
                    className="h-12 text-base rounded-xl border-2 border-gray-200/50 focus:border-purple-300 transition-colors"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-5 w-5 text-purple-600" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100/50">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-600 mt-1">Receive important updates via email</p>
                  </div>
                  <Switch
                    checked={userSettings.emailNotifications}
                    onCheckedChange={(checked) => setUserSettings({...userSettings, emailNotifications: checked})}
                    className="data-[state=checked]:bg-purple-600 scale-110"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100/50">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-gray-900">Push Notifications</p>
                    <p className="text-sm text-gray-600 mt-1">Browser notifications for new receipts</p>
                  </div>
                  <Switch
                    checked={userSettings.pushNotifications}
                    onCheckedChange={(checked) => setUserSettings({...userSettings, pushNotifications: checked})}
                    className="data-[state=checked]:bg-purple-600 scale-110"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100/50">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-gray-900">Marketing Emails</p>
                    <p className="text-sm text-gray-600 mt-1">Tips, updates, and product news</p>
                  </div>
                  <Switch
                    checked={userSettings.marketingEmails}
                    onCheckedChange={(checked) => setUserSettings({...userSettings, marketingEmails: checked})}
                    className="data-[state=checked]:bg-purple-600 scale-110"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security Section */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-purple-600" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200/50 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-blue-800">Change Password</p>
                      <p className="text-sm text-blue-600 mt-1">Update your account password</p>
                    </div>
                    <Button variant="outline" className="h-10 px-4 text-blue-600 border-blue-300 hover:bg-blue-50 rounded-lg flex-shrink-0">
                      <Lock className="h-4 w-4 mr-2" />
                      Change
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-green-50 to-green-100/50 border border-green-200/50 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-green-800">Two-Factor Auth</p>
                      <p className="text-sm text-green-600 mt-1">Enable 2FA for extra security</p>
                    </div>
                    <Button variant="outline" className="h-10 px-4 text-green-600 border-green-300 hover:bg-green-50 rounded-lg flex-shrink-0">
                      <Shield className="h-4 w-4 mr-2" />
                      Enable
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button - Mobile optimized */}
          <div className="flex justify-center lg:justify-end mt-6">
            <Button 
              onClick={saveUserSettings}
              disabled={saving}
              className="w-full sm:w-auto h-12 px-8 text-base font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl shadow-lg transition-all duration-200"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Account Settings
                </>
              )}
            </Button>
          </div>
        </TabsContent>




      </Tabs>
      
      {/* AI Chat Agent - Mobile positioned */}
      <div className="pb-4">
        <AIChatAgent />
      </div>
    </div>
  );
}