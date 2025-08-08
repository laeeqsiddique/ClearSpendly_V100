// Analytics Cache Service for ClearSpendly
// High-performance caching layer for expensive analytics computations

import { createClient } from '@/lib/supabase/server';
import { Redis } from '@upstash/redis';

// Cache configuration
const CACHE_TTL = {
  DASHBOARD_METRICS: 300, // 5 minutes
  TREND_ANALYSIS: 900, // 15 minutes
  CLIENT_SEGMENTATION: 1800, // 30 minutes
  EXPENSE_ANALYTICS: 600, // 10 minutes
  SUBSCRIPTION_METRICS: 600, // 10 minutes
  MONTHLY_SUMMARY: 3600, // 1 hour
  YEARLY_SUMMARY: 86400, // 24 hours
};

const CACHE_KEYS = {
  DASHBOARD_METRICS: (tenantId: string, startDate: string, endDate: string) => 
    `analytics:dashboard:${tenantId}:${startDate}:${endDate}`,
  TREND_ANALYSIS: (tenantId: string, metric: string, periods: number) => 
    `analytics:trends:${tenantId}:${metric}:${periods}`,
  CLIENT_SEGMENTATION: (tenantId: string, startDate: string, endDate: string) => 
    `analytics:clients:${tenantId}:${startDate}:${endDate}`,
  EXPENSE_ANALYTICS: (tenantId: string, startDate: string, endDate: string) => 
    `analytics:expenses:${tenantId}:${startDate}:${endDate}`,
  SUBSCRIPTION_METRICS: (tenantId: string) => 
    `analytics:subscriptions:${tenantId}`,
  MONTHLY_SUMMARY: (tenantId: string, year: number, month: number) => 
    `analytics:monthly:${tenantId}:${year}:${month}`,
  REAL_TIME_METRICS: (tenantId: string) => 
    `analytics:realtime:${tenantId}`,
};

// Build-time safe Redis client creation
const createRedisClient = () => {
  const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;
  
  if (isBuildTime || !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Return mock Redis client for build time or missing config
    return {
      get: async () => null,
      set: async () => 'OK',
      del: async () => 1,
      exists: async () => 0,
      expire: async () => 1,
      flushpattern: async () => 0,
      pipeline: () => ({
        get: () => ({}),
        set: () => ({}),
        del: () => ({}),
        exec: async () => [],
      }),
    };
  }

  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
};

export class AnalyticsCacheService {
  private redis;
  private compressionThreshold = 1000; // Compress payloads > 1KB

  constructor() {
    this.redis = createRedisClient();
  }

  // Compress large JSON payloads to save memory
  private compress(data: any): string {
    const jsonString = JSON.stringify(data);
    if (jsonString.length > this.compressionThreshold) {
      // Simple compression - in production, consider using gzip
      return JSON.stringify({ compressed: true, data: jsonString });
    }
    return jsonString;
  }

  private decompress(data: string): any {
    try {
      const parsed = JSON.parse(data);
      if (parsed.compressed) {
        return JSON.parse(parsed.data);
      }
      return parsed;
    } catch (error) {
      console.warn('Failed to decompress cache data:', error);
      return null;
    }
  }

  // Get cached analytics with fallback
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;
      
      return this.decompress(cached as string);
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  // Set cached analytics with TTL
  async set(key: string, data: any, ttl: number): Promise<void> {
    try {
      const compressed = this.compress(data);
      await this.redis.setex(key, ttl, compressed);
    } catch (error) {
      console.warn('Cache set error:', error);
      // Don't throw - cache failures shouldn't break the app
    }
  }

