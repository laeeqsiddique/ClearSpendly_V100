import { NextRequest, NextResponse } from 'next/server'
import { serverStorage, BucketName } from '@/lib/storage/supabase-storage'
import { getTenantIdWithFallback } from '@/lib/api-tenant'
import { withPermission } from '@/lib/api-middleware'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  return withPermission('files:delete')(req, async (request, context) => {
    try {
      const { bucket, path } = await request.json()
      
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

      // Delete file
      await serverStorage.deleteFile(bucket as BucketName, path)

      return NextResponse.json({
        success: true,
        message: 'File deleted successfully'
      })

    } catch (error: any) {
      console.error('File deletion error:', error)
      return NextResponse.json(
        { error: error.message || 'Deletion failed' },
        { status: 500 }
      )
    }
  })
}