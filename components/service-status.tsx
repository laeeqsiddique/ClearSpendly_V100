"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  lastChecked: Date;
  responseTime?: number;
}

interface ServiceStatusProps {
  showDetails?: boolean;
  compact?: boolean;
  onClose?: () => void;
}

export function ServiceStatusIndicator({ showDetails = false, compact = false, onClose }: ServiceStatusProps) {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Authentication', status: 'operational', lastChecked: new Date() },
    { name: 'Database', status: 'operational', lastChecked: new Date() },
    { name: 'File Storage', status: 'operational', lastChecked: new Date() },
  ]);
  const [isChecking, setIsChecking] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'operational' | 'degraded' | 'outage'>('operational');

  const checkServiceHealth = async () => {
    setIsChecking(true);
    const supabase = createClient();
    const startTime = Date.now();

    try {
      // Test authentication service
      const authStart = Date.now();
      const { error: authError } = await supabase.auth.getSession();
      const authTime = Date.now() - authStart;
      
      // Test database connectivity
      const dbStart = Date.now();
      const { error: dbError } = await supabase.from('membership').select('id').limit(1);
      const dbTime = Date.now() - dbStart;

      // Test storage service
      const storageStart = Date.now();
      const { error: storageError } = supabase.storage.from('test').getPublicUrl('test');
      const storageTime = Date.now() - storageStart;

      const now = new Date();
      const newServices: ServiceStatus[] = [
        {
          name: 'Authentication',
          status: authError?.code === 'MOCK_CLIENT_ERROR' ? 'maintenance' : 
                  authError ? 'degraded' : 'operational',
          lastChecked: now,
          responseTime: authTime
        },
        {
          name: 'Database',
          status: dbError?.code === 'MOCK_CLIENT_ERROR' ? 'maintenance' :
                  dbError ? 'degraded' : 'operational',
          lastChecked: now,
          responseTime: dbTime
        },
        {
          name: 'File Storage',
          status: storageError?.code === 'MOCK_CLIENT_ERROR' ? 'maintenance' :
                  'operational', // Storage check is basic, assume operational if no error
          lastChecked: now,
          responseTime: storageTime
        }
      ];

      setServices(newServices);

      // Determine overall status
      const hasOutage = newServices.some(s => s.status === 'outage');
      const hasDegraded = newServices.some(s => s.status === 'degraded' || s.status === 'maintenance');
      
      if (hasOutage) {
        setOverallStatus('outage');
      } else if (hasDegraded) {
        setOverallStatus('degraded');
      } else {
        setOverallStatus('operational');
      }

    } catch (error) {
      console.error('Service health check failed:', error);
      setOverallStatus('outage');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkServiceHealth();
    
    // Check service health every 5 minutes
    const interval = setInterval(checkServiceHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'outage': return 'bg-red-500';
      case 'maintenance': return 'bg-blue-500';
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'outage': return <X className="h-4 w-4 text-red-600" />;
      case 'maintenance': return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusText = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational': return 'Operational';
      case 'degraded': return 'Degraded';
      case 'outage': return 'Outage';
      case 'maintenance': return 'Maintenance';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor(overallStatus)}`} />
        <span className="text-xs text-muted-foreground">
          System {getStatusText(overallStatus).toLowerCase()}
        </span>
      </div>
    );
  }

  if (!showDetails) {
    return (
      <Badge 
        variant={overallStatus === 'operational' ? 'default' : 'destructive'}
        className="flex items-center gap-1"
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor(overallStatus)}`} />
        {getStatusText(overallStatus)}
      </Badge>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
          <Badge variant={overallStatus === 'operational' ? 'default' : 'destructive'}>
            {getStatusText(overallStatus)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={checkServiceHealth}
            disabled={isChecking}
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {services.map((service) => (
          <div key={service.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(service.status)}
              <span className="text-sm font-medium">{service.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {service.responseTime && (
                <span className="text-xs text-muted-foreground">
                  {service.responseTime}ms
                </span>
              )}
              <Badge 
                variant={service.status === 'operational' ? 'secondary' : 'outline'}
                className="text-xs"
              >
                {getStatusText(service.status)}
              </Badge>
            </div>
          </div>
        ))}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Last checked: {services[0]?.lastChecked.toLocaleTimeString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for monitoring service status
export function useServiceStatus() {
  const [status, setStatus] = useState<'operational' | 'degraded' | 'outage'>('operational');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkStatus = async () => {
    const supabase = createClient();
    
    try {
      const [authResult, dbResult] = await Promise.allSettled([
        supabase.auth.getSession(),
        supabase.from('membership').select('id').limit(1)
      ]);

      const authOk = authResult.status === 'fulfilled' && 
        (!authResult.value.error || authResult.value.error.code === 'MOCK_CLIENT_ERROR');
      const dbOk = dbResult.status === 'fulfilled' && 
        (!dbResult.value.error || dbResult.value.error.code === 'MOCK_CLIENT_ERROR');

      if (authOk && dbOk) {
        setStatus('operational');
      } else if (authOk || dbOk) {
        setStatus('degraded');
      } else {
        setStatus('outage');
      }
      
      setLastCheck(new Date());
    } catch (error) {
      setStatus('outage');
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 2 * 60 * 1000); // Check every 2 minutes
    return () => clearInterval(interval);
  }, []);

  return { status, lastCheck, checkStatus };
}