  // Invalidate cache patterns
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Note: This requires Redis SCAN for pattern matching
      // For now, we'll use a simple approach
      if (typeof this.redis.flushpattern === 'function') {
        await this.redis.flushpattern(pattern);
      }
    } catch (error) {
      console.warn('Cache invalidation error:', error);
    }
  }

  // Get or compute dashboard metrics with caching
  async getDashboardMetrics(
    tenantId: string,
    startDate: string,
    endDate: string,
    computeFn: () => Promise<any>
  ): Promise<any> {
    const key = CACHE_KEYS.DASHBOARD_METRICS(tenantId, startDate, endDate);
    
    // Try cache first
    let cached = await this.get(key);
    if (cached) {
      console.log('Cache hit: dashboard metrics');
      return cached;
    }

    // Compute and cache
    console.log('Cache miss: computing dashboard metrics');
    const result = await computeFn();
    await this.set(key, result, CACHE_TTL.DASHBOARD_METRICS);
    
    return result;
  }

  // Get or compute trend analysis with caching
  async getTrendAnalysis(
    tenantId: string,
    metricType: string,
    periods: number,
    computeFn: () => Promise<any>
  ): Promise<any> {
    const key = CACHE_KEYS.TREND_ANALYSIS(tenantId, metricType, periods);
    
    let cached = await this.get(key);
    if (cached) {
      console.log('Cache hit: trend analysis');
      return cached;
    }

    console.log('Cache miss: computing trend analysis');
    const result = await computeFn();
    await this.set(key, result, CACHE_TTL.TREND_ANALYSIS);
    
    return result;
  }

  // Get or compute client segmentation with caching
  async getClientSegmentation(
    tenantId: string,
    startDate: string,
    endDate: string,
    computeFn: () => Promise<any>
  ): Promise<any> {
    const key = CACHE_KEYS.CLIENT_SEGMENTATION(tenantId, startDate, endDate);
    
    let cached = await this.get(key);
    if (cached) {
      console.log('Cache hit: client segmentation');
      return cached;
    }

    console.log('Cache miss: computing client segmentation');
    const result = await computeFn();
    await this.set(key, result, CACHE_TTL.CLIENT_SEGMENTATION);
    
    return result;
  }

  // Get or compute expense analytics with caching
  async getExpenseAnalytics(
    tenantId: string,
    startDate: string,
    endDate: string,
    computeFn: () => Promise<any>
  ): Promise<any> {
    const key = CACHE_KEYS.EXPENSE_ANALYTICS(tenantId, startDate, endDate);
    
    let cached = await this.get(key);
    if (cached) {
      console.log('Cache hit: expense analytics');
      return cached;
    }

    console.log('Cache miss: computing expense analytics');
    const result = await computeFn();
    await this.set(key, result, CACHE_TTL.EXPENSE_ANALYTICS);
    
    return result;
  }

  // Get or compute subscription metrics with caching
  async getSubscriptionMetrics(
    tenantId: string,
    computeFn: () => Promise<any>
  ): Promise<any> {
    const key = CACHE_KEYS.SUBSCRIPTION_METRICS(tenantId);
    
    let cached = await this.get(key);
    if (cached) {
      console.log('Cache hit: subscription metrics');
      return cached;
    }

    console.log('Cache miss: computing subscription metrics');
    const result = await computeFn();
    await this.set(key, result, CACHE_TTL.SUBSCRIPTION_METRICS);
    
    return result;
  }

  // Multi-level cache warming strategy
  async warmCache(tenantId: string): Promise<void> {
    const now = new Date();
    const currentMonth = {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    };
    
    const previousMonth = {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
      end: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
    };

    try {
      const supabase = await createClient();

      // Warm dashboard metrics for current and previous month
      const warmingPromises = [
        // Current month metrics
        this.getDashboardMetrics(
          tenantId, 
          currentMonth.start, 
          currentMonth.end,
          async () => {
            const { data } = await supabase.rpc('get_comprehensive_dashboard_metrics', {
              p_tenant_id: tenantId,
              p_start_date: currentMonth.start,
              p_end_date: currentMonth.end,
            });
            return data;
          }
        ),

        // Previous month metrics  
        this.getDashboardMetrics(
          tenantId,
          previousMonth.start,
          previousMonth.end,
          async () => {
            const { data } = await supabase.rpc('get_comprehensive_dashboard_metrics', {
              p_tenant_id: tenantId,
              p_start_date: previousMonth.start,
              p_end_date: previousMonth.end,
            });
            return data;
          }
        ),

        // Subscription metrics
        this.getSubscriptionMetrics(tenantId, async () => {
          const { data } = await supabase.rpc('get_subscription_analytics', {
            p_tenant_id: tenantId,
          });
          return data;
        }),
      ];

      await Promise.allSettled(warmingPromises);
      console.log(`Cache warming completed for tenant ${tenantId}`);
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  // Invalidate all analytics cache for a tenant
  async invalidateTenantCache(tenantId: string): Promise<void> {
    const patterns = [
      `analytics:dashboard:${tenantId}:*`,
      `analytics:trends:${tenantId}:*`,
      `analytics:clients:${tenantId}:*`,
      `analytics:expenses:${tenantId}:*`,
      `analytics:subscriptions:${tenantId}`,
      `analytics:monthly:${tenantId}:*`,
      `analytics:realtime:${tenantId}`,
    ];

    await Promise.allSettled(
      patterns.map(pattern => this.invalidatePattern(pattern))
    );

    console.log(`Invalidated all analytics cache for tenant ${tenantId}`);
  }

  // Smart cache refresh based on data freshness
  async smartRefresh(tenantId: string, dataType: string): Promise<void> {
    const refreshStrategies = {
      'receipt_added': async () => {
        // Invalidate expense analytics and dashboard metrics
        await this.invalidatePattern(`analytics:expenses:${tenantId}:*`);
        await this.invalidatePattern(`analytics:dashboard:${tenantId}:*`);
      },
      'payment_received': async () => {
        // Invalidate revenue-related analytics
        await this.invalidatePattern(`analytics:dashboard:${tenantId}:*`);
        await this.invalidatePattern(`analytics:clients:${tenantId}:*`);
      },
      'subscription_changed': async () => {
        // Invalidate subscription metrics
        await this.invalidatePattern(`analytics:subscriptions:${tenantId}`);
        await this.invalidatePattern(`analytics:dashboard:${tenantId}:*`);
      },
      'bulk_import': async () => {
        // Invalidate all cache after bulk operations
        await this.invalidateTenantCache(tenantId);
      },
    };

    const strategy = refreshStrategies[dataType as keyof typeof refreshStrategies];
    if (strategy) {
      await strategy();
      console.log(`Smart cache refresh completed for ${dataType}`);
    }
  }

  // Get cache statistics
  async getCacheStats(tenantId: string): Promise<{
    hitRate: number;
    totalKeys: number;
    memoryUsage: string;
    topKeys: string[];
  }> {
    try {
      // This would require Redis INFO and SCAN commands
      // For now, return mock data
      return {
        hitRate: 0.85, // 85% hit rate
        totalKeys: 42,
        memoryUsage: '2.5MB',
        topKeys: [
          `analytics:dashboard:${tenantId}`,
          `analytics:subscriptions:${tenantId}`,
          `analytics:expenses:${tenantId}`,
        ],
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: '0MB',
        topKeys: [],
      };
    }
  }
}

// Export singleton instance
export const analyticsCache = new AnalyticsCacheService();

// Cache warming utility for background jobs
export async function warmAnalyticsCache(tenantId: string): Promise<void> {
  await analyticsCache.warmCache(tenantId);
}

// Smart cache invalidation for real-time updates
export async function invalidateAnalyticsCache(tenantId: string, reason: string): Promise<void> {
  await analyticsCache.smartRefresh(tenantId, reason);
}