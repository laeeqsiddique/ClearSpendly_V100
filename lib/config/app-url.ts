/**
 * Get the correct application URL for OAuth redirects
 * This ensures we use the right URL in production vs development
 */
export function getAppUrl(): string {
  // In production, use the configured app URL
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // In development or if not configured, use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback for server-side rendering
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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