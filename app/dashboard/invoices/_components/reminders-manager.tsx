"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  Send, 
  AlertTriangle,
  CheckCircle2,
  Settings,
  Loader2,
  Mail,
  Calendar,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";

interface RemindersSummary {
  total: number;
  needingFirstReminder: number;
  needingSubsequentReminder: number;
  maxRemindersReached: number;
  autoStopped: number;
}

interface ReminderConfig {
  enabled: boolean;
  firstReminderDays: number;
  subsequentReminderDays: number;
  maxReminders: number;
  autoStop: boolean;
  autoStopDays: number;
}

interface RemindersManagerProps {
  refreshTrigger?: number;
}

export function RemindersManager({ refreshTrigger }: RemindersManagerProps) {
  const [summary, setSummary] = useState<RemindersSummary | null>(null);
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastProcessed, setLastProcessed] = useState<string | null>(null);

  useEffect(() => {
    fetchReminderData();
  }, [refreshTrigger]);

  const fetchReminderData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/invoices/reminders', {
        method: 'GET',
      });

      const result = await response.json();

      if (response.ok) {
        setSummary(result.summary);
        setConfig(result.config);
      } else {
        throw new Error(result.error || 'Failed to fetch reminder data');
      }
    } catch (error) {
      console.error('Error fetching reminder data:', error);
      toast.error('Failed to load reminder information');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReminders = async () => {
    try {
      setProcessing(true);

      const response = await fetch('/api/invoices/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process_all'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        setLastProcessed(new Date().toLocaleString());
        await fetchReminderData(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to process reminders');
      }
    } catch (error) {
      console.error('Error processing reminders:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process reminders');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading reminder information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary || !config) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Failed to load reminder information
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalNeedingReminders = summary.needingFirstReminder + summary.needingSubsequentReminder;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payment Reminders</h3>
          <p className="text-sm text-muted-foreground">
            Automated reminder system for overdue invoices
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReminderData}
            disabled={loading}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            onClick={handleProcessReminders}
            disabled={processing || totalNeedingReminders === 0}
            size="sm"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Reminders ({totalNeedingReminders})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Overdue</p>
                <p className="text-2xl font-bold text-red-600">{summary.total}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">First Reminders</p>
                <p className="text-2xl font-bold text-orange-600">{summary.needingFirstReminder}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Follow-ups</p>
                <p className="text-2xl font-bold text-blue-600">{summary.needingSubsequentReminder}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Max Reached</p>
                <p className="text-2xl font-bold text-gray-600">{summary.maxRemindersReached}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Reminder Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={config.enabled ? "default" : "secondary"}>
                  {config.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">First reminder</span>
                <span className="text-sm font-medium">
                  {config.firstReminderDays} days after due date
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Follow-up frequency</span>
                <span className="text-sm font-medium">
                  Every {config.subsequentReminderDays} days
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Maximum reminders</span>
                <span className="text-sm font-medium">{config.maxReminders}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Auto-stop</span>
                <Badge variant={config.autoStop ? "default" : "secondary"}>
                  {config.autoStop ? `After ${config.autoStopDays} days` : "Disabled"}
                </Badge>
              </div>
              
              {lastProcessed && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last processed</span>
                  <span className="text-sm font-medium">{lastProcessed}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Alerts */}
      {totalNeedingReminders > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{totalNeedingReminders} invoices</strong> are ready for payment reminders. 
            Click "Send Reminders" to process them automatically.
          </AlertDescription>
        </Alert>
      )}

      {summary.total === 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Great! You have no overdue invoices requiring reminders.
          </AlertDescription>
        </Alert>
      )}

      {summary.autoStopped > 0 && (
        <Alert className="border-gray-200 bg-gray-50">
          <AlertTriangle className="w-4 h-4 text-gray-600" />
          <AlertDescription className="text-gray-800">
            <strong>{summary.autoStopped} invoices</strong> have been auto-stopped from reminders 
            due to age (over {config.autoStopDays} days overdue).
          </AlertDescription>
        </Alert>
      )}

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Payment Reminders Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 mt-0.5 text-blue-600" />
              <div>
                <strong>Automatic Scheduling:</strong> First reminders are sent {config.firstReminderDays} days after the due date, 
                with follow-ups every {config.subsequentReminderDays} days.
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 mt-0.5 text-green-600" />
              <div>
                <strong>Professional Emails:</strong> Reminders are sent using professional email templates 
                with your branding and include payment links when available.
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Settings className="w-4 h-4 mt-0.5 text-purple-600" />
              <div>
                <strong>Smart Limits:</strong> Maximum of {config.maxReminders} reminders per invoice, 
                with automatic stopping after {config.autoStopDays} days to avoid over-communication.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}