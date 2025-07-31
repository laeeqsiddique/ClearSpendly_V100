"use client";

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { 
  usePermission, 
  usePermissions, 
  useMinimumRole,
  PermissionGate,
  RoleGate 
} from '@/hooks/use-permissions';
import { useTeamContext, MultiUserGate, TeamFeatureGate } from '@/hooks/use-team-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Users, Eye, Edit, Trash2, Plus } from 'lucide-react';

const PERMISSIONS_TO_TEST = [
  'receipts:view',
  'receipts:create', 
  'receipts:edit',
  'receipts:delete',
  'team:invite',
  'team:manage',
  'invoices:view',
  'reports:view'
] as const;

export default function PermissionsTestPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  
  // Test individual permission
  const createPermission = usePermission('receipts:create');
  const deletePermission = usePermission('receipts:delete');
  const teamInvitePermission = usePermission('team:invite');
  
  // Test multiple permissions
  const multiplePermissions = usePermissions(PERMISSIONS_TO_TEST);
  
  // Test role levels
  const isAdmin = useMinimumRole('admin');
  const isOwner = useMinimumRole('owner');
  
  // Test team context
  const teamContext = useTeamContext();
  
  const testApiCall = async (endpoint: string, method: string = 'GET') => {
    try {
      const response = await fetch(endpoint, { method });
      const data = await response.json();
      
      setTestResults(prev => [...prev, {
        endpoint,
        method,
        status: response.status,
        allowed: response.ok,
        error: data.error || null,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        endpoint,
        method,
        status: 'Error',
        allowed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  const clearResults = () => setTestResults([]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Permission System Test</h1>
          <p className="text-muted-foreground">Test role-based access control and permissions</p>
        </div>
      </div>

      {/* User Context Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current User Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          {createPermission.loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading user context...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">User ID</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {createPermission.userContext?.userId || 'Not loaded'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Role</p>
                <Badge variant="outline">
                  {createPermission.userContext?.role || 'Unknown'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Tenant ID</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {createPermission.userContext?.tenantId || 'Not loaded'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Individual Permission Checks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="text-sm">Create Receipts</span>
              </div>
              <Badge variant={createPermission.hasPermission ? "default" : "destructive"}>
                {createPermission.loading ? "..." : createPermission.hasPermission ? "✓" : "✗"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                <span className="text-sm">Delete Receipts</span>
              </div>
              <Badge variant={deletePermission.hasPermission ? "default" : "destructive"}>
                {deletePermission.loading ? "..." : deletePermission.hasPermission ? "✓" : "✗"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Invite Team</span>
              </div>
              <Badge variant={teamInvitePermission.hasPermission ? "default" : "destructive"}>
                {teamInvitePermission.loading ? "..." : teamInvitePermission.hasPermission ? "✓" : "✗"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm">Admin Role</span>
              </div>
              <Badge variant={isAdmin.hasMinimumRole ? "default" : "destructive"}>
                {isAdmin.loading ? "..." : isAdmin.hasMinimumRole ? "✓" : "✗"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>All permissions for current role</CardDescription>
        </CardHeader>
        <CardContent>
          {multiplePermissions.loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading permissions...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PERMISSIONS_TO_TEST.map((permission) => (
                <div key={permission} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-xs font-mono">{permission}</span>
                  <Badge 
                    size="sm" 
                    variant={multiplePermissions.permissions[permission] ? "default" : "secondary"}
                  >
                    {multiplePermissions.permissions[permission] ? "✓" : "✗"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Context Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Context Detection
          </CardTitle>
          <CardDescription>Test single-user vs multi-user tenant detection</CardDescription>
        </CardHeader>
        <CardContent>
          {teamContext.loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading team context...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Tenant Type</p>
                <Badge variant={teamContext.isMultiUser ? "default" : "secondary"}>
                  {teamContext.isMultiUser ? "Multi-User" : "Single-User"}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Member Count</p>
                <Badge variant="outline">
                  {teamContext.memberCount} {teamContext.memberCount === 1 ? 'member' : 'members'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Your Role</p>
                <Badge variant="outline">
                  {teamContext.userRole}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Show Team Features</p>
                <Badge variant={teamContext.showTeamFeatures ? "default" : "secondary"}>
                  {teamContext.showTeamFeatures ? "Yes" : "No"}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Show User Filtering</p>
                <Badge variant={teamContext.showUserFiltering ? "default" : "secondary"}>
                  {teamContext.showUserFiltering ? "Yes" : "No"}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Show Created By</p>
                <Badge variant={teamContext.showCreatedBy ? "default" : "secondary"}>
                  {teamContext.showCreatedBy ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          )}
          
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Expected Results (Current):</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Tenant Type:</strong> Single-User (since you haven't invited anyone)</li>
                <li>• <strong>Member Count:</strong> 1 member</li>
                <li>• <strong>Show Team Features:</strong> No (clean single-user experience)</li>
                <li>• <strong>Show User Filtering:</strong> No (not needed for single user)</li>
                <li>• <strong>Show Created By:</strong> No (all data is yours anyway)</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">🧪 How to Test Multi-User:</h4>
              <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                <li>Go to <strong>/dashboard/team</strong></li>
                <li>Click "Invite Team Member"</li>
                <li>Send yourself an invitation</li>
                <li>The system will detect >1 membership and switch to multi-user mode</li>
                <li>Come back here to see the values change</li>
              </ol>
              <p className="text-xs text-green-600 mt-2">
                💡 Only accepted invitations count - pending ones won't trigger multi-user mode
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Gates Test */}
      <Card>
        <CardHeader>
          <CardTitle>Component Permission Gates</CardTitle>
          <CardDescription>Testing conditional rendering based on permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PermissionGate 
            permission="receipts:create"
            fallback={<p className="text-sm text-muted-foreground">❌ You cannot see this create button</p>}
          >
            <Button className="w-fit">
              <Plus className="h-4 w-4 mr-2" />
              Create Receipt (Permission Gate)
            </Button>
          </PermissionGate>

          <RoleGate 
            minimumRole="admin"
            fallback={<p className="text-sm text-muted-foreground">❌ Admin-only content hidden</p>}
          >
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm font-medium text-orange-800">
                🔒 This content is only visible to admins and owners
              </p>
            </div>
          </RoleGate>

          <RoleGate 
            minimumRole="owner"
            fallback={<p className="text-sm text-muted-foreground">❌ Owner-only content hidden</p>}
          >
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800">
                👑 This content is only visible to owners
              </p>
            </div>
          </RoleGate>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">🧪 Team Context Gates (Testing)</h4>
            
            <MultiUserGate
              fallback={
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    ✅ SINGLE-USER: This message shows because you're in single-user mode
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Multi-user features are hidden to keep your UI clean
                  </p>
                </div>
              }
            >
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800">
                  🏢 MULTI-USER: You'd see team features here if you had team members
                </p>
              </div>
            </MultiUserGate>

            <div className="mt-4">
              <TeamFeatureGate
                fallback={
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">
                      👤 Team management hidden (single-user or insufficient role)
                    </p>
                  </div>
                }
              >
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-medium text-purple-800">
                    ⚙️ Team management features would appear here
                  </p>
                </div>
              </TeamFeatureGate>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Testing */}
      <Card>
        <CardHeader>
          <CardTitle>API Permission Testing</CardTitle>
          <CardDescription>Test actual API endpoints with permission checks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => testApiCall('/api/team/members')}
            >
              Test Team Members
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => testApiCall('/api/dashboard/stats')}
            >
              Test Dashboard Stats
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => testApiCall('/api/receipts/fake-id')}
            >
              Test Receipt View
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => testApiCall('/api/user/context')}
            >
              Test User Context
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => testApiCall('/api/team/context')}
            >
              Test Team Context
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearResults}
            >
              Clear Results
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <h4 className="font-medium">API Test Results</h4>
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 text-xs border rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant={result.allowed ? "default" : "destructive"} size="sm">
                      {result.status}
                    </Badge>
                    <code className="font-mono">{result.method} {result.endpoint}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{result.timestamp}</span>
                    {result.error && (
                      <span className="text-red-600 truncate max-w-32" title={result.error}>
                        {result.error}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}