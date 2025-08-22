/**
 * Environment-Specific Testing Configuration
 * 
 * Manages test configuration across development, staging, and production environments
 */

export type Environment = 'local' | 'staging' | 'production' | 'test';

export interface EnvironmentConfig {
  name: Environment;
  baseUrl: string;
  supabaseUrl: string;
  supabaseKey: string;
  stripeKey: string;
  paypalClientId: string;
  testDataPrefix: string;
  maxTestUsers: number;
  maxTestTenants: number;
  enableCleanup: boolean;
  enableSnapshot: boolean;
  testTimeout: number;
  retryAttempts: number;
}

export interface TestUrls {
  auth: {
    signUp: string;
    signIn: string;
    signOut: string;
    callback: string;
  };
  api: {
    setupTenant: string;
    subscriptions: string;
    billing: string;
    receipts: string;
    health: string;
  };
  pages: {
    dashboard: string;
    billing: string;
    settings: string;
    onboarding: string;
  };
}

/**
 * Environment Configuration Manager
 */
export class EnvironmentConfigManager {
  private static configs: Record<Environment, Partial<EnvironmentConfig>> = {
    local: {
      name: 'local',
      baseUrl: 'http://localhost:3000',
      testDataPrefix: 'local_test',
      maxTestUsers: 50,
      maxTestTenants: 20,
      enableCleanup: true,
      enableSnapshot: true,
      testTimeout: 30000,
      retryAttempts: 3
    },
    staging: {
      name: 'staging',
      baseUrl: process.env.STAGING_URL || 'https://staging.clearspendly.com',
      testDataPrefix: 'staging_test',
      maxTestUsers: 20,
      maxTestTenants: 10,
      enableCleanup: true,
      enableSnapshot: false,
      testTimeout: 45000,
      retryAttempts: 2
    },
    production: {
      name: 'production',
      baseUrl: process.env.PRODUCTION_URL || 'https://clearspendly.com',
      testDataPrefix: 'prod_smoke_test',
      maxTestUsers: 5,
      maxTestTenants: 2,
      enableCleanup: true,
      enableSnapshot: false,
      testTimeout: 60000,
      retryAttempts: 1
    },
    test: {
      name: 'test',
      baseUrl: 'http://localhost:3000',
      testDataPrefix: 'automated_test',
      maxTestUsers: 100,
      maxTestTenants: 50,
      enableCleanup: true,
      enableSnapshot: true,
      testTimeout: 20000,
      retryAttempts: 3
    }
  };

  /**
   * Get configuration for specific environment
   */
  static getConfig(environment: Environment): EnvironmentConfig {
    const baseConfig = this.configs[environment];
    const envVars = this.getEnvironmentVariables(environment);
    
    return {
      ...baseConfig,
      ...envVars
    } as EnvironmentConfig;
  }

  /**
   * Get environment variables for specific environment
   */
  private static getEnvironmentVariables(environment: Environment): Partial<EnvironmentConfig> {
    const envPrefix = environment.toUpperCase();
    
    return {
      supabaseUrl: process.env[`${envPrefix}_SUPABASE_URL`] || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey: process.env[`${envPrefix}_SUPABASE_KEY`] || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      stripeKey: process.env[`${envPrefix}_STRIPE_SECRET_KEY`] || process.env.STRIPE_SECRET_KEY || '',
      paypalClientId: process.env[`${envPrefix}_PAYPAL_CLIENT_ID`] || process.env.PAYPAL_CLIENT_ID || ''
    };
  }

  /**
   * Generate URLs for specific environment
   */
  static getTestUrls(environment: Environment): TestUrls {
    const config = this.getConfig(environment);
    
    return {
      auth: {
        signUp: `${config.baseUrl}/sign-up`,
        signIn: `${config.baseUrl}/sign-in`,
        signOut: `${config.baseUrl}/api/auth/signout`,
        callback: `${config.baseUrl}/auth/callback`
      },
      api: {
        setupTenant: `${config.baseUrl}/api/setup-tenant`,
        subscriptions: `${config.baseUrl}/api/subscriptions`,
        billing: `${config.baseUrl}/api/billing`,
        receipts: `${config.baseUrl}/api/receipts`,
        health: `${config.baseUrl}/api/health`
      },
      pages: {
        dashboard: `${config.baseUrl}/dashboard`,
        billing: `${config.baseUrl}/dashboard/billing`,
        settings: `${config.baseUrl}/dashboard/settings`,
        onboarding: `${config.baseUrl}/onboarding`
      }
    };
  }

