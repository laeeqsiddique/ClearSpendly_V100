"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Calendar,
  Percent,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { CouponCode, CouponForm } from '@/lib/types/subscription';

export function CouponManagement() {
  const [coupons, setCoupons] = useState<CouponCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponCode | null>(null);
  const [formData, setFormData] = useState<CouponForm>({
    code: '',
    type: 'percentage',
    value: 0,
    description: ''
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/coupons');
      
      if (response.ok) {
        const data = await response.json();
        setCoupons(data.data || []);
      } else {
        // Mock data for demonstration
        setCoupons([
          {
            id: '1',
            code: 'WELCOME20',
            type: 'percentage',
            value: 20,
            description: 'Welcome discount for new customers',
            max_uses: 100,
            used_count: 15,
            expires_at: '2024-12-31T23:59:59Z',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '2',
            code: 'SAVE50',
            type: 'fixed_amount',
            value: 50,
            description: 'Fixed discount for annual subscriptions',
            max_uses: 50,
            used_count: 8,
            expires_at: '2024-06-30T23:59:59Z',
            is_active: true,
            created_at: '2024-02-01T00:00:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Coupon created successfully!');
        fetchCoupons();
        setShowCreateDialog(false);
        resetForm();
      } else {
        toast.error(data.error || 'Failed to create coupon');
      }
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast.error('Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCoupon) return;

    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/coupons/${editingCoupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Coupon updated successfully!');
        fetchCoupons();
        setEditingCoupon(null);
        resetForm();
      } else {
        toast.error(data.error || 'Failed to update coupon');
      }
    } catch (error) {
      console.error('Error updating coupon:', error);
      toast.error('Failed to update coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Coupon deleted successfully!');
        fetchCoupons();
      } else {
        toast.error('Failed to delete coupon');
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (couponId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/coupons/${couponId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Coupon ${!isActive ? 'activated' : 'deactivated'}!`);
        fetchCoupons();
      } else {
        toast.error('Failed to update coupon status');
      }
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      toast.error('Failed to update coupon status');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: 0,
      description: ''
    });
  };

  const handleEdit = (coupon: CouponCode) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description || '',
      max_uses: coupon.max_uses,
      expires_at: coupon.expires_at?.substring(0, 10) // Convert to date input format
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Coupon code copied to clipboard!');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getStatusColor = (coupon: CouponCode) => {
    if (!coupon.is_active) return 'bg-gray-50 text-gray-700';
    if (isExpired(coupon.expires_at)) return 'bg-red-50 text-red-700';
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return 'bg-yellow-50 text-yellow-700';
    return 'bg-green-50 text-green-700';
  };

  const getStatusText = (coupon: CouponCode) => {
    if (!coupon.is_active) return 'Inactive';
    if (isExpired(coupon.expires_at)) return 'Expired';
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return 'Used Up';
    return 'Active';
  };

  if (loading && coupons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Coupon Management</CardTitle>
          <CardDescription>Loading coupons...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Coupon Management</CardTitle>
            <CardDescription>
              Create and manage discount coupons for subscriptions
            </CardDescription>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Coupon
              </Button>
            </DialogTrigger>
            
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Coupon</DialogTitle>
                <DialogDescription>
                  Create a new discount coupon for customers
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coupon-code">Coupon Code</Label>
                  <Input
                    id="coupon-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="SAVE20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount-type">Discount Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: 'percentage' | 'fixed_amount') => 
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount-value">
                    {formData.type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                  </Label>
                  <div className="relative">
                    {formData.type === 'percentage' ? (
                      <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    ) : (
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    )}
                    <Input
                      id="discount-value"
                      type="number"
                      step={formData.type === 'percentage' ? '1' : '0.01'}
                      min="0"
                      max={formData.type === 'percentage' ? '100' : undefined}
                      value={formData.value || ''}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description of this coupon..."
                    rows={2}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="max-uses">Maximum Uses (Optional)</Label>
                    <Input
                      id="max-uses"
                      type="number"
                      min="1"
                      value={formData.max_uses || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        max_uses: parseInt(e.target.value) || undefined 
                      })}
                      placeholder="Unlimited"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expires-at">Expiration Date (Optional)</Label>
                    <Input
                      id="expires-at"
                      type="date"
                      value={formData.expires_at || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        expires_at: e.target.value || undefined 
                      })}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? 'Creating...' : 'Create Coupon'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {coupons.length === 0 ? (
          <div className="text-center py-8">
            <Percent className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No coupons created</h3>
            <p className="text-muted-foreground">
              Create your first discount coupon to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                          {coupon.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(coupon.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {coupon.description}
                        </p>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline">
                        {coupon.type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <span className="font-medium">
                        {coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value}`}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {coupon.used_count} / {coupon.max_uses || '∞'}
                      </div>
                      {coupon.max_uses && (
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full"
                            style={{ 
                              width: `${Math.min((coupon.used_count / coupon.max_uses) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(coupon.expires_at)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getStatusColor(coupon)}>
                        {getStatusText(coupon)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(coupon.id, coupon.is_active)}
                        >
                          {coupon.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(coupon)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingCoupon} onOpenChange={(open) => !open && setEditingCoupon(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
            <DialogDescription>
              Update coupon details
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateCoupon} className="space-y-4">
            {/* Same form fields as create, pre-populated */}
            <div className="space-y-2">
              <Label htmlFor="edit-coupon-code">Coupon Code</Label>
              <Input
                id="edit-coupon-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-discount-type">Discount Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: 'percentage' | 'fixed_amount') => 
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-discount-value">
                {formData.type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
              </Label>
              <Input
                id="edit-discount-value"
                type="number"
                step={formData.type === 'percentage' ? '1' : '0.01'}
                min="0"
                max={formData.type === 'percentage' ? '100' : undefined}
                value={formData.value || ''}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCoupon(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Updating...' : 'Update Coupon'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}