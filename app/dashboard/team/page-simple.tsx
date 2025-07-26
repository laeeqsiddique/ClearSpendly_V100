import { getCurrentUserContext } from "@/lib/user-context";
import { redirect } from "next/navigation";

export default async function TeamPageSimple() {
  const userContext = await getCurrentUserContext();
  
  if (!userContext) {
    redirect("/sign-in");
  }

  if (!['owner', 'admin'].includes(userContext.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Team Management</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <p>User: {userContext.user.email}</p>
          <p>Role: {userContext.role}</p>
          <p>Tenant: {userContext.tenantId}</p>
          <p className="mt-4 text-green-600">You are authorized to view this page!</p>
        </div>
      </div>
    </div>
  );
}