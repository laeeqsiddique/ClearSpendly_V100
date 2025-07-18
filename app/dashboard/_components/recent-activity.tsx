"use client";

import { useState, useEffect } from "react";
import { format, isToday, isYesterday, subDays } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  IconReceipt,
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconEye,
  IconBrain,
  IconTrendingUp,
  IconCurrencyDollar,
  IconCalendar,
  IconFileText,
  IconBuilding
} from "@tabler/icons-react";

interface ReceiptActivity {
  id: string;
  type: 'upload' | 'processed' | 'reviewed' | 'categorized' | 'alert' | 'insight';
  title: string;
  description: string;
  timestamp: Date;
  amount?: number;
  vendor?: string;
  category?: string;
  status: 'completed' | 'pending' | 'failed';
  metadata?: {
    confidence?: number;
    processingTime?: number;
    ocrMethod?: 'browser' | 'ai';
    alertType?: 'price_increase' | 'duplicate' | 'unusual_amount';
  };
}

const mockActivities: ReceiptActivity[] = [
  {
    id: '1',
    type: 'upload',
    title: 'New receipt uploaded',
    description: 'Starbucks coffee receipt processed via browser OCR',
    timestamp: new Date(),
    amount: 12.45,
    vendor: 'Starbucks',
    category: 'Meals & Entertainment',
    status: 'completed',
    metadata: {
      confidence: 94,
      processingTime: 2.3,
      ocrMethod: 'browser'
    }
  },
  {
    id: '2',
    type: 'alert',
    title: 'Price increase detected',
    description: 'Office supplies at Staples increased by 15%',
    timestamp: subDays(new Date(), 0),
    amount: 89.99,
    vendor: 'Staples',
    category: 'Office Supplies',
    status: 'pending',
    metadata: {
      alertType: 'price_increase'
    }
  },
  {
    id: '3',
    type: 'processed',
    title: 'PDF receipt processed',
    description: 'Invoice from legal services processed via AI',
    timestamp: subDays(new Date(), 1),
    amount: 450.00,
    vendor: 'Legal Associates LLC',
    category: 'Professional Services',
    status: 'completed',
    metadata: {
      confidence: 87,
      processingTime: 8.1,
      ocrMethod: 'ai'
    }
  },
  {
    id: '4',
    type: 'insight',
    title: 'Spending pattern identified',
    description: 'Travel expenses 23% higher than last month',
    timestamp: subDays(new Date(), 1),
    amount: 1420.50,
    category: 'Travel & Transportation',
    status: 'completed'
  },
  {
    id: '5',
    type: 'categorized',
    title: 'Auto-categorization complete',
    description: 'Amazon purchase categorized as Office Supplies',
    timestamp: subDays(new Date(), 2),
    amount: 67.89,
    vendor: 'Amazon',
    category: 'Office Supplies',
    status: 'completed',
    metadata: {
      confidence: 91
    }
  },
  {
    id: '6',
    type: 'upload',
    title: 'Multiple receipts uploaded',
    description: 'Batch upload of 5 restaurant receipts',
    timestamp: subDays(new Date(), 2),
    amount: 234.67,
    category: 'Meals & Entertainment',
    status: 'completed',
    metadata: {
      processingTime: 12.4,
      ocrMethod: 'browser'
    }
  },
  {
    id: '7',
    type: 'alert',
    title: 'Duplicate receipt detected',
    description: 'Similar receipt from Uber already exists',
    timestamp: subDays(new Date(), 3),
    amount: 23.45,
    vendor: 'Uber',
    category: 'Travel & Transportation',
    status: 'pending',
    metadata: {
      alertType: 'duplicate'
    }
  },
  {
    id: '8',
    type: 'reviewed',
    title: 'Receipt review completed',
    description: 'Corrected amount and category for gas station receipt',
    timestamp: subDays(new Date(), 4),
    amount: 78.90,
    vendor: 'Shell',
    category: 'Travel & Transportation',
    status: 'completed'
  }
];

