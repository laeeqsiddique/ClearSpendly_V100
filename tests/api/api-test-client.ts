/**
 * API Test Client for ClearSpendly
 * 
 * Provides authenticated API testing utilities with tenant isolation
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TestDataManager } from '../../lib/testing/test-data-manager';
import { EnvironmentConfigManager } from '../../lib/testing/environment-config';
import type { Database } from '../../lib/supabase/types';

export interface ApiTestContext {
  tenantId: string;
  userId: string;
  accessToken: string;
  role: 'admin' | 'user' | 'viewer';
}

export interface ApiTestResponse<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
  duration: number;
}

export interface ApiTestError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

/**
 * API Test Client with authentication and tenant context
 */
export class ApiTestClient {
  private httpClient: AxiosInstance;
  private supabase: SupabaseClient<Database>;
  private testDataManager: TestDataManager;
  private context?: ApiTestContext;

  constructor(baseURL?: string) {
    const config = EnvironmentConfigManager.getTestConfiguration();
    const actualBaseURL = baseURL || config.config.baseUrl;

    this.httpClient = axios.create({
      baseURL: actualBaseURL,
      timeout: config.config.testTimeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.supabase = createClient<Database>(
      config.config.supabaseUrl,
      config.config.supabaseKey
    );

    this.testDataManager = TestDataManager.create(config.environment);

    // Request interceptor for authentication
    this.httpClient.interceptors.request.use((config) => {
      if (this.context?.accessToken) {
        config.headers.Authorization = `Bearer ${this.context.accessToken}`;
        config.headers['X-Tenant-ID'] = this.context.tenantId;
      }
      return config;
    });

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        const apiError: ApiTestError = {
          status: error.response?.status || 500,
          message: error.response?.data?.message || error.message,
          code: error.response?.data?.code,
          details: error.response?.data
        };
        throw apiError;
      }
    );
  }

  /**
   * Authenticate as a test user with tenant context
   */
  async authenticateAs(role: 'admin' | 'user' | 'viewer' = 'admin'): Promise<ApiTestContext> {
    // Create test tenant and user
    const tenantData = await this.testDataManager.createTestScenario('API Test');
    const user = tenantData.users.find(u => u.role === role) || tenantData.users[0];
    
    // Get authenticated session
    const { session } = await this.testDataManager.getTestUserWithSession(user.id);
    
    this.context = {
      tenantId: tenantData.tenant.id,
      userId: user.id,
      accessToken: session.access_token,
      role: user.role
    };

    return this.context;
  }

  /**
   * Make authenticated API request
   */
  async request<T = any>(
    method: string,
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiTestResponse<T>> {
    const startTime = Date.now();
    
    try {
      const response = await this.httpClient.request({
        method,
        url: endpoint,
        data,
        ...config
      });

      return {
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      const apiError = error as ApiTestError;
      apiError.duration = Date.now() - startTime;
      throw apiError;
    }
  }

  // Convenience methods
  async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiTestResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, config);
  }

  async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiTestResponse<T>> {
    return this.request<T>('POST', endpoint, data, config);
  }

  async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiTestResponse<T>> {
    return this.request<T>('PUT', endpoint, data, config);
  }

