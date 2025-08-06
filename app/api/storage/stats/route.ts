import { NextRequest, NextResponse } from 'next/server'
import { serverStorage } from '@/lib/storage/supabase-storage'
import { getTenantIdWithFallback } from '@/lib/api-tenant'
import { withPermission } from '@/lib/api-middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withPermission('files:read')(req, async (request, context) => {
    try {
      // Get tenant ID
      const tenantId = await getTenantIdWithFallback()
      if (!tenantId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      // Get storage statistics
      const stats = await serverStorage.getStorageStats(tenantId)

      // Also get storage limits check (default to free tier if not specified)
      const { searchParams } = new URL(request.url)
      const subscriptionTier = searchParams.get('tier') as 'free' | 'basic' | 'premium' | 'enterprise' || 'free'
      
      const limitsCheck = await serverStorage.checkStorageLimits(tenantId, subscriptionTier)

      return NextResponse.json({
        success: true,
        data: {
          ...stats,
          limits: limitsCheck,
          usage: {
            storagePercentage: (stats.totalSize / limitsCheck.limits.totalStorage) * 100,
            filesPercentage: (stats.fileCount / limitsCheck.limits.maxFiles) * 100
          }
        }
      })

    } catch (error: any) {
      console.error('Storage stats error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to get storage stats' },
        { status: 500 }
      )
    }
  })
}