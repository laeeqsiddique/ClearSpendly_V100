/**
 * Admin API endpoint to migrate existing tenants to the new comprehensive setup
 * This should be run after deploying the new tenant setup system
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TenantSetupService } from "@/lib/tenant-setup/tenant-setup-service";

export async function POST() {
  const startTime = Date.now();
  
  try {
    const adminSupabase = createAdminClient();
    const setupService = new TenantSetupService();
    
    console.log("Starting migration of existing tenants...");
    
    // Get all existing tenants that haven't been through the new setup
    const { data: existingTenants, error: tenantError } = await adminSupabase
      .from('tenant')
      .select(`
        id,
        name,
        slug,
        subscription_plan,
        created_at,
        membership!inner(
          user_id,
          role
        )
      `)
      .eq('membership.role', 'owner')
      .order('created_at', { ascending: true });
    
    if (tenantError) {
      console.error("Failed to fetch existing tenants:", tenantError);
      return NextResponse.json(
        { error: "Failed to fetch existing tenants" },
        { status: 500 }
      );
    }

    console.log(`Found ${existingTenants?.length || 0} existing tenants to migrate`);
    
    const migrationResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const tenant of existingTenants || []) {
      const tenantId = tenant.id;
      const userId = tenant.membership[0]?.user_id;
      
      if (!userId) {
        console.warn(`Skipping tenant ${tenantId}: No owner found`);
        migrationResults.push({
          tenantId,
          tenantName: tenant.name,
          success: false,
          error: "No owner found"
        });
        errorCount++;
        continue;
      }

      try {
        console.log(`Migrating tenant: ${tenant.name} (${tenantId})`);
        
        // Check if tenant already has setup completed
        const alreadySetup = await setupService.checkTenantSetupStatus(tenantId);
        
        if (alreadySetup) {
          console.log(`Tenant ${tenant.name} already has setup completed, skipping...`);
          migrationResults.push({
            tenantId,
            tenantName: tenant.name,
            success: true,
            message: "Already setup",
            skipped: true
          });
          successCount++;
          continue;
        }

        // Add missing components to the tenant
        const migrationResult = await setupService.addMissingComponents(tenantId, userId);
        
        if (migrationResult.success) {
          console.log(`✓ Successfully migrated tenant: ${tenant.name}`);
          successCount++;
        } else {
          console.error(`✗ Failed to migrate tenant: ${tenant.name}`, migrationResult.errors);
          errorCount++;
        }
        
        migrationResults.push({
          tenantId,
          tenantName: tenant.name,
          success: migrationResult.success,
          message: migrationResult.message,
          data: migrationResult.data,
          errors: migrationResult.errors
        });

      } catch (error) {
        console.error(`Error migrating tenant ${tenant.name}:`, error);
        errorCount++;
        
        migrationResults.push({
          tenantId,
          tenantName: tenant.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    const migrationTime = Date.now() - startTime;
    
    console.log(`Migration completed in ${migrationTime}ms: ${successCount} successful, ${errorCount} failed`);
    
    // Log migration completion
    try {
      await adminSupabase
        .from('migration_log')
        .insert({
          migration_type: 'tenant_setup_migration',
          migration_version: '1.0.0',
          tenants_processed: existingTenants?.length || 0,
          successful_migrations: successCount,
          failed_migrations: errorCount,
          migration_time_ms: migrationTime,
          migration_data: migrationResults
        });
    } catch (logError) {
      console.error("Failed to log migration:", logError);
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${successCount} successful, ${errorCount} failed`,
      data: {
        totalTenants: existingTenants?.length || 0,
        successfulMigrations: successCount,
        failedMigrations: errorCount,
        migrationTimeMs: migrationTime,
        results: migrationResults
      }
    });

  } catch (error) {
    const migrationTime = Date.now() - startTime;
    console.error("Critical error during tenant migration:", error);
    
    return NextResponse.json(
      { 
        error: "Critical error during tenant migration",
        details: error instanceof Error ? error.message : 'Unknown error',
        migrationTimeMs: migrationTime
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check migration status
export async function GET() {
  try {
    const adminSupabase = createAdminClient();
    const setupService = new TenantSetupService();
    
    // Get total tenant count
    const { count: totalTenants } = await adminSupabase
      .from('tenant')
      .select('*', { count: 'exact', head: true });
    
    // Get tenants with completed setup
    const { count: setupTenants } = await adminSupabase
      .from('tenant_setup_log')
      .select('*', { count: 'exact', head: true });
    
    // Get recent migration logs
    const { data: migrationLogs } = await adminSupabase
      .from('migration_log')
      .select('*')
      .eq('migration_type', 'tenant_setup_migration')
      .order('created_at', { ascending: false })
      .limit(5);
    
    return NextResponse.json({
      success: true,
      data: {
        totalTenants: totalTenants || 0,
        tenantsWithSetup: setupTenants || 0,
        migrationProgress: totalTenants ? Math.round(((setupTenants || 0) / totalTenants) * 100) : 0,
        recentMigrations: migrationLogs || []
      }
    });

  } catch (error) {
    console.error("Error checking migration status:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to check migration status",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}