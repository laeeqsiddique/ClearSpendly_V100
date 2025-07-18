import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Simple Levenshtein distance calculation for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  const n = str1.length;
  const m = str2.length;

  if (n === 0) return m;
  if (m === 0) return n;

  for (let i = 0; i <= m; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[m][n];
}

// Calculate similarity score (0-1, where 1 is identical)
function calculateSimilarity(str1: string, str2: string): number {
  const normalizedStr1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedStr2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (normalizedStr1 === normalizedStr2) return 1;
  
  const maxLength = Math.max(normalizedStr1.length, normalizedStr2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(normalizedStr1, normalizedStr2);
  return (maxLength - distance) / maxLength;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    
    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // For now, use default tenant ID until auth is fully set up
    const defaultTenantId = '00000000-0000-0000-0000-000000000001';

    // Get all vendors for this tenant
    const { data: vendors, error } = await supabase
      .from('vendor')
      .select('id, name, normalized_name, category')
      .eq('tenant_id', defaultTenantId);

    if (error) {
      console.error('Error fetching vendors:', error);
      throw error;
    }

    // Calculate similarity scores and filter
    const suggestions = (vendors || [])
      .map(vendor => ({
        ...vendor,
        similarity: calculateSimilarity(query, vendor.name)
      }))
      .filter(vendor => vendor.similarity > 0.4) // Only show if >40% similar
      .sort((a, b) => b.similarity - a.similarity) // Sort by similarity
      .slice(0, 5) // Limit to top 5 suggestions
      .map(({ similarity, ...vendor }) => ({
        ...vendor,
        matchType: similarity > 0.8 ? 'exact' : similarity > 0.6 ? 'close' : 'similar'
      }));

    return NextResponse.json({ success: true, data: suggestions });
  } catch (error) {
    console.error("Vendor suggestions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor suggestions" },
      { status: 500 }
    );
  }
}