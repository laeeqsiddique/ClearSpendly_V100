'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function CleanupPage() {
  const [email, setEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const handleCleanup = async () => {
    if (!email || !adminPassword) {
      setError('Email and password are required');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ WARNING: This will permanently delete ALL data for ${email}:\n\n` +
      `• User account\n` +
      `• All tenants owned by user\n` +
      `• All receipts and invoices\n` +
      `• All subscriptions\n` +
      `• Polar customer data\n\n` +
      `This action CANNOT be undone. Continue?`
    );

    if (!confirmed) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, adminPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Cleanup failed');
      }

      setResults(data.results);
      if (data.success) {
        setEmail(''); // Clear email after successful cleanup
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Admin Cleanup Tool
          </CardTitle>
          <CardDescription className="text-red-700">
            Completely remove a test user and all their data. Use with extreme caution!
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                User Email to Delete
              </label>
              <Input
                type="email"
                placeholder="test.user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="font-mono"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Admin Password
              </label>
              <Input
                type="password"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Set ADMIN_CLEANUP_PASSWORD env variable (default: admin123cleanup)
              </p>
            </div>

            <Button
              onClick={handleCleanup}
              disabled={loading || !email || !adminPassword}
              variant="destructive"
              className="w-full"
            >
              {loading ? (
                'Processing cleanup...'
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User & All Data
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <div className="mt-4 space-y-3">
              <Alert variant={results.errors?.length > 0 ? "destructive" : "default"}>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Cleanup Results</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      {results.userFound ? '✅' : '❌'} User found: {results.email}
                    </div>
                    <div className="flex items-center gap-2">
                      {results.tenantDeleted ? '✅' : '⚠️'} Tenant data deleted
                    </div>
                    <div className="flex items-center gap-2">
                      {results.polarCustomerDeleted ? '✅' : '⚠️'} Polar customer processed
                    </div>
                    <div className="flex items-center gap-2">
                      {results.authUserDeleted ? '✅' : '⚠️'} Auth user deleted
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {results.errors?.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Issues Encountered</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 text-sm list-disc list-inside">
                      {results.errors.map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Alert className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important Notes</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                <li>This tool is for development/testing only</li>
                <li>Deletes ALL data associated with the user</li>
                <li>Cancels Polar subscriptions but may not delete customer</li>
                <li>Some auth deletions may require manual Supabase Dashboard action</li>
                <li>Use servalingcaller@gmail.com for testing</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}