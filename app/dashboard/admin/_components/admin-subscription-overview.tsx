"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  MoreHorizontal,
  Eye,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminSubscriptionOverviewProps, TenantSubscription } from '@/lib/types/subscription';

export function AdminSubscriptionOverview({ 
  subscriptions, 
  onViewDetails, 
  onManualAdjustment 
}: AdminSubscriptionOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'trialing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'past_due':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'cancelled':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getUsagePercentage = (usage: any) => {
    if (!usage || !usage.usage) return 0;
    
    // Calculate average usage percentage across all features
    const usageEntries = Object.values(usage.usage) as Array<{
      currentUsage: number;
      limit: number;
      isUnlimited: boolean;
    }>;

    if (usageEntries.length === 0) return 0;

    const limitedUsage = usageEntries.filter(u => !u.isUnlimited);
    if (limitedUsage.length === 0) return 0;

    const totalPercentage = limitedUsage.reduce((sum, u) => {
      return sum + (u.currentUsage / u.limit) * 100;
    }, 0);

    return Math.round(totalPercentage / limitedUsage.length);
  };

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          No subscriptions found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Healthy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {subscriptions.filter(s => s.health === 'good').length}
            </div>
            <p className="text-xs text-muted-foreground">
              No issues detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Warning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {subscriptions.filter(s => s.health === 'warning').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {subscriptions.filter(s => s.health === 'critical').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Immediate action required
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((subscription) => {
                  const usagePercentage = getUsagePercentage(subscription.usage);
                  
                  return (
                    <TableRow key={subscription.tenant_id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{subscription.tenant_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {subscription.tenant_id.substring(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {subscription.subscription.subscription_plan?.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(subscription.subscription.amount)} / {subscription.subscription.billing_cycle}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getStatusColor(subscription.subscription.status)}>
                          {subscription.subscription.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                usagePercentage >= 90 ? 'bg-red-500' :
                                usagePercentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {usagePercentage}%
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(subscription.subscription.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {subscription.subscription.billing_cycle}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getHealthIcon(subscription.health)}
                          <Badge className={getHealthColor(subscription.health)}>
                            {subscription.health}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {subscription.lastPayment ? (
                          <div>
                            <div className="text-sm">
                              {formatDate(subscription.lastPayment.date)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(subscription.lastPayment.amount)}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={
                                subscription.lastPayment.status === 'succeeded' 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }
                            >
                              {subscription.lastPayment.status}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No payments</span>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewDetails(subscription.tenant_id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onManualAdjustment(subscription.tenant_id, {})}>
                              <Settings className="h-4 w-4 mr-2" />
                              Manual Adjustment
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Flag Issue
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}