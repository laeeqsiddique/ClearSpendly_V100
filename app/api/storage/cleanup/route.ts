import { NextRequest, NextResponse } from 'next/server'
import { serverStorage } from '@/lib/storage/supabase-storage'
import { getTenantIdWithFallback } from '@/lib/api-tenant'
import { withPermission } from '@/lib/api-middleware'

export const dynamic = 'force-dynamic'

// This endpoint should be restricted to admin users or automated cleanup jobs
export async function POST(req: NextRequest) {
  return withPermission('admin:files')(req, async (request, context) => {
    try {
      const { olderThanDays = 90, buckets = ['receipts', 'invoices'] } = await request.json()

      // Get tenant ID
      const tenantId = await getTenantIdWithFallback()
      if (!tenantId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      // Validate olderThanDays (minimum 30 days for safety)
      if (olderThanDays < 30) {
        return NextResponse.json({ error: 'Minimum cleanup age is 30 days' }, { status: 400 })
      }

      // Perform cleanup
      const result = await serverStorage.cleanupOldFiles(tenantId, olderThanDays, buckets)

      return NextResponse.json({
        success: true,
        data: {
          deletedCount: result.deletedCount,
          errors: result.errors,
          message: `Cleaned up ${result.deletedCount} files older than ${olderThanDays} days`
        }
      })

    } catch (error: any) {
      console.error('File cleanup error:', error)
      return NextResponse.json(
        { error: error.message || 'Cleanup failed' },
        { status: 500 }
      )
    }
  })
}