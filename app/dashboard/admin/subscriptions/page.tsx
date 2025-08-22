"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  TenantSubscription, 
  AdminAnalyticsResponse,
  SubscriptionAdjustment,
  CouponCode 
} from '@/lib/types/subscription';
import { AdminSubscriptionOverview } from '../_components/admin-subscription-overview';
import { ManualAdjustmentDialog } from '../_components/manual-adjustment-dialog';
import { CouponManagement } from '../_components/coupon-management';

export const dynamic = 'force-dynamic';

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [subscriptionsRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/subscriptions'),
        fetch('/api/admin/subscriptions/analytics')
      ]);

      if (subscriptionsRes.ok) {
        const subscriptionsData = await subscriptionsRes.json();
        setSubscriptions(subscriptionsData.data || []);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.data);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (tenantId: string) => {
    setSelectedTenant(tenantId);
    // Navigate to detailed view or show modal
  };

  const handleManualAdjustment = (tenantId: string, adjustment: Partial<SubscriptionAdjustment>) => {
    setSelectedTenant(tenantId);
    setShowAdjustmentDialog(true);
  };

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.subscription.subscription_plan?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
          <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage all tenant subscriptions
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.activeSubscriptions} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.monthlyRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                +{analytics.growthRate}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.churnRate}%</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{analytics.recentFailures}</div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="adjustments">Manual Adjustments</TabsTrigger>
          <TabsTrigger value="coupons">Coupon Management</TabsTrigger>
          <TabsTrigger value="analytics">Detailed Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Tenant Subscriptions</CardTitle>
              <CardDescription>
                Overview of all tenant subscriptions and their health status
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tenants or plans..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              <AdminSubscriptionOverview
                subscriptions={filteredSubscriptions}
                onViewDetails={handleViewDetails}
                onManualAdjustment={handleManualAdjustment}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Adjustments</CardTitle>
              <CardDescription>
                Apply credits, discounts, or other manual adjustments to subscriptions
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manual adjustment interface will be implemented here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coupons" className="space-y-4">
          <CouponManagement />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Health Distribution</CardTitle>
                <CardDescription>
                  Distribution of subscription health across tenants
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {analytics && (
                  <div className="space-y-3">
                    {Object.entries(analytics.healthDistribution).map(([health, count]) => (
                      <div key={health} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getHealthColor(health)}>{health}</Badge>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>
                  Monthly recurring revenue and growth metrics
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Revenue charts and trends will be implemented here
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Manual Adjustment Dialog */}
      <ManualAdjustmentDialog
        open={showAdjustmentDialog}
        onOpenChange={setShowAdjustmentDialog}
        tenantId={selectedTenant}
        onAdjustmentApplied={fetchData}
      />
    </div>
  );
}