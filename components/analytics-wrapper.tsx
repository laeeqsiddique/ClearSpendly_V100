"use client";

import { ReactNode, useEffect, useState } from "react";
import Script from "next/script";

interface AnalyticsConfig {
  googleAnalyticsId?: string;
  enabled?: boolean;
  debug?: boolean;
}

interface AnalyticsWrapperProps {
  children: ReactNode;
  config?: AnalyticsConfig;
}

// Global analytics interface for type safety
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

// Default configuration
const defaultConfig: AnalyticsConfig = {
  enabled: typeof window !== 'undefined' && process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID,
};

export function AnalyticsWrapper({ children, config = {} }: AnalyticsWrapperProps) {
  const [analyticsConfig] = useState<AnalyticsConfig>({ ...defaultConfig, ...config });
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const shouldLoadAnalytics = analyticsConfig.enabled && 
                              analyticsConfig.googleAnalyticsId && 
                              typeof window !== 'undefined';

  // Initialize Google Analytics
  const initializeGA = () => {
    if (!window.gtag || !analyticsConfig.googleAnalyticsId) return;

    try {
      window.gtag('config', analyticsConfig.googleAnalyticsId, {
        page_title: document.title,
        page_location: window.location.href,
      });

      if (analyticsConfig.debug) {
        console.log('Analytics initialized successfully');
      }
      
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to initialize Google Analytics:', error);
      setHasError(true);
    }
  };

  // Track page views
  const trackPageView = (url: string, title?: string) => {
    if (!window.gtag || hasError) return;

    try {
      window.gtag('config', analyticsConfig.googleAnalyticsId!, {
        page_title: title || document.title,
        page_location: url,
      });

      if (analyticsConfig.debug) {
        console.log('Page view tracked:', url);
      }
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  };

  // Track custom events
  const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
    if (!window.gtag || hasError) return;

    try {
      window.gtag('event', eventName, {
        custom_parameter: true,
        ...parameters,
      });

      if (analyticsConfig.debug) {
        console.log('Event tracked:', eventName, parameters);
      }
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  };

  // Handle script load error
  const handleScriptError = () => {
    console.warn('Analytics script failed to load - continuing without analytics');
    setHasError(true);
  };

  // Track navigation changes
  useEffect(() => {
    if (!isLoaded || hasError) return;

    const handleRouteChange = () => {
      trackPageView(window.location.href, document.title);
    };

    // Listen for navigation changes (for SPA routing)
    let observer: MutationObserver;
    
    if (typeof window !== 'undefined') {
      observer = new MutationObserver(() => {
        if (document.title !== window.document.title) {
          handleRouteChange();
        }
      });

      observer.observe(document.querySelector('title') || document.head, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [isLoaded, hasError]);

  // Make analytics functions available globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).analytics = {
        trackPageView,
        trackEvent,
        isLoaded,
        hasError,
      };
    }
  }, [isLoaded, hasError]);

  return (
    <>
      {shouldLoadAnalytics && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.googleAnalyticsId}`}
            strategy="afterInteractive"
            onLoad={() => {
              window.dataLayer = window.dataLayer || [];
              window.gtag = function gtag() {
                window.dataLayer!.push(arguments);
              };
              window.gtag('js', new Date());
              initializeGA();
            }}
            onError={handleScriptError}
          />
        </>
      )}
      {children}
    </>
  );
}

// Hook for using analytics in components
export function useAnalytics() {
  const [analytics, setAnalytics] = useState<{
    trackPageView: (url: string, title?: string) => void;
    trackEvent: (eventName: string, parameters?: Record<string, any>) => void;
    isLoaded: boolean;
    hasError: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).analytics) {
      setAnalytics((window as any).analytics);
    } else {
      // Provide fallback functions if analytics isn't available
      setAnalytics({
        trackPageView: () => {},
        trackEvent: () => {},
        isLoaded: false,
        hasError: true,
      });
    }
  }, []);

  return analytics;
}

// Higher-order component for automatic event tracking
export function withAnalytics<T extends object>(
  Component: React.ComponentType<T>,
  eventName?: string
) {
  return function AnalyticsEnhancedComponent(props: T) {
    const analytics = useAnalytics();

    useEffect(() => {
      if (analytics && eventName) {
        analytics.trackEvent(`component_mounted_${eventName}`, {
          component: Component.name || 'Unknown',
        });
      }
    }, [analytics]);

    return <Component {...props} />;
  };
}

// Analytics event helpers
export const analyticsEvents = {
  // Authentication events
  signInAttempt: (method: 'email' | 'google') => ({
    event: 'sign_in_attempt',
    method,
  }),
  
  signInSuccess: (method: 'email' | 'google') => ({
    event: 'sign_in_success',
    method,
  }),
  
  signInError: (method: 'email' | 'google', error: string) => ({
    event: 'sign_in_error',
    method,
    error_message: error,
  }),

  signUpAttempt: (method: 'email' | 'google') => ({
    event: 'sign_up_attempt',
    method,
  }),

  // Feature usage events
  receiptUpload: (success: boolean) => ({
    event: 'receipt_upload',
    success,
  }),

  dashboardView: () => ({
    event: 'dashboard_view',
  }),

  // Error events
  errorEncountered: (error: string, context?: string) => ({
    event: 'error_encountered',
    error_message: error,
    context,
  }),
};

// Convenience function for common tracking scenarios
export function trackUserAction(actionName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.trackEvent(actionName, properties);
  }
}