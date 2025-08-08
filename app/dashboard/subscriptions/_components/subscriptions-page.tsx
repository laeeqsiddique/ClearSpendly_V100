"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  RefreshCw, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  DollarSign, 
  Calendar,
  ArrowLeft,
  Pause,
  Play,
  XCircle,
  Edit3,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { Subscription, SubscriptionSummary } from "@/lib/types/subscription";
import { AddSubscriptionDialog } from "@/app/dashboard/_components/add-subscription-dialog";
import { DeleteSubscriptionDialog } from "@/app/dashboard/_components/delete-subscription-dialog";
import { EditSubscriptionDialog } from "@/app/dashboard/_components/edit-subscription-dialog";

export function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
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
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await fetch(`/api/subscriptions${params}`);
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      
      const data = await response.json();
      setSubscriptions(data.subscriptions);
      setSummary(data.summary);
      filterSubscriptions(data.subscriptions, searchQuery, statusFilter, categoryFilter);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const filterSubscriptions = (subs: Subscription[], search: string, status: string, category: string) => {
    let filtered = [...subs];
    
    if (search) {
      filtered = filtered.filter(sub => 
        sub.service_name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (status !== 'all') {
      filtered = filtered.filter(sub => sub.status === status);
    }
    
    if (category !== 'all') {
      filtered = filtered.filter(sub => sub.category === category);
    }
    
    setFilteredSubscriptions(filtered);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    filterSubscriptions(subscriptions, searchQuery, statusFilter, categoryFilter);
  }, [searchQuery, statusFilter, categoryFilter, subscriptions]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return '';
    }
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      software: '#9333EA',
      entertainment: '#8B5CF6',
      cloud_storage: '#6366F1',
      communication: '#3B82F6',
      marketing: '#EC4899',
      utilities: '#6B7280',
      insurance: '#EF4444',
      membership: '#A855F7',
      education: '#7C3AED',
      other: '#9CA3AF'
    };
    return colors[category || 'other'] || colors.other;
  };

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start justify-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Subscriptions
              </h1>
              <p className="text-muted-foreground">
                Manage your recurring services and track subscription costs
              </p>
            </div>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Subscription
            </Button>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-500" />
                    Monthly Total
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                    ${summary.total_monthly.toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-500" />
                    Yearly Total
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold text-green-600">
                    ${summary.total_yearly.toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-purple-500" />
                    Active
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold text-purple-600">
                    {summary.active_count}
                  </CardTitle>
                </CardHeader>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Pause className="h-4 w-4 text-yellow-500" />
                    Paused/Cancelled
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold text-yellow-600">
                    {summary.paused_count + summary.cancelled_count}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search subscriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 border-purple-200 focus:border-purple-500"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] border-purple-200">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] border-purple-200">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="cloud_storage">Cloud Storage</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="membership">Memberships</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
          </Card>

          {/* Subscriptions Table */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : filteredSubscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-12 w-12 mx-auto mb-4 text-purple-200" />
                  <p className="text-muted-foreground">No subscriptions found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Next Charge</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell className="font-medium">{subscription.service_name}</TableCell>
                        <TableCell>
                          {subscription.category && (
                            <Badge 
                              variant="secondary"
                              style={{ 
                                backgroundColor: getCategoryColor(subscription.category) + '20', 
                                color: getCategoryColor(subscription.category) 
                              }}
                            >
                              {subscription.category.replace('_', ' ')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>${subscription.amount.toFixed(2)}</TableCell>
                        <TableCell className="capitalize">{subscription.frequency}</TableCell>
                        <TableCell>
                          {subscription.next_charge_date 
                            ? format(new Date(subscription.next_charge_date), 'MMM dd, yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(subscription.status)}>
                            {subscription.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(subscription)}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {subscription.status === 'active' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(subscription.id, 'paused')}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause
                                </DropdownMenuItem>
                              )}
                              {subscription.status === 'paused' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(subscription.id, 'active')}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Resume
                                </DropdownMenuItem>
                              )}
                              {subscription.status !== 'cancelled' && (
                                <DropdownMenuItem 
                                  className="text-orange-600"
                                  onClick={() => handleStatusChange(subscription.id, 'cancelled')}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDelete(subscription.id, subscription.service_name)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Delete Permanently
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
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
    </section>
  );
}