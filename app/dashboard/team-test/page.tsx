"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, UserPlus, UserMinus, TestTube, RefreshCw } from 'lucide-react';
import { useTeamContext } from '@/hooks/use-team-context';

interface TeamMember {
  id: string;
  user?: {
    id: string;
    email: string;
    full_name: string;
  };
  role: string;
  invitation_status: string;
  invited_email?: string;
  invited_at?: string;
}

export default function TeamTestPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const teamContext = useTeamContext(true); // Enable test mode for team-test page

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/team/members');
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const addTestUser = async () => {
    if (!testEmail.trim()) {
      showMessage('error', 'Please enter an email address');
      return;
    }

    setActionLoading('add');
    try {
      console.log('Sending request to add user:', testEmail);
      const response = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail.trim(),
          role: 'member'
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        showMessage('success', `Test invitation sent to ${testEmail}`);
        setTestEmail('');
        await fetchMembers();
        // Refresh team context
        window.location.reload();
      } else {
        showMessage('error', data.error || 'Failed to add test user');
        console.error('API Error:', data);
      }
    } catch (error) {
      console.error('Network error:', error);
      showMessage('error', 'Error adding test user');
    } finally {
      setActionLoading(null);
    }
  };

  const addAcceptedTestUser = async () => {
    if (!testEmail.trim()) {
      showMessage('error', 'Please enter an email address');
      return;
    }

    setActionLoading('add-accepted');
    try {
      const response = await fetch('/api/team/test-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail.trim(),
          role: 'member'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        showMessage('success', `✓ ${testEmail} added as accepted member`);
        setTestEmail('');
        await fetchMembers();
        // Refresh team context
        window.location.reload();
      } else {
        showMessage('error', data.error || 'Failed to add accepted test user');
      }
    } catch (error) {
      showMessage('error', 'Error adding accepted test user');
    } finally {
      setActionLoading(null);
    }
  };

  const acceptInvitation = async (memberId: string, email: string) => {
    setActionLoading(memberId);
    try {
      // Simulate accepting the invitation by updating the status
      const response = await fetch(`/api/team/members/${memberId}/accept-test`, {
        method: 'POST'
      });

      if (response.ok) {
        showMessage('success', `${email} invitation accepted (test)`);
        await fetchMembers();
        // Refresh team context
        window.location.reload();
      } else {
        const data = await response.json();
        showMessage('error', data.error || 'Failed to accept invitation');
      }
    } catch (error) {
      showMessage('error', 'Error accepting invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const removeUser = async (memberId: string, email: string) => {
    setActionLoading(memberId);
    try {
      const response = await fetch(`/api/team/members/${memberId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showMessage('success', `Removed ${email}`);
        await fetchMembers();
        // Refresh team context
        window.location.reload();
      } else {
        const data = await response.json();
        showMessage('error', data.error || 'Failed to remove user');
      }
    } catch (error) {
      showMessage('error', 'Error removing user');
    } finally {
      setActionLoading(null);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await fetchMembers();
    window.location.reload(); // Refresh team context
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <TestTube className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">Team Testing Lab</h1>
          <p className="text-muted-foreground">Add/remove test users to test multi-user features</p>
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Current Team Context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Team Context
          </CardTitle>
          <CardDescription>Real-time team detection status</CardDescription>
        </CardHeader>
        <CardContent>
          {teamContext.loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading team context...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm font-medium">Tenant Type</p>
                <Badge variant={teamContext.isMultiUser ? "default" : "secondary"} className="mt-1">
                  {teamContext.isMultiUser ? "Multi-User" : "Single-User"}
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Member Count</p>
                <Badge variant="outline" className="mt-1">
                  {teamContext.memberCount}
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Show Team Features</p>
                <Badge variant={teamContext.showTeamFeatures ? "default" : "secondary"} className="mt-1">
                  {teamContext.showTeamFeatures ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Sidebar Team Section</p>
                <Badge variant={teamContext.showTeamFeatures ? "default" : "secondary"} className="mt-1">
                  {teamContext.showTeamFeatures ? "Visible" : "Hidden"}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Test User */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Test User
          </CardTitle>
          <CardDescription>Add a test user to switch to multi-user mode</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTestUser()}
              className="flex-1"
            />
            <Button 
              onClick={addTestUser}
              disabled={actionLoading === 'add'}
              variant="outline"
            >
              {actionLoading === 'add' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Pending
                </>
              )}
            </Button>
            <Button 
              onClick={addAcceptedTestUser}
              disabled={actionLoading === 'add-accepted'}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === 'add-accepted' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  ✓ Add Accepted
                </>
              )}
            </Button>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">💡 Testing Tips:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>"Add Pending":</strong> Creates pending user - counts in test mode for immediate multi-user testing</li>
              <li>• <strong>"✓ Add Accepted":</strong> Creates fake user and accepts immediately</li>
              <li>• <strong>Test Mode:</strong> This page counts pending users for multi-user detection</li>
              <li>• <strong>Production:</strong> Only accepted members count toward multi-user mode</li>
              <li>• Use any email (real or fake) - no actual emails sent</li>
            </ul>
          </div>
          
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-2">🏢 Enterprise Plan Info:</h4>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• <strong>Default Limit:</strong> 5 team members</li>
              <li>• <strong>Upgrades:</strong> Customer service can increase limits as needed</li>
              <li>• <strong>Free/Pro Plans:</strong> Single-user only, no team features</li>
              <li>• <strong>Team Features:</strong> Only available for Enterprise customers</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Current Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Team Members
            </CardTitle>
            <CardDescription>All members and pending invitations</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading members...
            </div>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No team members yet</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => {
                const email = member.user?.email || member.invited_email || 'Unknown';
                const name = member.user?.full_name || email.split('@')[0];
                
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-sm text-muted-foreground">{email}</p>
                      </div>
                      <Badge variant="outline">{member.role}</Badge>
                      <Badge 
                        variant={member.invitation_status === 'accepted' ? 'default' : 'secondary'}
                      >
                        {member.invitation_status}
                      </Badge>
                    </div>
                    
                    {member.role !== 'owner' && (
                      <div className="flex gap-2">
                        {member.invitation_status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => acceptInvitation(member.id, email)}
                            disabled={actionLoading === member.id}
                            className="text-green-600 hover:text-green-700 hover:border-green-300"
                          >
                            {actionLoading === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                ✓ Test Accept
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeUser(member.id, email)}
                          disabled={actionLoading === member.id}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          {actionLoading === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserMinus className="h-4 w-4 mr-1" />
                              Remove
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Testing Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-green-800">Test Multi-User Mode:</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside text-green-700">
                <li>Enter an email and click "Add Pending" - instantly switches to multi-user mode</li>
                <li>Check "Current Team Context" switches to Multi-User</li>
                <li>Go to main dashboard - Team section appears in sidebar</li>
                <li>Visit /dashboard/permissions-test - see multi-user features</li>
                <li>Try receipts/dashboard for filtering options (coming next)</li>
              </ol>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-blue-800">Test Single-User Mode:</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside text-blue-700">
                <li>Remove all test users (keep only owner)</li>
                <li>Check "Current Team Context" shows Single-User</li>
                <li>Go to main dashboard - Team section hidden in sidebar</li>
                <li>Visit /dashboard/permissions-test - see single-user mode</li>
                <li>UI should be clean without team features</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}