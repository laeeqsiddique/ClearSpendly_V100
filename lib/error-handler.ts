/**
 * Production error handler with detailed logging and fallback strategies
 */

export class ProductionError extends Error {
  public code: string;
  public context: Record<string, any>;
  public timestamp: Date;

  constructor(message: string, code: string, context: Record<string, any> = {}) {
    super(message);
    this.name = 'ProductionError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
  }
}

export interface ErrorContext {
  userId?: string;
  tenantId?: string;
  action?: string;
  component?: string;
  url?: string;
  userAgent?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ProductionError[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  logError(error: Error | ProductionError, context: ErrorContext = {}): void {
    const productionError = error instanceof ProductionError 
      ? error 
      : new ProductionError(error.message, 'UNKNOWN_ERROR', { originalError: error.name });

    // Enhanced context
    const enhancedContext = {
      ...context,
      environment: process.env.NODE_ENV,
      platform: process.env.VERCEL ? 'vercel' : process.env.RAILWAY_ENVIRONMENT ? 'railway' : 'other',
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    productionError.context = { ...productionError.context, ...enhancedContext };
    this.errorLog.push(productionError);

    // Console logging with structured format
    console.error(`[PRODUCTION_ERROR] ${productionError.code}: ${productionError.message}`, {
      context: productionError.context,
      timestamp: productionError.timestamp,
    });

    // Keep only last 100 errors in memory
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }
  }

  handleAuthError(error: Error, context: ErrorContext = {}): { 
    userMessage: string; 
    shouldRetry: boolean; 
    fallbackAction?: string 
  } {
    this.logError(error, { ...context, component: 'auth' });

    // Specific handling for auth errors
    if (error.message.includes('signInWithOAuth')) {
      return {
        userMessage: 'Google sign-in is temporarily unavailable. Please try email/password login.',
        shouldRetry: false,
        fallbackAction: 'use_email_auth'
      };
    }

    if (error.message.includes('Supabase not available')) {
      return {
        userMessage: 'Authentication service is temporarily unavailable. Please try again later.',
        shouldRetry: true,
      };
    }

    if (error.message.includes('Invalid login credentials')) {
      return {
        userMessage: 'Invalid email or password. Please check your credentials.',
        shouldRetry: false,
      };
    }

    return {
      userMessage: 'An unexpected error occurred during sign-in. Please try again.',
      shouldRetry: true,
    };
  }

  handleAPIError(error: Error, context: ErrorContext = {}): {
    userMessage: string;
    statusCode: number;
    shouldRetry: boolean;
  } {
    this.logError(error, { ...context, component: 'api' });

    // Database connection errors
    if (error.message.includes('PGRST116')) {
      return {
        userMessage: 'No data found for your request.',
        statusCode: 404,
        shouldRetry: false,
      };
    }

    if (error.message.includes('connection') || error.message.includes('timeout')) {
      return {
        userMessage: 'Service temporarily unavailable. Please try again.',
        statusCode: 503,
        shouldRetry: true,
      };
    }

    // Permission errors
    if (error.message.includes('RLS') || error.message.includes('permission')) {
      return {
        userMessage: 'You do not have permission to perform this action.',
        statusCode: 403,
        shouldRetry: false,
      };
    }

    return {
      userMessage: 'An unexpected error occurred. Please try again.',
      statusCode: 500,
      shouldRetry: true,
    };
  }

  handleBuildTimeError(error: Error, context: ErrorContext = {}): void {
    // Special handling for build-time errors
    this.logError(new ProductionError(
      `Build-time error: ${error.message}`,
      'BUILD_TIME_ERROR',
      { ...context, isBuildTime: true }
    ));

    // Don't throw during build time - log and continue
    console.warn('Build-time error handled gracefully:', error.message);
  }

  getRecentErrors(limit: number = 10): ProductionError[] {
    return this.errorLog.slice(-limit);
  }

  getErrorStats(): {
    total: number;
    byCode: Record<string, number>;
    byComponent: Record<string, number>;
    last24Hours: number;
  } {
    const now = Date.now();
    const last24Hours = this.errorLog.filter(
      error => now - error.timestamp.getTime() < 24 * 60 * 60 * 1000
    ).length;

    const byCode: Record<string, number> = {};
    const byComponent: Record<string, number> = {};

    this.errorLog.forEach(error => {
      byCode[error.code] = (byCode[error.code] || 0) + 1;
      const component = error.context.component || 'unknown';
      byComponent[component] = (byComponent[component] || 0) + 1;
    });

    return {
      total: this.errorLog.length,
      byCode,
      byComponent,
      last24Hours,
    };
  }
}

// Global error handler for unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    ErrorHandler.getInstance().logError(event.error, {
      component: 'global',
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.getInstance().logError(new Error(event.reason), {
      component: 'promise',
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  });
}

export const errorHandler = ErrorHandler.getInstance();