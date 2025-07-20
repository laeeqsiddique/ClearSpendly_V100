"use client";

import { createClient } from "@/lib/supabase/client";

export async function getIRSRate(year?: number): Promise<number> {
  const supabase = createClient();
  const targetYear = year || new Date().getFullYear();
  
  try {
    // Get user and tenant info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user found");

    const { data: membership } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) throw new Error("No tenant found");

    // First try to get the rate for the specific year and tenant
    let { data, error } = await supabase
      .from('irs_mileage_rate')
      .select('rate')
      .eq('tenant_id', membership.tenant_id)
      .eq('year', targetYear)
      .single();
      
    if (data && !error) {
      return data.rate;
    }
    
    // If no rate found for the year, get the most recent rate for this tenant
    ({ data, error } = await supabase
      .from('irs_mileage_rate')
      .select('rate')
      .eq('tenant_id', membership.tenant_id)
      .order('year', { ascending: false })
      .limit(1)
      .single());
      
    if (data && !error) {
      return data.rate;
    }
    
    // Fallback to 2024 rate
    return 0.655;
  } catch (error) {
    console.error('Error fetching IRS rate:', error);
    return 0.655; // Fallback to 2024 rate
  }
}

// Cache for the current year's rate to reduce database queries
let cachedRate: { year: number; rate: number } | null = null;

export async function getCurrentIRSRate(): Promise<number> {
  const currentYear = new Date().getFullYear();
  
  if (cachedRate && cachedRate.year === currentYear) {
    return cachedRate.rate;
  }
  
  const rate = await getIRSRate(currentYear);
  cachedRate = { year: currentYear, rate };
  return rate;
}

export function formatIRSRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}¢`;
}