/**
 * Get the correct application URL for OAuth redirects
 * This ensures we use the right URL in production vs development
 */
export function getAppUrl(): string {
  // Always use NEXT_PUBLIC_APP_URL if it's set (for production)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // For Railway environment, hardcode the production URL since env vars aren't reliable
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
    return 'https://www.flowvya.com';
  }
  
  // In development or client-side, use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Final fallback for server-side rendering in development
  return 'http://localhost:3000';
}

/**
 * Get the OAuth callback URL
 */
export function getOAuthCallbackUrl(returnTo?: string): string {
  const appUrl = getAppUrl();
  const callbackPath = '/auth/callback';
  const returnPath = returnTo || '/onboarding';
  
  return `${appUrl}${callbackPath}?returnTo=${encodeURIComponent(returnPath)}`;
}