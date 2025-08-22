// Enhanced subscription types for comprehensive SaaS billing and feature management system

// Constants for subscription management
export const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Other' }
] as const;

export const SUBSCRIPTION_STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 border-green-200',
  trialing: 'bg-blue-100 text-blue-800 border-blue-200', 
  past_due: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  inactive: 'bg-red-100 text-red-800 border-red-200'
} as const;

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

export const FEATURE_CATEGORIES = [
  'receipts_per_month',
  'invoices_per_month', 
  'storage_mb',
  'users_max',
  'ai_processing',
  'custom_branding',
  'api_access',
  'advanced_analytics',
  'priority_support'
] as const;

export const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly', discount: 0 },
  { value: 'yearly', label: 'Yearly', discount: 20 }
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

export interface BillingPredictions {
  nextBillingDate: string;
  estimatedAmount: number;
  usageTrend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    monthlyGrowth: number;
  };
  recommendedPlan?: {
    planId: string;
    planName: string;
    potentialSavings: number;
    reason: string;
  };
  upcomingLimitExceeded?: {
    feature: string;
    projectedDate: string;
    recommendedAction: string;
  };
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

export interface ProrationResponse {
  success: boolean;
  calculation?: ProrationCalculation;
  error?: string;
}

export interface PaymentMethodResponse {
  success: boolean;
  paymentMethods?: PaymentMethod[];
  error?: string;
}

export interface InvoiceResponse {
  success: boolean;
  invoices?: Invoice[];
  error?: string;
}

export interface FeatureAccessResponse {
  success: boolean;
  features?: Record<string, FeatureAccess>;
  error?: string;
}

export interface AdminAnalyticsResponse {
  success: boolean;
  data?: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    monthlyRevenue: number;
    churnRate: number;
    growthRate: number;
    healthDistribution: Record<string, number>;
    recentFailures: number;
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

// Enhanced subscription billing types
export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: Record<string, any>;
  limits: Record<string, any>;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  paypal_plan_id_monthly?: string;
  paypal_plan_id_yearly?: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

export interface CurrentSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'inactive';
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  cancel_at_period_end: boolean;
  amount: number;
  currency: string;
  provider: 'stripe' | 'paypal';
  usage_counts: Record<string, number>;
  subscription_plan?: {
    name: string;
    slug: string;
    features: Record<string, any>;
    limits: Record<string, any>;
  };
}

export interface UsageData {
  tenantId: string;
  usage: Record<string, {
    allowed: boolean;
    currentUsage: number;
    limit: number;
    isUnlimited: boolean;
    remainingUsage?: number;
  }>;
}

export interface ProrationCalculation {
  oldPlan: {
    id: string;
    name: string;
    amount: number;
  };
  newPlan: {
    id: string;
    name: string;
    amount: number;
  };
  unusedTime: number; // in days
  totalBillingPeriod: number; // in days
  credit: number;
  immediateCharge: number;
  nextBillingAmount: number;
  effectiveDate: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  last4?: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  created_at: string;
}

export interface BillingAddress {
  id: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount_due: number;
  amount_paid: number;
  currency: string;
  created_at: string;
  due_date?: string;
  paid_at?: string;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
  description?: string;
  billing_period_start?: string;
  billing_period_end?: string;
}

// Feature gating types
export interface FeatureAccess {
  feature: string;
  allowed: boolean;
  limit?: number;
  currentUsage?: number;
  upgradeRequired?: boolean;
  nextTierFeatures?: string[];
}

export interface FeatureGatingContext {
  planSlug: string;
  planFeatures: Record<string, any>;
  planLimits: Record<string, any>;
  usage: Record<string, number>;
  checkFeature: (feature: string) => FeatureAccess;
  canUseFeature: (feature: string) => boolean;
  getRemainingUsage: (feature: string) => number;
}

// Admin subscription management types
export interface TenantSubscription {
  tenant_id: string;
  tenant_name: string;
  subscription: CurrentSubscription;
  usage: UsageData;
  lastPayment?: {
    date: string;
    amount: number;
    status: string;
  };
  health: 'good' | 'warning' | 'critical';
}

export interface SubscriptionAdjustment {
  id: string;
  tenant_id: string;
  subscription_id: string;
  type: 'credit' | 'discount' | 'extension' | 'plan_change';
  amount?: number;
  description: string;
  applied_by: string;
  applied_at: string;
}

export interface CouponCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  description?: string;
  max_uses?: number;
  used_count: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

// Testing interface types
export interface TestScenario {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
}

export interface TestStep {
  type: 'create_subscription' | 'change_plan' | 'cancel' | 'payment_failure' | 'webhook';
  parameters: Record<string, any>;
  expectedResult: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, any>;
  processed: boolean;
  created_at: string;
  processed_at?: string;
  error?: string;
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

export interface PlanChangeForm {
  newPlanId: string;
  billingCycle: 'monthly' | 'yearly';
  effectiveDate?: 'now' | 'next_billing_cycle';
  prorationMode?: 'create_prorations' | 'none';
}

export interface PaymentMethodForm {
  type: 'card' | 'bank_account';
  card?: {
    number: string;
    exp_month: number;
    exp_year: number;
    cvc: string;
    name: string;
  };
  billing_address: BillingAddress;
}

export interface BillingAddressForm {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CouponForm {
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  description?: string;
  max_uses?: number;
  expires_at?: string;
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

// Enhanced component props for new features
export interface EnhancedUsageCardProps {
  title: string;
  icon: any;
  current: number;
  limit: number;
  isUnlimited: boolean;
  unit?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  predictions?: {
    nextMonth: number;
    willExceedLimit: boolean;
  };
  onUpgradeClick?: () => void;
}

export interface SubscriptionManagementProps {
  currentSubscription: CurrentSubscription;
  availablePlans: SubscriptionPlan[];
  paymentMethods: PaymentMethod[];
  onPlanChange: (planId: string, billingCycle: 'monthly' | 'yearly') => void;
  onPaymentMethodUpdate: (paymentMethodId: string) => void;
  onCancel: () => void;
}

export interface AdminSubscriptionOverviewProps {
  subscriptions: TenantSubscription[];
  onViewDetails: (tenantId: string) => void;
  onManualAdjustment: (tenantId: string, adjustment: Partial<SubscriptionAdjustment>) => void;
}

export interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export interface TestingDashboardProps {
  scenarios: TestScenario[];
  webhookEvents: WebhookEvent[];
  onRunScenario: (scenarioId: string) => void;
  onSimulatePayment: (type: 'success' | 'failure', amount: number) => void;
}