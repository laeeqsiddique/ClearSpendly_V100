"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Webhook,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Play,
  Eye,
  AlertCircle,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { WebhookEvent } from '@/lib/types/subscription';

interface WebhookTestingProps {
  webhookEvents: WebhookEvent[];
  onRefresh: () => void;
}

export function WebhookTesting({ webhookEvents, onRefresh }: WebhookTestingProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [reprocessing, setReprocessing] = useState<string | null>(null);

  const filteredEvents = webhookEvents.filter(event =>
    event.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReprocessWebhook = async (eventId: string) => {
    try {
      setReprocessing(eventId);
      
      const response = await fetch(`/api/admin/webhooks/${eventId}/reprocess`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Webhook reprocessed successfully!');
        onRefresh();
      } else {
        toast.error('Failed to reprocess webhook');
      }
    } catch (error) {
      console.error('Error reprocessing webhook:', error);
      toast.error('Failed to reprocess webhook');
    } finally {
      setReprocessing(null);
    }
  };

  const handleTriggerWebhook = async (eventType: string) => {
    try {
      const response = await fetch('/api/admin/testing/trigger-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Webhook ${eventType} triggered successfully!`);
        onRefresh();
      } else {
        toast.error('Failed to trigger webhook');
      }
    } catch (error) {
      console.error('Error triggering webhook:', error);
      toast.error('Failed to trigger webhook');
    }
  };

  const getStatusIcon = (event: WebhookEvent) => {
    if (reprocessing === event.id) {
      return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
    }
    
    if (event.processed) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    
    if (event.error) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusColor = (event: WebhookEvent) => {
    if (reprocessing === event.id) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    
    if (event.processed) {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    
    if (event.error) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  };

  const getStatusText = (event: WebhookEvent) => {
    if (reprocessing === event.id) return 'Reprocessing';
    if (event.processed) return 'Processed';
    if (event.error) return 'Failed';
    return 'Pending';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const commonWebhookTypes = [
    'customer.subscription.created',
    'customer.subscription.updated', 
    'customer.subscription.deleted',
    'customer.subscription.trial_will_end',
    'invoice.created',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'invoice.payment_action_required',
    'customer.created',
    'customer.updated',
    'payment_method.attached'
  ];

  return (
    <div className="space-y-6">
      {/* Webhook Event Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Trigger Test Webhooks
          </CardTitle>
          <CardDescription>
            Manually trigger webhook events for testing purposes
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {commonWebhookTypes.map((eventType) => (
              <Button
                key={eventType}
                variant="outline"
                size="sm"
                onClick={() => handleTriggerWebhook(eventType)}
                className="justify-start text-xs"
              >
                <Webhook className="h-3 w-3 mr-2" />
                {eventType}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Events Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Events Log
              </CardTitle>
              <CardDescription>
                Monitor and manage webhook event processing
              </CardDescription>
            </div>
            
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search webhook events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Events Table */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No webhook events</h3>
              <p className="text-muted-foreground">
                Webhook events will appear here when they are received
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{event.type}</div>
                          <div className="text-xs text-muted-foreground">
                            {event.id.substring(0, 12)}...
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getStatusColor(event)}>
                          {getStatusIcon(event)}
                          <span className="ml-1">{getStatusText(event)}</span>
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">{formatDate(event.created_at)}</div>
                      </TableCell>
                      
                      <TableCell>
                        {event.processed_at ? (
                          <div className="text-sm">{formatDate(event.processed_at)}</div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {event.error ? (
                          <div className="max-w-xs">
                            <p className="text-xs text-red-600 truncate">
                              {event.error}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedEvent(event)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Webhook Event Details</DialogTitle>
                                <DialogDescription>
                                  {event.type} - {event.id}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <h4 className="font-medium mb-2">Status</h4>
                                    <Badge className={getStatusColor(event)}>
                                      {getStatusIcon(event)}
                                      <span className="ml-1">{getStatusText(event)}</span>
                                    </Badge>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-medium mb-2">Created</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDate(event.created_at)}
                                    </p>
                                  </div>
                                  
                                  {event.processed_at && (
                                    <div>
                                      <h4 className="font-medium mb-2">Processed</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {formatDate(event.processed_at)}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {event.error && (
                                    <div>
                                      <h4 className="font-medium mb-2">Error</h4>
                                      <p className="text-sm text-red-600">{event.error}</p>
                                    </div>
                                  )}
                                </div>
                                
                                <div>
                                  <h4 className="font-medium mb-2">Event Data</h4>
                                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                                    {JSON.stringify(event.data, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {!event.processed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReprocessWebhook(event.id)}
                              disabled={reprocessing === event.id}
                            >
                              <RefreshCw className={`h-4 w-4 ${reprocessing === event.id ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Processing Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {webhookEvents.filter(e => e.processed).length}
                </div>
                <p className="text-xs text-muted-foreground">Processed Successfully</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold">
                  {webhookEvents.filter(e => e.error).length}
                </div>
                <p className="text-xs text-muted-foreground">Failed Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">
                  {webhookEvents.filter(e => !e.processed && !e.error).length}
                </div>
                <p className="text-xs text-muted-foreground">Pending Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}