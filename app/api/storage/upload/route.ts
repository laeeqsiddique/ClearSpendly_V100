import { NextRequest, NextResponse } from 'next/server'
import { serverStorage } from '@/lib/storage/supabase-storage'
import { getTenantIdWithFallback } from '@/lib/api-tenant'
import { withPermission } from '@/lib/api-middleware'

export const dynamic = 'force-dynamic'

// Define supported upload types
type UploadType = 'receipt' | 'invoice' | 'profile' | 'logo'

export async function POST(req: NextRequest) {
  return withPermission('files:upload')(req, async (request, context) => {
    try {
      const formData = await request.formData()
      
      const file = formData.get('file') as File
      const uploadType = formData.get('type') as UploadType
      const entityId = formData.get('entityId') as string // receipt ID, invoice ID, etc.
      const subscriptionTier = formData.get('subscriptionTier') as string || 'free'
      
      // Validation
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }
      
      if (!uploadType || !['receipt', 'invoice', 'profile', 'logo'].includes(uploadType)) {
        return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 })
      }

      // Get tenant ID
      const tenantId = await getTenantIdWithFallback()
      if (!tenantId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      // Upload file based on type
      let result
      switch (uploadType) {
        case 'receipt':
          if (!entityId) {
            return NextResponse.json({ error: 'Receipt ID required' }, { status: 400 })
          }
          result = await serverStorage.uploadReceiptImage(
            file,
            entityId,
            tenantId,
            subscriptionTier as any
          )
          break
          
        case 'invoice':
          if (!entityId) {
            return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })
          }
          result = await serverStorage.uploadInvoiceAttachment(
            file,
            entityId,
            tenantId,
            subscriptionTier as any
          )
          break
          
        case 'profile':
          if (!entityId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
          }
          result = await serverStorage.uploadProfileImage(
            file,
            entityId,
            tenantId,
            subscriptionTier as any
          )
          break
          
        case 'logo':
          const logoType = formData.get('logoType') as string || 'main'
          result = await serverStorage.uploadLogo(
            file,
            tenantId,
            logoType,
            subscriptionTier as any
          )
          break
          
        default:
          return NextResponse.json({ error: 'Unsupported upload type' }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: result
      })

    } catch (error: any) {
      console.error('File upload error:', error)
      return NextResponse.json(
        { error: error.message || 'Upload failed' },
        { status: 500 }
      )
    }
  })
}