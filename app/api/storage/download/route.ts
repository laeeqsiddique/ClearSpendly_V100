import { NextRequest, NextResponse } from 'next/server'
import { serverStorage, BucketName } from '@/lib/storage/supabase-storage'
import { getTenantIdWithFallback } from '@/lib/api-tenant'
import { withPermission } from '@/lib/api-middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withPermission('files:read')(req, async (request, context) => {
    try {
      const { searchParams } = new URL(request.url)
      
      const bucket = searchParams.get('bucket') as BucketName
      const path = searchParams.get('path')
      const expiresIn = parseInt(searchParams.get('expiresIn') || '3600')
      
      // Validation
      if (!bucket || !path) {
        return NextResponse.json({ error: 'Bucket and path required' }, { status: 400 })
      }
      
      if (!['receipts', 'invoices', 'profiles', 'logos'].includes(bucket)) {
        return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
      }

      // Get tenant ID and verify access
      const tenantId = await getTenantIdWithFallback()
      if (!tenantId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      // Ensure path starts with tenant ID for security
      if (!path.startsWith(tenantId + '/')) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      // Generate signed URL
      const signedUrl = await serverStorage.getSignedUrl(bucket, path, expiresIn)

      return NextResponse.json({
        success: true,
        data: {
          signedUrl,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
        }
      })

    } catch (error: any) {
      console.error('File download error:', error)
      return NextResponse.json(
        { error: error.message || 'Download failed' },
        { status: 500 }
      )
    }
  })
}