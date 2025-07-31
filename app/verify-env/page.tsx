"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyEnv() {
  const [envStatus, setEnvStatus] = useState<any>(null);

  useEffect(() => {
    // Check environment variables on client side
    const status = {
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET",
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      app: {
        url: process.env.NEXT_PUBLIC_APP_URL || "NOT SET",
        nodeEnv: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString(),
    };
    
    setEnvStatus(status);
  }, []);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Environment Variable Check</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
            {JSON.stringify(envStatus, null, 2)}
          </pre>
          
          <div className="mt-4 space-y-2">
            <h3 className="font-semibold">Status:</h3>
            {envStatus?.supabase?.hasUrl && envStatus?.supabase?.hasKey ? (
              <p className="text-green-600">✅ Supabase is configured</p>
            ) : (
              <p className="text-red-600">❌ Supabase is NOT configured</p>
            )}
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <p className="text-sm">
              <strong>Important:</strong> Environment variables must be set in Railway dashboard, not in .env files.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}