  /**
   * Detect current environment
   */
  static detectEnvironment(): Environment {
    // Check for explicit environment variable
    const explicitEnv = process.env.TEST_ENVIRONMENT as Environment;
    if (explicitEnv && ['local', 'staging', 'production', 'test'].includes(explicitEnv)) {
      return explicitEnv;
    }

    // Check for CI environment
    if (process.env.CI) {
      return 'test';
    }

    // Check for staging indicators
    if (process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'staging') {
      return 'staging';
    }

    // Check for production indicators
    if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
      return 'production';
    }

    // Default to local
    return 'local';
  }

  /**
   * Validate environment configuration
   */
  static validateConfig(environment: Environment): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const config = this.getConfig(environment);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    const required = ['baseUrl', 'supabaseUrl', 'supabaseKey'];
    for (const field of required) {
      if (!config[field as keyof EnvironmentConfig]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // URL validation
    try {
      new URL(config.baseUrl);
    } catch {
      errors.push(`Invalid baseUrl: ${config.baseUrl}`);
    }

    try {
      new URL(config.supabaseUrl);
    } catch {
      errors.push(`Invalid supabaseUrl: ${config.supabaseUrl}`);
    }

    // Environment-specific validations
    if (environment === 'production') {
      if (!config.baseUrl.includes('https://')) {
        errors.push('Production environment must use HTTPS');
      }
      
      if (config.maxTestTenants > 5) {
        warnings.push('Production environment should limit test tenants');
      }
    }

    if (environment === 'local') {
      if (!config.baseUrl.includes('localhost')) {
        warnings.push('Local environment should use localhost');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get appropriate test configuration for current context
   */
  static getTestConfiguration() {
    const environment = this.detectEnvironment();
    const config = this.getConfig(environment);
    const urls = this.getTestUrls(environment);
    const validation = this.validateConfig(environment);

    return {
      environment,
      config,
      urls,
      validation,
      testParameters: {
        shouldRunE2E: environment !== 'production',
        shouldRunLoadTests: environment === 'staging',
        shouldRunSmokeTests: environment === 'production',
        shouldCleanupAfter: config.enableCleanup,
        shouldTakeSnapshots: config.enableSnapshot,
        maxConcurrentTests: environment === 'local' ? 5 : 2,
        testDataRetentionHours: environment === 'production' ? 1 : 24
      }
    };
  }
}

/**
 * Test configuration decorator for automatic environment setup
 */
export function withEnvironment(environment?: Environment) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const testEnv = environment || EnvironmentConfigManager.detectEnvironment();
      const config = EnvironmentConfigManager.getConfig(testEnv);
      
      // Set up environment-specific context
      process.env.TEST_ENVIRONMENT = testEnv;
      process.env.TEST_BASE_URL = config.baseUrl;
      
      try {
        return await originalMethod.apply(this, args);
      } finally {
        // Cleanup environment
        delete process.env.TEST_ENVIRONMENT;
        delete process.env.TEST_BASE_URL;
      }
    };
  };
}

/**
 * Feature flags for environment-specific testing
 */
export class EnvironmentFeatureFlags {
  private static flags: Record<Environment, Record<string, boolean>> = {
    local: {
      enableDebugLogging: true,
      skipAuthVerification: false,
      enableMockPayments: true,
      allowDataSeeding: true,
      enablePerformanceProfiling: true
    },
    staging: {
      enableDebugLogging: true,
      skipAuthVerification: false,
      enableMockPayments: false,
      allowDataSeeding: true,
      enablePerformanceProfiling: true
    },
    production: {
      enableDebugLogging: false,
      skipAuthVerification: false,
      enableMockPayments: false,
      allowDataSeeding: false,
      enablePerformanceProfiling: false
    },
    test: {
      enableDebugLogging: true,
      skipAuthVerification: true,
      enableMockPayments: true,
      allowDataSeeding: true,
      enablePerformanceProfiling: false
    }
  };

  static isEnabled(flag: string, environment?: Environment): boolean {
    const env = environment || EnvironmentConfigManager.detectEnvironment();
    return this.flags[env][flag] || false;
  }

  static getAllFlags(environment?: Environment): Record<string, boolean> {
    const env = environment || EnvironmentConfigManager.detectEnvironment();
    return { ...this.flags[env] };
  }
}