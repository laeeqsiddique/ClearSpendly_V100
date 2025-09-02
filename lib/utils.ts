import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency with proper comma separation and currency symbol
 */
export const formatCurrency = (amount: number, options?: {
  showCents?: boolean;
  currency?: string;
}): string => {
  const { showCents = true, currency = 'USD' } = options || {};
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount);
};

/**
 * Format numbers with proper comma separation (no currency symbol)
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};
