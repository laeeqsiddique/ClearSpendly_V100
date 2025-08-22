"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Search,
  Play,
  Settings 
} from 'lucide-react';

interface TenantSetupStatus {
  totalTenants: number;
  tenantsWithSetup: number;
  migrationProgress: number;
  recentMigrations: any[];
}

interface TenantDetails {
  tenant: {
    id: string;
    name: string;
    slug: string;
    subscription_plan: string;
    created_at: string;
  };
  setupCompleted: boolean;
  setupLog: any;
  componentStatus: {
    tagCategories: boolean;
    emailTemplates: boolean;
    invoiceTemplates: boolean;
    userPreferences: boolean;
    irsRates: boolean;
    usageTracking: boolean;
    vendorCategories: boolean;
  };
  completionPercentage: number;
  summary: {
    completedComponents: number;
    totalComponents: number;
    missingComponents: string[];
  };
}

export default function TenantSetupAdminPage() {
  const [status, setStatus] = useState<TenantSetupStatus | null>(null);
  const [tenantDetails, setTenantDetails] = useState<TenantDetails | null>(null);
  const [searchTenantId, setSearchTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [migrationRunning, setMigrationRunning] = useState(false);

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const fetchSetupStatus = async () => {
    try {
      const response = await fetch('/api/admin/migrate-existing-tenants');
      if (response.ok) {
        const data = await response.json();
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch setup status:', error);
    }
  };

  const runMigration = async () => {
    setMigrationRunning(true);
    try {
      const response = await fetch('/api/admin/migrate-existing-tenants', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Migration completed:', data);
        await fetchSetupStatus(); // Refresh status
      } else {
        console.error('Migration failed');
      }
    } catch (error) {
      console.error('Migration error:', error);
    } finally {
      setMigrationRunning(false);
    }
  };

  const searchTenant = async () => {
    if (!searchTenantId.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/setup-individual-tenant?tenantId=${encodeURIComponent(searchTenantId.trim())}`);
      if (response.ok) {
        const data = await response.json();
        setTenantDetails(data.data);
      } else {
        setTenantDetails(null);
        console.error('Tenant not found');
      }
    } catch (error) {
      console.error('Failed to fetch tenant details:', error);
      setTenantDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const setupIndividualTenant = async (tenantId: string, force = false) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/setup-individual-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, force })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Individual setup completed:', data);
        if (tenantDetails?.tenant.id === tenantId) {
          await searchTenant(); // Refresh details
        }
        await fetchSetupStatus(); // Refresh overall status
      }
    } catch (error) {
      console.error('Individual setup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComponentIcon = (completed: boolean) => {
    return completed ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Setup Administration</h1>
          <p className="text-muted-foreground">
            Monitor and manage comprehensive tenant setup across the system
          </p>
        </div>
        <Button 
          onClick={fetchSetupStatus} 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="individual">Individual Tenant</TabsTrigger>
          <TabsTrigger value="migration">Bulk Migration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {status && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{status.totalTenants}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Setup Complete</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{status.tenantsWithSetup}</div>
                  <p className="text-xs text-muted-foreground">
                    {status.migrationProgress}% completion rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Migration Progress</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <Progress value={status.migrationProgress} className="mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {status.totalTenants - status.tenantsWithSetup} tenants remaining
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {status?.recentMigrations && status.recentMigrations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Migration Activity</CardTitle>
                <CardDescription>Latest migration runs and their results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {status.recentMigrations.map((migration, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{migration.migration_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {migration.successful_migrations} successful, {migration.failed_migrations} failed
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={migration.failed_migrations === 0 ? "default" : "destructive"}>
                          {migration.failed_migrations === 0 ? "Success" : "Partial"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(migration.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Tenant Setup</CardTitle>
              <CardDescription>
                Check setup status and run setup for individual tenants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="tenantId">Tenant ID</Label>
                  <Input
                    id="tenantId"
                    value={searchTenantId}
                    onChange={(e) => setSearchTenantId(e.target.value)}
                    placeholder="Enter tenant ID to check status..."
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={searchTenant} 
                    disabled={loading || !searchTenantId.trim()}
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Check Status
                  </Button>
                </div>
              </div>

              {tenantDetails && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{tenantDetails.tenant.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tenantDetails.tenant.slug} • {tenantDetails.tenant.subscription_plan}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={tenantDetails.setupCompleted ? "default" : "secondary"}>
                        {tenantDetails.setupCompleted ? "Setup Complete" : "Setup Incomplete"}
                      </Badge>
                      <Badge variant="outline">
                        {tenantDetails.completionPercentage}% Complete
                      </Badge>
                    </div>
                  </div>

                  <Progress value={tenantDetails.completionPercentage} className="w-full" />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(tenantDetails.componentStatus).map(([component, completed]) => (
                      <div key={component} className="flex items-center gap-2 p-2 border rounded">
                        {getComponentIcon(completed)}
                        <span className="text-sm font-medium">
                          {component.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>

                  {tenantDetails.summary.missingComponents.length > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-yellow-800">Missing Components</span>
                      </div>
                      <p className="text-sm text-yellow-700">
                        {tenantDetails.summary.missingComponents.join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setupIndividualTenant(tenantDetails.tenant.id, false)}
                      disabled={loading}
                      className="flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Add Missing Components
                    </Button>
                    <Button 
                      onClick={() => setupIndividualTenant(tenantDetails.tenant.id, true)}
                      disabled={loading}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Force Full Setup
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="migration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Migration</CardTitle>
              <CardDescription>
                Run comprehensive setup migration for all existing tenants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Migration Information</span>
                </div>
                <p className="text-sm text-blue-700">
                  This will add missing setup components to all existing tenants. 
                  Tenants that already have complete setup will be skipped.
                </p>
              </div>

              <Button 
                onClick={runMigration}
                disabled={migrationRunning}
                size="lg"
                className="w-full flex items-center gap-2"
              >
                {migrationRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Running Migration...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Bulk Migration
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}