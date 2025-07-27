"use client";

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Brain, Check, X, AlertCircle } from 'lucide-react';

interface AIStatus {
  enabled: boolean;
  status: string;
  modelLoaded?: boolean;
  responseTime?: number;
  model?: string;
  error?: string;
}

export function AIStatusDebug() {
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const response = await fetch('/api/test-ai-ocr');
        if (response.ok) {
          const data = await response.json();
          setAIStatus(data.aiStatus || { 
            enabled: data.aiEnabled || false, 
            status: data.status || 'unknown' 
          });
        } else {
          console.error('AI status check failed:', response.status);
          setAIStatus({ enabled: false, status: 'api-error' });
        }
      } catch (error) {
        console.error('AI status check error:', error);
        setAIStatus({ enabled: false, status: 'connection-error', error: String(error) });
      } finally {
        setLoading(false);
      }
    };

    checkAIStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
        <Brain className="w-4 h-4 animate-spin" />
        <span className="text-sm">Checking AI status...</span>
      </div>
    );
  }

  if (!aiStatus) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50">
        <X className="w-4 h-4 text-red-600" />
        <span className="text-sm text-red-600">AI status unknown</span>
      </div>
    );
  }

  const isHealthy = aiStatus.enabled && aiStatus.status === 'healthy';

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${
      isHealthy ? 'bg-green-50' : 'bg-yellow-50'
    }`}>
      {isHealthy ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <AlertCircle className="w-4 h-4 text-yellow-600" />
      )}
      
      <div className="flex items-center gap-2">
        <span className="text-sm">
          AI Enhancement: 
        </span>
        <Badge variant={isHealthy ? "default" : "secondary"}>
          {aiStatus.enabled ? (
            aiStatus.status === 'healthy' ? 
              `Active (${aiStatus.model || 'llama3.2:3b'})` : 
              `${aiStatus.status}`
          ) : (
            'Disabled'
          )}
        </Badge>
        
        {aiStatus.responseTime && (
          <span className="text-xs text-gray-500">
            ({aiStatus.responseTime}ms)
          </span>
        )}
      </div>
    </div>
  );
}