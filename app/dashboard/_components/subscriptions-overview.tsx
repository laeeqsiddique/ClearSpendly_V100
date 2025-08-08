"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshCw, Plus, MoreVertical, Building, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Subscription, SubscriptionSummary } from "@/lib/types/subscription";
import { AddSubscriptionDialog } from "./add-subscription-dialog";
import { DeleteSubscriptionDialog } from "./delete-subscription-dialog";
import { EditSubscriptionDialog } from "./edit-subscription-dialog";

interface SubscriptionsOverviewProps {
  startDate?: string;
  endDate?: string;
}

export function SubscriptionsOverview({ startDate, endDate }: SubscriptionsOverviewProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; serviceName: string }>({
    open: false,
    id: '',
    serviceName: ''
  });
  const [editDialog, setEditDialog] = useState<{ open: boolean; subscription: Subscription | null }>({
    open: false,
    subscription: null
  });

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions?status=active');
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      
      const data = await response.json();
      setSubscriptions(data.subscriptions);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [startDate, endDate]);

  const handleStatusChange = async (id: string, newStatus: 'active' | 'paused' | 'cancelled') => {
    try {
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update subscription');
      
      toast.success(`Subscription ${newStatus === 'cancelled' ? 'cancelled' : `marked as ${newStatus}`}`);
      fetchSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
    }
  };

  const handleDelete = (id: string, serviceName: string) => {
    setDeleteDialog({ open: true, id, serviceName });
  };

  const handleEdit = (subscription: Subscription) => {
    setEditDialog({ open: true, subscription });
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/subscriptions/${deleteDialog.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete subscription');
      
      toast.success('Subscription deleted successfully');
      setDeleteDialog({ open: false, id: '', serviceName: '' });
      fetchSubscriptions();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast.error('Failed to delete subscription');
    }
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      software: '#3B82F6',
      entertainment: '#8B5CF6',
      cloud_storage: '#06B6D4',
      communication: '#10B981',
      marketing: '#F59E0B',
      utilities: '#6B7280',
      insurance: '#EF4444',
      membership: '#EC4899',
      education: '#6366F1',
      other: '#9CA3AF'
    };
    return colors[category || 'other'] || colors.other;
  };

  if (loading) {
    return (
      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-purple-500 animate-spin" />
            Loading Subscriptions...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!subscriptions.length) {
    return (
      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-purple-500" />
                Subscriptions
              </CardTitle>
              <CardDescription>
                Track your recurring services and subscriptions
              </CardDescription>
            </div>
            <Button 
              onClick={() => setDialogOpen(true)}
              size="sm" 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Subscription
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 text-purple-200" />
            <p>No active subscriptions yet</p>
            <p className="text-sm mt-2">Add your first subscription to start tracking</p>
          </div>
        </CardContent>
        <AddSubscriptionDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchSubscriptions} />
      </Card>
    );
  }

  return (
    <>
      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-purple-500" />
                Active Subscriptions
              </CardTitle>
              <CardDescription>
                {summary?.active_count} active • ${summary?.total_monthly.toFixed(2)} monthly • ${summary?.total_yearly.toFixed(2)} yearly
              </CardDescription>
            </div>
            <Button 
              onClick={() => setDialogOpen(true)}
              size="sm" 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Subscription
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {subscriptions.map((subscription) => (
              <SubscriptionCard 
                key={subscription.id} 
                subscription={subscription}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
                getCategoryColor={getCategoryColor}
              />
            ))}
          </div>
          
          {summary && summary.upcoming_charges.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Upcoming Charges (Next 30 days)</h4>
              <div className="space-y-2">
                {summary.upcoming_charges.slice(0, 5).map((charge) => (
                  <div key={charge.subscription_id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{charge.service_name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{format(new Date(charge.charge_date), 'MMM dd')}</span>
                      <span className="font-medium">${charge.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AddSubscriptionDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchSubscriptions} />
      <EditSubscriptionDialog 
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog(prev => ({ ...prev, open }))}
        onSuccess={fetchSubscriptions}
        subscription={editDialog.subscription}
      />
      <DeleteSubscriptionDialog 
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        onConfirm={confirmDelete}
        serviceName={deleteDialog.serviceName}
      />
    </>
  );
}

function SubscriptionCard({ 
  subscription, 
  onStatusChange,
  onEdit,
  onDelete,
  getCategoryColor 
}: { 
  subscription: Subscription;
  onStatusChange: (id: string, status: 'active' | 'paused' | 'cancelled') => void;
  onEdit: (subscription: Subscription) => void;
  onDelete: (id: string, serviceName: string) => void;
  getCategoryColor: (category?: string) => string;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100 hover:shadow-md transition-all">
      {/* Service Icon & Info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
          <Building className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-semibold text-gray-900">{subscription.service_name}</div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {subscription.category && (
              <>
                <Badge 
                  variant="secondary" 
                  className="px-2 py-0.5 text-xs"
                  style={{ 
                    backgroundColor: getCategoryColor(subscription.category) + '20', 
                    color: getCategoryColor(subscription.category) 
                  }}
                >
                  {subscription.category.replace('_', ' ')}
                </Badge>
                <span>•</span>
              </>
            )}
            <span className="capitalize">{subscription.frequency}</span>
          </div>
        </div>
      </div>
      
      {/* Amount & Next Charge */}
      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="font-semibold text-gray-900 flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-gray-500" />
            {subscription.amount.toFixed(2)}
          </div>
          {subscription.next_charge_date && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(subscription.next_charge_date), 'MMM dd')}
            </div>
          )}
        </div>
        
        {/* Status & Actions */}
        <div className="flex items-center gap-2">
          <Badge 
            variant={subscription.status === 'active' ? 'default' : 'secondary'}
            className={subscription.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : ''}
          >
            {subscription.status}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(subscription)}>
                Edit Subscription
              </DropdownMenuItem>
              {subscription.status === 'active' && (
                <DropdownMenuItem onClick={() => onStatusChange(subscription.id, 'paused')}>
                  Pause Subscription
                </DropdownMenuItem>
              )}
              {subscription.status === 'paused' && (
                <DropdownMenuItem onClick={() => onStatusChange(subscription.id, 'active')}>
                  Resume Subscription
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                className="text-orange-600"
                onClick={() => onStatusChange(subscription.id, 'cancelled')}
              >
                Cancel Subscription
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => onDelete(subscription.id, subscription.service_name)}
              >
                Delete Permanently
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}