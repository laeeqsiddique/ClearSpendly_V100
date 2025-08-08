// Enhanced subscription types for SaaS expense tracking system

// Constants for subscription management
export const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Other' }
] as const;

export const SUBSCRIPTION_CATEGORIES = [
  { value: 'software', label: 'Software' },
  { value: 'cloud_services', label: 'Cloud Services' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'development', label: 'Development' },
  { value: 'design', label: 'Design' },
  { value: 'communication', label: 'Communication' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' }
] as const;

export interface Subscription {
  id: string;
  tenant_id: string;
  created_by: string;
  
  // Subscription details
  service_name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  category?: string;
  
  // Dates
  start_date: string;
  next_charge_date?: string;
  last_charge_date?: string;
  end_date?: string;
  
  // Status
  status: 'active' | 'paused' | 'cancelled';
  
  // Additional info
  notes?: string;
  payment_method?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface SubscriptionProcessingEvent {
  id: string;
  tenant_id: string;
  subscription_id: string;
  
  // Event details
  event_type: 'generation_started' | 'generation_completed' | 'generation_failed' | 'generation_skipped' | 
             'subscription_paused' | 'subscription_resumed' | 'subscription_cancelled';
  event_date: string;
  processing_date: string;
  
  // Idempotency and batch tracking
  idempotency_key: string;
  batch_id?: string;
  
  // Processing details
  expenses_generated: number;
  total_amount?: number;
  processing_duration_ms?: number;
  
  // Error handling
  error_code?: string;
  error_message?: string;
  retry_count: number;
  
  // Metadata
  processor_version?: string;
  processing_context: Record<string, any>;
  
  created_at: string;
}

export interface SubscriptionLifecycleEvent {
  id: string;
  eventType: string;
  eventDate: string;
  fromStatus: string;
  toStatus: string;
  reason?: string;
  userName?: string;
  createdAt: string;
}

export interface ProrationDetails {
  originalAmount: number;
  proratedAmount: number;
  daysUsed: number;
  totalDaysInPeriod: number;
  prorationRatio: number;
  reason: 'pause' | 'cancel' | 'resume';
}

export interface SubscriptionMetrics {
  totalActive: number;
  totalPaused: number;
  totalCancelled: number;
  monthlyRecurringRevenue: number;
  pendingProcessing: number;
  recentErrors: number;
  lastProcessingTime?: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

export interface BatchProcessingResult {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  totalAmount: number;
  processingTimeMs: number;
  errors: Array<{
    subscriptionId: string;
    tenantId: string;
    error: string;
  }>;
}

// API Response types
export interface SubscriptionLifecycleResponse {
  success: boolean;
  action?: 'pause' | 'resume' | 'cancel';
  subscriptionId?: string;
  serviceName?: string;
  result?: {
    nextChargeDate?: string;
    endDate?: string;
    prorationDetails?: ProrationDetails;
  };
  error?: string;
}

export interface SubscriptionHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  timestamp: string;
  buildTime?: boolean;
  checks: {
    database: string;
    subscriptions: string;
    processing: string;
  };
  metrics?: {
    activeSubscriptions: number;
    pendingProcessing: number;
    recentErrors: number;
    lastProcessingBatch?: string;
  };
}

// Component props types
export interface SubscriptionCardProps {
  subscription: Subscription;
  onStatusChange?: (subscriptionId: string, newStatus: string) => void;
  onEdit?: (subscription: Subscription) => void;
  onDelete?: (subscriptionId: string) => void;
  showLifecycleActions?: boolean;
}

export interface SubscriptionListProps {
  subscriptions: Subscription[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onAdd?: () => void;
}

export interface SubscriptionMetricsProps {
  metrics: SubscriptionMetrics;
  loading?: boolean;
  onRefresh?: () => void;
}

// Form types
export interface CreateSubscriptionForm {
  service_name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  category?: string;
  payment_method?: string;
  notes?: string;
}

export interface UpdateSubscriptionForm extends Partial<CreateSubscriptionForm> {
  id: string;
}

export interface SubscriptionLifecycleForm {
  action: 'pause' | 'resume' | 'cancel';
  effectiveDate?: string;
  reason?: string;
  immediateCancel?: boolean; // For cancel action
}

// Filter and search types
export interface SubscriptionFilter {
  status?: 'active' | 'paused' | 'cancelled' | 'all';
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all';
  category?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
}

export interface SubscriptionSearchParams {
  query?: string;
  filter?: SubscriptionFilter;
  sortBy?: 'service_name' | 'amount' | 'next_charge_date' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}