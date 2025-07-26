"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function SetupTenantPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const router = useRouter();

  const handleSetup = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/setup-tenant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message });
        // Redirect to team page after 2 seconds
        setTimeout(() => {
          router.push("/dashboard/team");
        }, 2000);
      } else {
        setResult({ error: data.error });
      }
    } catch (error) {
      setResult({ error: "Failed to setup tenant. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup Your Tenant</CardTitle>
          <CardDescription>
            This will create the necessary database records for team management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>This setup will:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Create your user record</li>
              <li>Create a tenant for your company</li>
              <li>Set you as the owner of the tenant</li>
            </ul>
          </div>

          {result && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                result.success
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="text-sm">{result.message || result.error}</span>
            </div>
          )}

          <Button
            onClick={handleSetup}
            disabled={loading || result?.success}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : result?.success ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Setup Complete!
              </>
            ) : (
              "Run Setup"
            )}
          </Button>

          {result?.success && (
            <p className="text-sm text-center text-muted-foreground">
              Redirecting to team management...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}