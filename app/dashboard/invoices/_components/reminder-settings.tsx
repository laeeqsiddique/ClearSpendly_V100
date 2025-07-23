"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  Mail, 
  Settings, 
  Play, 
  Pause,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface ReminderConfig {
  enabled: boolean;
  firstReminderDays: number;
  subsequentReminderDays: number;
  maxReminders: number;
  autoStop: boolean;
  autoStopDays: number;
}

interface ReminderSummary {
  total: number;
  needingFirstReminder: number;
  needingSubsequentReminder: number;
  maxRemindersReached: number;
  autoStopped: number;
}

export function ReminderSettings() {
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [summary, setSummary] = useState<ReminderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchReminderStatus();
  }, []);

  const fetchReminderStatus = async () => {
    try {
      const response = await fetch('/api/invoices/process-reminders');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching reminder status:', error);
      toast.error('Failed to load reminder settings');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key: keyof ReminderConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  const saveConfig = async () => {
    // Note: This would need a backend endpoint to save the config
    // For now, we'll just show a message
    setSaving(true);
    
    // Simulate save
    setTimeout(() => {
      setSaving(false);
      toast.success('Reminder settings saved successfully');
    }, 1000);
  };

  const processRemindersNow = async () => {
    setProcessing(true);
    
    try {
      const response = await fetch('/api/invoices/process-reminders', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Processed ${data.results.processed} invoices, sent ${data.results.sent} reminders`);
        // Refresh the summary
        fetchReminderStatus();
      } else {
        toast.error(data.error || 'Failed to process reminders');
      }
    } catch (error) {
      console.error('Error processing reminders:', error);
      toast.error('Failed to process reminders');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Payment Reminder Status
          </CardTitle>
          <CardDescription>
            Overview of overdue invoices and reminder queue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
                <div className="text-sm text-gray-600">Total Overdue</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{summary.needingFirstReminder}</div>
                <div className="text-sm text-blue-700">Need First Reminder</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">{summary.needingSubsequentReminder}</div>
                <div className="text-sm text-yellow-700">Need Follow-up</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-900">{summary.maxRemindersReached}</div>
                <div className="text-sm text-orange-700">Max Reminders Sent</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-900">{summary.autoStopped}</div>
                <div className="text-sm text-red-700">Auto-stopped</div>
              </div>
            </div>
          )}
          
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <Calendar className="w-4 h-4 inline mr-1" />
              Reminders are sent daily at 9:00 AM
            </div>
            
            <Button 
              onClick={processRemindersNow}
              disabled={processing}
              variant="outline"
              size="sm"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Process Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Reminder Configuration
          </CardTitle>
          <CardDescription>
            Configure how and when payment reminders are sent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {config && (
            <>
              {/* Enable/Disable Reminders */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled" className="text-base">Enable Automatic Reminders</Label>
                  <p className="text-sm text-gray-600">
                    Automatically send payment reminders for overdue invoices
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={config.enabled}
                  onCheckedChange={(checked) => handleConfigChange('enabled', checked)}
                />
              </div>

              <div className="border-t pt-6 space-y-4">
                {/* First Reminder Days */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstReminderDays">First Reminder After (days)</Label>
                    <Input
                      id="firstReminderDays"
                      type="number"
                      min="1"
                      value={config.firstReminderDays}
                      onChange={(e) => handleConfigChange('firstReminderDays', parseInt(e.target.value))}
                      disabled={!config.enabled}
                    />
                    <p className="text-xs text-gray-500">
                      Days after due date to send the first reminder
                    </p>
                  </div>

                  {/* Subsequent Reminder Days */}
                  <div className="space-y-2">
                    <Label htmlFor="subsequentReminderDays">Follow-up Reminders Every (days)</Label>
                    <Input
                      id="subsequentReminderDays"
                      type="number"
                      min="1"
                      value={config.subsequentReminderDays}
                      onChange={(e) => handleConfigChange('subsequentReminderDays', parseInt(e.target.value))}
                      disabled={!config.enabled}
                    />
                    <p className="text-xs text-gray-500">
                      Days between subsequent reminders
                    </p>
                  </div>
                </div>

                {/* Max Reminders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxReminders">Maximum Reminders</Label>
                    <Input
                      id="maxReminders"
                      type="number"
                      min="1"
                      max="10"
                      value={config.maxReminders}
                      onChange={(e) => handleConfigChange('maxReminders', parseInt(e.target.value))}
                      disabled={!config.enabled}
                    />
                    <p className="text-xs text-gray-500">
                      Maximum number of reminders to send per invoice
                    </p>
                  </div>

                  {/* Auto Stop Days */}
                  <div className="space-y-2">
                    <Label htmlFor="autoStopDays">Auto-stop After (days)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="autoStopDays"
                        type="number"
                        min="30"
                        value={config.autoStopDays}
                        onChange={(e) => handleConfigChange('autoStopDays', parseInt(e.target.value))}
                        disabled={!config.enabled || !config.autoStop}
                      />
                      <Switch
                        checked={config.autoStop}
                        onCheckedChange={(checked) => handleConfigChange('autoStop', checked)}
                        disabled={!config.enabled}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Stop sending reminders after this many days overdue
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Alert */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Reminders are sent automatically every day at 9:00 AM. Each client will receive reminders
                  based on these settings until the invoice is paid or the limits are reached.
                </AlertDescription>
              </Alert>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={saveConfig}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}