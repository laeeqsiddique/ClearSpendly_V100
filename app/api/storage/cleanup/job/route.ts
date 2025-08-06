import { NextRequest, NextResponse } from 'next/server'
import { serverStorage } from '@/lib/storage/supabase-storage'
import { createClient } from "@supabase/supabase-js"

export const dynamic = 'force-dynamic'

// This endpoint should be called by a cron job or scheduled task
export async function POST(req: NextRequest) {
  try {
    // Verify this is an authorized cleanup request
    const authHeader = req.headers.get('authorization')
    const expectedToken = process.env.CLEANUP_JOB_TOKEN
    
    if (!expectedToken) {
      console.warn('CLEANUP_JOB_TOKEN not configured - cleanup job disabled for security')
      return NextResponse.json({ error: 'Cleanup job not configured' }, { status: 501 })
    }
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      olderThanDays = 90, 
      buckets = ['receipts', 'invoices'],
      dryRun = false,
      maxDeletes = 1000 
    } = await req.json().catch(() => ({}))

    console.log('🧹 Starting storage cleanup job:', {
      olderThanDays,
      buckets,
      dryRun,
      maxDeletes
    })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    let totalProcessed = 0
    let totalDeleted = 0
    const errors: any[] = []
    const results: any[] = []

    // Process cleanup queue first (orphaned files)
    const { data: queueItems, error: queueError } = await supabase
      .from('storage_cleanup_queue')
      .select('*')
      .eq('processed', false)
      .limit(maxDeletes)
      .order('created_at', { ascending: true })

    if (queueError) {
      console.error('Error fetching cleanup queue:', queueError)
    } else if (queueItems && queueItems.length > 0) {
      console.log(`📋 Processing ${queueItems.length} queued cleanup items`)
      
      for (const item of queueItems) {
        try {
          totalProcessed++
          
          if (!dryRun) {
            // Actually delete the file
            await serverStorage.deleteFile(item.bucket_name as any, item.file_path)
            
            // Mark as processed
            await supabase
              .from('storage_cleanup_queue')
              .update({ 
                processed: true, 
                processed_at: new Date().toISOString() 
              })
              .eq('id', item.id)
            
            totalDeleted++
            console.log(`✅ Deleted queued file: ${item.bucket_name}/${item.file_path}`)
          } else {
            console.log(`🔍 Would delete queued file: ${item.bucket_name}/${item.file_path}`)
          }
        } catch (error) {
          console.error(`❌ Failed to delete queued file ${item.file_path}:`, error)
          
          if (!dryRun) {
            // Mark as processed with error
            await supabase
              .from('storage_cleanup_queue')
              .update({ 
                processed: true, 
                processed_at: new Date().toISOString(),
                error_message: error instanceof Error ? error.message : 'Unknown error'
              })
              .eq('id', item.id)
          }
          
          errors.push({ file: item.file_path, error: error instanceof Error ? error.message : 'Unknown error' })
        }
      }

      results.push({
        type: 'cleanup_queue',
        processed: queueItems.length,
        deleted: dryRun ? 0 : totalDeleted
      })
    }

    // Now process tenant-specific cleanup for old files
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    
    // Get all tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenant')
      .select('id')
      .limit(100) // Process max 100 tenants per run

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError)
      errors.push({ error: 'Failed to fetch tenants', details: tenantsError })
    } else if (tenants) {
      console.log(`🏢 Processing cleanup for ${tenants.length} tenants`)
      
      for (const tenant of tenants) {
        if (totalProcessed >= maxDeletes) {
          console.log(`⏹️ Reached max deletes limit of ${maxDeletes}`)
          break
        }

        try {
          const remainingDeletes = maxDeletes - totalProcessed
          const tenantResult = await serverStorage.cleanupOldFiles(
            tenant.id,
            olderThanDays,
            buckets as any,
            remainingDeletes,
            dryRun
          )

          totalProcessed += tenantResult.deletedCount
          if (!dryRun) {
            totalDeleted += tenantResult.deletedCount
          }

          if (tenantResult.deletedCount > 0) {
            console.log(`🗑️ Tenant ${tenant.id}: ${dryRun ? 'would delete' : 'deleted'} ${tenantResult.deletedCount} old files`)
          }

          if (tenantResult.errors.length > 0) {
            errors.push(...tenantResult.errors)
          }

          results.push({
            type: 'tenant_cleanup',
            tenant_id: tenant.id,
            processed: tenantResult.deletedCount,
            errors: tenantResult.errors.length
          })
        } catch (error) {
          console.error(`❌ Failed to cleanup tenant ${tenant.id}:`, error)
          errors.push({ 
            tenant: tenant.id, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }
    }

    const summary = {
      success: true,
      dryRun,
      totalProcessed,
      totalDeleted: dryRun ? 0 : totalDeleted,
      errors: errors.length,
      details: {
        olderThanDays,
        bucketsProcessed: buckets,
        maxDeletes,
        tenantsProcessed: tenants?.length || 0,
        results,
        errors: errors.slice(0, 10) // Limit error details to prevent huge responses
      }
    }

    console.log('🧹 Cleanup job completed:', summary)

    return NextResponse.json(summary)

  } catch (error: any) {
    console.error('❌ Cleanup job failed:', error)
    return NextResponse.json(
      { 
        error: 'Cleanup job failed', 
        details: error.message,
        success: false 
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Check cleanup queue status
    const { data: queueStats, error } = await supabase
      .from('storage_cleanup_queue')
      .select('processed')
      .limit(1000)

    if (error) {
      throw error
    }

    const unprocessed = queueStats?.filter(item => !item.processed).length || 0
    const processed = queueStats?.filter(item => item.processed).length || 0

    return NextResponse.json({
      status: 'healthy',
      cleanup_queue: {
        unprocessed,
        processed,
        total: queueStats?.length || 0
      },
      last_check: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error.message,
        last_check: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}