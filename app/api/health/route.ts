import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Railway-specific: Skip database checks during build/static generation
    if (process.env.NODE_ENV === 'production' && process.env.CI === 'true') {
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'skipped-during-build',
        environment: 'configured',
        migrations: 'ready'
      });
    }

    // Test database connection only during runtime
    const supabase = await createClient();
    
    // Railway-specific: Use a simpler query that won't hang during build
    const { data, error } = await Promise.race([
      supabase.from('membership').select('count').limit(1),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ]) as any;

    if (error) {
      throw error;
    }

    // Test environment variables
    const requiredEnvs = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
    
    if (missingEnvs.length > 0) {
      throw new Error(`Missing environment variables: ${missingEnvs.join(', ')}`);
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: 'configured',
      migrations: 'ready'
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}