function getActivityIcon(type: string, status: string) {
  switch (type) {
    case 'upload':
      return status === 'completed' ? 
        <IconReceipt className="h-4 w-4 text-blue-600" /> : 
        <IconClock className="h-4 w-4 text-orange-500" />;
    case 'processed':
      return status === 'completed' ? 
        <IconBrain className="h-4 w-4 text-green-600" /> : 
        <IconClock className="h-4 w-4 text-orange-500" />;
    case 'reviewed':
      return <IconEye className="h-4 w-4 text-purple-600" />;
    case 'categorized':
      return <IconFileText className="h-4 w-4 text-indigo-600" />;
    case 'alert':
      return <IconAlertTriangle className="h-4 w-4 text-red-600" />;
    case 'insight':
      return <IconTrendingUp className="h-4 w-4 text-emerald-600" />;
    default:
      return <IconCheck className="h-4 w-4 text-gray-500" />;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="secondary" className="text-xs">Completed</Badge>;
    case 'pending':
      return <Badge variant="outline" className="text-xs">Pending</Badge>;
    case 'failed':
      return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    default:
      return null;
  }
}

function formatActivityTime(timestamp: Date) {
  if (isToday(timestamp)) {
    return `Today at ${format(timestamp, 'h:mm a')}`;
  } else if (isYesterday(timestamp)) {
    return `Yesterday at ${format(timestamp, 'h:mm a')}`;
  } else {
    return format(timestamp, 'MMM d, h:mm a');
  }
}

async function fetchRecentActivity(startDate?: string, endDate?: string): Promise<ReceiptActivity[]> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`/api/dashboard/activity?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch recent activity');
    }

    return result.data;
  } catch (error) {
    console.error('Failed to fetch recent activity:', error);
    
    // Fallback to empty array if API fails
    return [];
  }
}

interface RecentActivityProps {
  startDate?: string;
  endDate?: string;
}

export function RecentActivity({ startDate, endDate }: RecentActivityProps = {}) {
  const [activities, setActivities] = useState<ReceiptActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchRecentActivity(startDate, endDate)
      .then(setActivities)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-48 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-8 w-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedActivities = showAll ? activities : activities.slice(0, 5);

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconCalendar className="h-5 w-5" />
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Recent Activity</span>
        </CardTitle>
        <CardDescription>
          Latest receipt processing and spending insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {displayedActivities.map((activity, index) => (
              <div key={activity.id}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type, activity.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-foreground">
                            {activity.title}
                          </p>
                          {getStatusBadge(activity.status)}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {activity.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{formatActivityTime(activity.timestamp)}</span>
                          
                          {activity.amount && (
                            <span className="flex items-center gap-1">
                              <IconCurrencyDollar className="h-3 w-3" />
                              ${activity.amount.toLocaleString()}
                            </span>
                          )}
                          
                          {activity.vendor && (
                            <span className="flex items-center gap-1">
                              <IconBuilding className="h-3 w-3" />
                              {activity.vendor}
                            </span>
                          )}
                          
                          {activity.category && (
                            <Badge variant="outline" className="text-xs">
                              {activity.category}
                            </Badge>
                          )}
                        </div>
                        
                        {activity.metadata && (
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {activity.metadata.confidence && (
                              <span>Confidence: {activity.metadata.confidence}%</span>
                            )}
                            {activity.metadata.processingTime && (
                              <span>Processed in {activity.metadata.processingTime}s</span>
                            )}
                            {activity.metadata.ocrMethod && (
                              <Badge variant="secondary" className="text-xs">
                                {activity.metadata.ocrMethod === 'browser' ? 'Browser OCR' : 'AI Processing'}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {index < displayedActivities.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {activities.length > 5 && (
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="w-full"
            >
              {showAll ? 'Show Less' : `Show All ${activities.length} Activities`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}