// Auth helper utilities for handling OAuth redirects

export function getOAuthRedirectUrl(returnTo?: string): string {
  // For Railway deployments, use the actual domain
  const isRailwayDeployment = typeof window !== 'undefined' && 
    window.location.hostname.includes('railway.app');
  
  // Use actual window origin for OAuth to work correctly
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || '';
  
  const callbackUrl = `${baseUrl}/auth/callback`;
  
  if (returnTo) {
    return `${callbackUrl}?returnTo=${encodeURIComponent(returnTo)}`;
  }
  
  return callbackUrl;
}

// Check if current domain is allowed for OAuth
export function isValidOAuthDomain(): boolean {
  if (typeof window === 'undefined') return true;
  
  const currentHost = window.location.hostname;
  const allowedHosts = [
    'localhost',
    'railway.app',
    'flowvya.com',
    'clearspendly.com',
  ];
  
  return allowedHosts.some(host => currentHost.includes(host));
}