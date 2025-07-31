"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AIStatusDebug() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    // Check what's available in the browser
    const browserStatus = {
      environment: {
        hasNextPublicOpenAI: !!process.env.NEXT_PUBLIC_OPENAI_API_KEY,
        nextPublicKeyPrefix: process.env.NEXT_PUBLIC_OPENAI_API_KEY?.substring(0, 8) || 'not available',
        hasEnableFlag: process.env.NEXT_PUBLIC_ENABLE_AI_ENHANCEMENT === 'true',
        enableFlagValue: process.env.NEXT_PUBLIC_ENABLE_AI_ENHANCEMENT || 'not set',
      },
      processor: {
        canImport: false,
        error: null,
      },
      timestamp: new Date().toISOString(),
    };

    // Try to import and instantiate the processor
    import('@/lib/ai-ocr/enhanced-processor')
      .then(module => {
        const { SimplifiedOCRProcessor } = module;
        const processor = new SimplifiedOCRProcessor();
        browserStatus.processor.canImport = true;
        setStatus({...browserStatus});
      })
      .catch(error => {
        browserStatus.processor.error = error.message;
        setStatus({...browserStatus});
      });
  }, []);

  if (!status) {
    return <div>Loading AI status...</div>;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">🤖 AI Enhancement Debug Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-xs">
          <div>
            <strong>OpenAI Key Available:</strong> 
            <span className={status.environment.hasNextPublicOpenAI ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
              {status.environment.hasNextPublicOpenAI ? "✅ Yes" : "❌ No"}
            </span>
            {status.environment.hasNextPublicOpenAI && (
              <span className="text-gray-500 ml-2">
                ({status.environment.nextPublicKeyPrefix}...)
              </span>
            )}
          </div>
          
          <div>
            <strong>AI Enhancement Enabled:</strong>
            <span className={status.environment.hasEnableFlag ? "text-green-600 ml-1" : "text-yellow-600 ml-1"}>
              {status.environment.hasEnableFlag ? "✅ Yes" : "⚠️ Auto-detect"}
            </span>
            <span className="text-gray-500 ml-2">
              ({status.environment.enableFlagValue})
            </span>
          </div>
          
          <div>
            <strong>Processor Import:</strong>
            <span className={status.processor.canImport ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
              {status.processor.canImport ? "✅ Success" : "❌ Failed"}
            </span>
            {status.processor.error && (
              <div className="text-red-600 text-xs mt-1 ml-4">
                Error: {status.processor.error}
              </div>
            )}
          </div>
        </div>
        
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-gray-500">Raw Data</summary>
          <pre className="text-xs mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
            {JSON.stringify(status, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}