  async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiTestResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, config);
  }

  async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiTestResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, config);
  }

  /**
   * Test API endpoint health and response time
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    endpoints: Record<string, { status: number; responseTime: number }>;
  }> {
    const endpoints = [
      '/api/health',
      '/api/health/db',
      '/api/health/tenant',
      '/api/health/ai'
    ];

    const results: Record<string, { status: number; responseTime: number }> = {};
    let allHealthy = true;
    let totalTime = 0;

    for (const endpoint of endpoints) {
      try {
        const response = await this.get(endpoint);
        results[endpoint] = {
          status: response.status,
          responseTime: response.duration
        };
        totalTime += response.duration;
        
        if (response.status !== 200) {
          allHealthy = false;
        }
      } catch (error: any) {
        results[endpoint] = {
          status: error.status || 500,
          responseTime: error.duration || 0
        };
        allHealthy = false;
      }
    }

    return {
      healthy: allHealthy,
      responseTime: totalTime / endpoints.length,
      endpoints: results
    };
  }

  /**
   * Load test an endpoint
   */
  async loadTest(
    endpoint: string,
    options: {
      concurrent: number;
      requests: number;
      data?: any;
      method?: string;
    }
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    requestsPerSecond: number;
    errors: Record<string, number>;
  }> {
    const { concurrent, requests, data, method = 'GET' } = options;
    const startTime = Date.now();
    const results: Array<{ success: boolean; responseTime: number; error?: string }> = [];
    const errors: Record<string, number> = {};

    // Create batches of concurrent requests
    const batches = Math.ceil(requests / concurrent);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(concurrent, requests - batch * concurrent);
      const promises = [];

      for (let i = 0; i < batchSize; i++) {
        const promise = this.request(method, endpoint, data)
          .then(response => ({
            success: true,
            responseTime: response.duration
          }))
          .catch(error => {
            const errorKey = `${error.status}-${error.message}`;
            errors[errorKey] = (errors[errorKey] || 0) + 1;
            return {
              success: false,
              responseTime: error.duration || 0,
              error: errorKey
            };
          });
        
        promises.push(promise);
      }

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // Convert to seconds

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const responseTimes = results.map(r => r.responseTime);

    return {
      totalRequests: results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      requestsPerSecond: results.length / duration,
      errors
    };
  }

  /**
   * Test multi-tenant data isolation
   */
  async testTenantIsolation(): Promise<{
    isolated: boolean;
    violations: string[];
    testedEndpoints: string[];
  }> {
    if (!this.context) {
      throw new Error('Must authenticate before testing tenant isolation');
    }

    const violations: string[] = [];
    const testedEndpoints = [
      '/api/receipts',
      '/api/subscriptions',
      '/api/dashboard/stats',
      '/api/team/members'
    ];

    // Create a second tenant for comparison
    const otherTenantData = await this.testDataManager.createTestScenario('Isolation Test');
    
    // Seed both tenants with different data
    await this.testDataManager.seedTestData(this.context.tenantId);
    await this.testDataManager.seedTestData(otherTenantData.tenant.id);

    for (const endpoint of testedEndpoints) {
      try {
        const response = await this.get(endpoint);
        
        if (response.status === 200 && response.data) {
          // Check if response contains other tenant's data
          const responseStr = JSON.stringify(response.data);
          
          if (responseStr.includes(otherTenantData.tenant.id) || 
              responseStr.includes(otherTenantData.tenant.name)) {
            violations.push(`${endpoint}: Contains other tenant data`);
          }
        }
      } catch (error) {
        // API errors are acceptable for this test
        console.log(`Endpoint ${endpoint} returned error (acceptable):`, error);
      }
    }

    // Cleanup other tenant
    await this.testDataManager.resetTenantData(otherTenantData.tenant.id);

    return {
      isolated: violations.length === 0,
      violations,
      testedEndpoints
    };
  }

  /**
   * Test rate limiting
   */
  async testRateLimit(endpoint: string, limit: number = 100): Promise<{
    rateLimited: boolean;
    requestsBeforeLimit: number;
    rateLimitHeaders?: Record<string, string>;
  }> {
    let requestCount = 0;
    let rateLimited = false;
    let rateLimitHeaders: Record<string, string> = {};

    for (let i = 0; i < limit + 10; i++) {
      try {
        const response = await this.get(endpoint);
        requestCount++;
        
        // Check for rate limit headers
        if (response.headers['x-ratelimit-remaining']) {
          rateLimitHeaders = {
            'x-ratelimit-limit': response.headers['x-ratelimit-limit'],
            'x-ratelimit-remaining': response.headers['x-ratelimit-remaining'],
            'x-ratelimit-reset': response.headers['x-ratelimit-reset']
          };
        }
      } catch (error: any) {
        if (error.status === 429) { // Too Many Requests
          rateLimited = true;
          break;
        } else {
          // Other errors are not rate limiting
          break;
        }
      }
      
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return {
      rateLimited,
      requestsBeforeLimit: requestCount,
      rateLimitHeaders: Object.keys(rateLimitHeaders).length > 0 ? rateLimitHeaders : undefined
    };
  }

  /**
   * Test API security headers
   */
  async testSecurityHeaders(): Promise<{
    secure: boolean;
    missingHeaders: string[];
    presentHeaders: Record<string, string>;
  }> {
    const response = await this.get('/api/health');
    
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security'
    ];

    const missingHeaders: string[] = [];
    const presentHeaders: Record<string, string> = {};

    for (const header of requiredHeaders) {
      const value = response.headers[header];
      if (value) {
        presentHeaders[header] = value;
      } else {
        missingHeaders.push(header);
      }
    }

    return {
      secure: missingHeaders.length === 0,
      missingHeaders,
      presentHeaders
    };
  }

  /**
   * Cleanup test data and close connections
   */
  async cleanup(): Promise<void> {
    await this.testDataManager.cleanup();
  }

  /**
   * Get current test context
   */
  getContext(): ApiTestContext | undefined {
    return this.context;
  }

  /**
   * Switch tenant context
   */
  async switchTenant(tenantId: string): Promise<void> {
    if (!this.context) {
      throw new Error('Must authenticate before switching tenant');
    }

    this.context.tenantId = tenantId;
  }
}