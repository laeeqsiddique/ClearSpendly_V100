import { getCurrentUserContext } from "@/lib/user-context";

export default async function TeamTestPage() {
  const userContext = await getCurrentUserContext();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Team Test Page (Outside Dashboard Layout)</h1>
        
        {userContext ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-green-600">✅ Authentication Successful</h2>
            <div className="space-y-2">
              <p><strong>User ID:</strong> {userContext.userId}</p>
              <p><strong>Email:</strong> {userContext.user.email}</p>
              <p><strong>Role:</strong> {userContext.role}</p>
              <p><strong>Tenant ID:</strong> {userContext.tenantId}</p>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
              <p className="font-semibold">Authorization Status:</p>
              {['owner', 'admin'].includes(userContext.role) ? (
                <p className="text-green-600">✅ You have access to team management</p>
              ) : (
                <p className="text-red-600">❌ You don't have access to team management (need owner/admin role)</p>
              )}
            </div>
            
            <div className="mt-6">
              <a href="/dashboard/team" className="text-blue-600 hover:underline">
                Go to Dashboard Team Page →
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
            <p className="text-red-600">❌ No user context found</p>
          </div>
        )}
      </div>
    </div>
  );
}