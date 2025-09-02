"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Bell,
  X,
  AlertTriangle,
  Zap,
  Crown,
  Clock,
  CreditCard,
  CheckCircle,
  Info,
  TrendingUp,
  Shield,
  ChevronRight,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'usage_warning' | 'usage_limit' | 'trial_ending' | 'payment_due' | 'feature_upgrade' | 'success' | 'info';
  title: string;
  message: string;
  feature?: string;
  currentUsage?: number;
  limit?: number;
  actionLabel?: string;
  actionUrl?: string;
  dismissible?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

interface SubscriptionNotificationsProps {
  notifications: Notification[];
  onDismiss: (notificationId: string) => void;
  onAction: (notificationId: string, actionUrl?: string) => void;
  compact?: boolean;
  maxVisible?: number;
}

export function SubscriptionNotifications({
  notifications,
  onDismiss,
  onAction,
  compact = false,
  maxVisible = 3
}: SubscriptionNotificationsProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const sortedNotifications = [...notifications].sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setVisibleNotifications(
      showAll ? sortedNotifications : sortedNotifications.slice(0, maxVisible)
    );
  }, [notifications, showAll, maxVisible]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'usage_warning':
      case 'usage_limit':
        return <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'trial_ending':
        return <Clock className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'payment_due':
        return <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'feature_upgrade':
        return <Crown className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />;
      default:
        return <Info className="w-4 h-4 sm:w-5 sm:h-5" />;
    }
  };

  const getNotificationColors = (type: Notification['type'], priority?: Notification['priority']) => {
    const baseColors = {
      usage_warning: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: 'text-yellow-600',
        button: 'bg-yellow-600 hover:bg-yellow-700'
      },
      usage_limit: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: 'text-red-600',
        button: 'bg-red-600 hover:bg-red-700'
      },
      trial_ending: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      payment_due: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        icon: 'text-orange-600',
        button: 'bg-orange-600 hover:bg-orange-700'
      },
      feature_upgrade: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-800',
        icon: 'text-purple-600',
        button: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
      },
      success: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        icon: 'text-green-600',
        button: 'bg-green-600 hover:bg-green-700'
      },
      info: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-800',
        icon: 'text-gray-600',
        button: 'bg-gray-600 hover:bg-gray-700'
      }
    };

    const colors = baseColors[type] || baseColors.info;

    // Enhance colors for critical priority
    if (priority === 'critical') {
      return {
        ...colors,
        border: colors.border.replace('200', '300'),
        bg: colors.bg + ' ring-2 ring-offset-2 ' + colors.border.replace('border-', 'ring-').replace('200', '300')
      };
    }

    return colors;
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date().getTime();
    const notificationTime = new Date(dateString).getTime();
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Compact mobile header */}
      {!compact && visibleNotifications.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">Notifications</h3>
            <Badge variant="outline" className="text-xs">
              {notifications.length}
            </Badge>
          </div>
          {notifications.length > maxVisible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-xs sm:text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            >
              {showAll ? 'Show Less' : `View All (${notifications.length})`}
            </Button>
          )}
        </div>
      )}

      {/* Notification cards */}
      <div className="space-y-2 sm:space-y-3">
        {visibleNotifications.map((notification) => {
          const colors = getNotificationColors(notification.type, notification.priority);
          const icon = getNotificationIcon(notification.type);
          
          return (
            <Card
              key={notification.id}
              className={cn(
                "border-l-4 transition-all duration-200 hover:shadow-md",
                colors.bg,
                colors.border.replace('border-', 'border-l-'),
                "animate-in slide-in-from-right-4 fade-in duration-300"
              )}
            >
              <CardContent className={cn("p-3 sm:p-4", compact && "p-3")}>
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn(
                    "p-1.5 rounded-full flex-shrink-0 mt-0.5",
                    colors.bg.replace('bg-', 'bg-').replace('-50', '-100'),
                    colors.icon
                  )}>
                    {React.cloneElement(icon, { 
                      className: cn(icon.props.className, colors.icon) 
                    })}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={cn(
                        "text-sm sm:text-base font-semibold leading-tight",
                        colors.text
                      )}>
                        {notification.title}
                      </h4>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {notification.priority === 'critical' && (
                          <Badge className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5">
                            Critical
                          </Badge>
                        )}
                        {notification.dismissible && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDismiss(notification.id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className={cn(
                      "text-xs sm:text-sm leading-relaxed mb-2 sm:mb-3",
                      colors.text.replace('800', '700')
                    )}>
                      {notification.message}
                    </p>

                    {/* Usage progress bar for usage notifications */}
                    {(notification.type === 'usage_warning' || notification.type === 'usage_limit') && 
                     notification.currentUsage !== undefined && notification.limit !== undefined && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={colors.text.replace('800', '700')}>Usage</span>
                          <span className={colors.text}>
                            {notification.currentUsage}/{notification.limit}
                          </span>
                        </div>
                        <Progress 
                          value={(notification.currentUsage / notification.limit) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}

                    {/* Actions and timestamp */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      {notification.actionLabel && (
                        <Button
                          size="sm"
                          onClick={() => onAction(notification.id, notification.actionUrl)}
                          className={cn(
                            "h-8 sm:h-9 text-xs sm:text-sm font-medium text-white",
                            colors.button,
                            "transition-all duration-200 shadow-sm hover:shadow-md"
                          )}
                        >
                          {notification.actionLabel}
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                      
                      <span className={cn(
                        "text-xs",
                        colors.text.replace('800', '600'),
                        "flex-shrink-0"
                      )}>
                        {getTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Usage example with mock data generator
export function generateMockNotifications(): Notification[] {
  const now = new Date();
  
  return [
    {
      id: '1',
      type: 'usage_warning',
      title: 'Receipt Processing Limit Warning',
      message: 'You\'ve used 8 out of 10 receipts this month. Consider upgrading to Pro for unlimited processing.',
      feature: 'receipt_processing',
      currentUsage: 8,
      limit: 10,
      priority: 'medium',
      actionLabel: 'Upgrade Now',
      actionUrl: '/upgrade',
      dismissible: true,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    },
    {
      id: '2',
      type: 'trial_ending',
      title: 'Trial Ending Soon',
      message: 'Your 14-day Pro trial expires in 2 days. Add a payment method to continue enjoying premium features.',
      priority: 'high',
      actionLabel: 'Add Payment Method',
      actionUrl: '/billing',
      dismissible: false,
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString() // 6 hours ago
    },
    {
      id: '3',
      type: 'feature_upgrade',
      title: 'Unlock Advanced Analytics',
      message: 'Get deeper insights into your expenses with custom reports, trend analysis, and export capabilities.',
      priority: 'low',
      actionLabel: 'Learn More',
      actionUrl: '/features/analytics',
      dismissible: true,
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    },
    {
      id: '4',
      type: 'usage_limit',
      title: 'Monthly Limit Reached',
      message: 'You\'ve reached your monthly limit of 10 receipts. Upgrade to Pro for unlimited processing.',
      feature: 'receipt_processing',
      currentUsage: 10,
      limit: 10,
      priority: 'critical',
      actionLabel: 'Upgrade to Pro',
      actionUrl: '/upgrade?plan=pro',
      dismissible: false,
      createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString() // 30 minutes ago
    }
  ];
}