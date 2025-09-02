"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Subscription {
  id: string;
  tenant_id: string;
  tenant_name: string;
  plan_name: string;
  status: string;
  amount: number;
  billing_cycle: string;
  current_period_end: string;
  created_at: string;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Check if user is authorized (owner or admin role)
  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Get user's tenant membership with admin/owner role check
      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .single();

      if (!membership) {
        toast.error('You do not have permission to access this page');
        router.push('/dashboard');
        return;
      }

      // Store the user's tenant ID for secure filtering
      setCurrentTenantId(membership.tenant_id);
      setIsAuthorized(true);
      fetchSubscriptions(membership.tenant_id);
    } catch (error) {
      console.error('Authorization error:', error);
      router.push('/dashboard');
    }
  };

  const fetchSubscriptions = async (tenantId: string) => {
    try {
      setLoading(true);

      // SECURITY FIX: Only fetch subscriptions for the current user's tenant
      const { data, error } = await supabase
        .from('subscription')
        .select(`
          id,
          tenant_id,
          status,
          amount,
          billing_cycle,
          current_period_end,
          created_at,
          tenant:tenant_id (
            name
          ),
          subscription_plan (
            name
          )
        `)
        .eq('tenant_id', tenantId) // CRITICAL: Filter by current user's tenant only
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data
      const transformedData = data?.map(sub => ({
        id: sub.id,
        tenant_id: sub.tenant_id,
        tenant_name: sub.tenant?.name || 'Unknown',
        plan_name: sub.subscription_plan?.name || 'Free',
        status: sub.status,
        amount: sub.amount || 0,
        billing_cycle: sub.billing_cycle || 'monthly',
        current_period_end: sub.current_period_end,
        created_at: sub.created_at
      })) || [];

      setSubscriptions(transformedData);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      trialing: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      past_due: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
      inactive: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100); // Convert cents to dollars
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.plan_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    revenue: subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + s.amount, 0)
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Checking authorization...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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
            Monitor and manage tenant subscriptions
          </p>
        </div>
        
        <Button variant="outline" onClick={() => currentTenantId && fetchSubscriptions(currentTenantId)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.revenue)}</div>
            <p className="text-xs text-muted-foreground">
              From active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Of total subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Subscriptions</CardTitle>
          <CardDescription>
            View and manage your tenant's subscriptions
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tenant or plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Next Payment</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.tenant_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{sub.plan_name}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>{formatCurrency(sub.amount)}</TableCell>
                      <TableCell className="capitalize">{sub.billing_cycle}</TableCell>
                      <TableCell>
                        {sub.current_period_end ? formatDate(sub.current_period_end) : '-'}
                      </TableCell>
                      <TableCell>{formatDate(sub.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}