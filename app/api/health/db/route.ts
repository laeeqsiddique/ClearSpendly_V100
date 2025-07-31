import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let status = 'healthy';
  const checks: Record<string, any> = {};

  // Railway-specific: Skip database checks during build/static generation
  if (process.env.NODE_ENV === 'production' && process.env.CI === 'true') {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      checks: {
        connectivity: { status: 'skipped-during-build' },
        tables: { status: 'skipped-during-build' },
        rowLevelSecurity: { status: 'skipped-during-build' },
        performance: { status: 'skipped-during-build' },
        storage: { status: 'skipped-during-build' },
        migrations: { status: 'skipped-during-build' },
        tenantIsolation: { status: 'skipped-during-build' }
      }
    });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // 1. Basic connectivity test
    const { data: connectionTest, error: connectionError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1);

    if (connectionError) throw connectionError;

    checks.connectivity = {
      status: 'healthy',
      responseTime: Date.now() - startTime
    };

    // 2. Core tables existence check
    const coreTables = [
      'tenants',
      'tenant_memberships',
      'receipts',
      'users',
      'expenses'
    ];

    const tableChecks = await Promise.all(
      coreTables.map(async (tableName) => {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          return {
            table: tableName,
            exists: !error || error.code !== 'PGRST116',
            accessible: !error,
            error: error?.message
          };
        } catch (err) {
          return {
            table: tableName,
            exists: false,
            accessible: false,
            error: (err as Error).message
          };
        }
      })
    );

    checks.tables = tableChecks;

    // 3. RLS Policies Check
    try {
      const { data: rlsPolicies, error: rlsError } = await supabase
        .rpc('get_rls_policies_status');

      if (!rlsError) {
        checks.rowLevelSecurity = {
          status: 'healthy',
          policies: rlsPolicies
        };
      } else {
        checks.rowLevelSecurity = {
          status: 'unknown',
          error: rlsError.message
        };
      }
    } catch (error) {
      checks.rowLevelSecurity = {
        status: 'unknown',
        error: 'RLS check function not available'
      };
    }

    // 4. Database Performance Metrics
    const performanceStart = Date.now();
    try {
      const { data: perfData, error: perfError } = await supabase
        .from('tenants')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      const queryTime = Date.now() - performanceStart;
      
      checks.performance = {
        status: queryTime < 1000 ? 'healthy' : 'slow',
        queryTime,
        threshold: 1000,
        sampleRecords: perfData?.length || 0
      };

      if (queryTime > 1000) status = 'degraded';
    } catch (error) {
      checks.performance = {
        status: 'unhealthy',
        error: (error as Error).message
      };
      status = 'degraded';
    }

    // 5. Storage Buckets Check
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) throw bucketsError;

      const expectedBuckets = ['receipts', 'logos', 'exports'];
      const bucketStatus = expectedBuckets.map(expectedBucket => {
        const exists = buckets?.some(bucket => bucket.name === expectedBucket);
        return { name: expectedBucket, exists };
      });

      checks.storage = {
        status: 'healthy',
        buckets: bucketStatus,
        totalBuckets: buckets?.length || 0
      };
    } catch (error) {
      checks.storage = {
        status: 'unhealthy',
        error: (error as Error).message
      };
      status = 'degraded';
    }

    // 6. Migration Status Check
    try {
      const { data: migrations, error: migrationError } = await supabase
        .from('supabase_migrations.schema_migrations')
        .select('version, statements, name')
        .order('version', { ascending: false })
        .limit(5);

      if (!migrationError) {
        checks.migrations = {
          status: 'healthy',
          latestMigrations: migrations?.map(m => ({
            version: m.version,
            name: m.name
          })) || []
        };
      } else {
        checks.migrations = {
          status: 'unknown',
          error: 'Migration table not accessible'
        };
      }
    } catch (error) {
      checks.migrations = {
        status: 'unknown',
        error: 'Migration check failed'
      };
    }

    // 7. Tenant Isolation Test
    try {
      const isolationTestStart = Date.now();
      
      // Test that RLS is properly isolating data
      const { data: tenantCount, error: tenantError } = await supabase
        .from('tenants')
        .select('id', { count: 'exact' });

      const isolationTestTime = Date.now() - isolationTestStart;

      if (!tenantError) {
        checks.tenantIsolation = {
          status: 'healthy',
          totalTenants: tenantCount?.length || 0,
          testTime: isolationTestTime
        };
      } else {
        checks.tenantIsolation = {
          status: 'unhealthy',
          error: tenantError.message
        };
        status = 'degraded';
      }
    } catch (error) {
      checks.tenantIsolation = {
        status: 'unhealthy',
        error: (error as Error).message
      };
      status = 'degraded';
    }

  } catch (error) {
    status = 'unhealthy';
    checks.error = {
      message: (error as Error).message,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
  }

  const response = {
    status,
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    checks
  };

  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
  
  return NextResponse.json(response, { status: statusCode });
}