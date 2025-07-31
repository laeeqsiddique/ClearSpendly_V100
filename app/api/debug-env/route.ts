import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Check for debug authorization
  const url = new URL(request.url);
  const debugKey = url.searchParams.get('key');
  const isAuthorized = process.env.NODE_ENV === 'development' || 
    (process.env.DEBUG_KEY && debugKey === process.env.DEBUG_KEY);
  
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const envInfo = {
    runtime: {
      nodeEnv: process.env.NODE_ENV,
      isRailway: !!process.env.RAILWAY_ENVIRONMENT,
      railwayEnv: process.env.RAILWAY_ENVIRONMENT || 'not set',
      isProduction: process.env.NODE_ENV === 'production',
    },
    supabase: {
      urlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKeySet: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      // Show first few chars of URL for debugging (safe to expose)
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'not set',
    },
    nextPublicVars: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .reduce((acc, key) => {
        acc[key] = process.env[key] ? 'set' : 'not set';
        return acc;
      }, {} as Record<string, string>),
    aiOcr: {
      ENABLE_AI_OCR_ENHANCEMENT: process.env.ENABLE_AI_OCR_ENHANCEMENT,
      LLM_PROVIDER: process.env.LLM_PROVIDER,
      LLM_MODEL: process.env.LLM_MODEL,
      LLM_API_URL: process.env.LLM_API_URL,
    },
    buildTime: {
      isBuildTime: process.env.BUILDING === 'true',
      buildingFlag: process.env.BUILDING || 'not set',
    },
    deployment: {
      port: process.env.PORT || '3000',
      hostname: process.env.HOSTNAME || 'not set',
    }
  };

  return NextResponse.json(envInfo, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}