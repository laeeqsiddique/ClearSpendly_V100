import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { compress } from 'image-conversion'
import { serverSubscriptionService } from '@/lib/subscription/subscription-service'

export interface StorageConfig {
  maxFileSize: number // in bytes
  allowedTypes: string[]
  compressionQuality: number
  maxDimensions?: { width: number; height: number }
}

export interface UploadResult {
  url: string
  publicUrl: string
  path: string
  metadata?: {
    size: number
    type: string
    compressed: boolean
    originalSize?: number
  }
}

export interface StorageError {
  code: string
  message: string
  details?: any
}

// Subscription tier limits
export const STORAGE_LIMITS = {
  free: {
    totalStorage: 100 * 1024 * 1024, // 100MB
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 50
  },
  basic: {
    totalStorage: 1024 * 1024 * 1024, // 1GB
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 500
  },
  premium: {
    totalStorage: 10 * 1024 * 1024 * 1024, // 10GB
    maxFileSize: 25 * 1024 * 1024, // 25MB
    maxFiles: 5000
  },
  enterprise: {
    totalStorage: 100 * 1024 * 1024 * 1024, // 100GB
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 50000
  }
} as const

// Bucket configurations
export const BUCKET_CONFIGS = {
  receipts: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
    compressionQuality: 0.8,
    maxDimensions: { width: 2048, height: 2048 }
  },
  invoices: {
    maxFileSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
    compressionQuality: 0.9,
    maxDimensions: { width: 2048, height: 2048 }
  },
  profiles: {
    maxFileSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    compressionQuality: 0.7,
    maxDimensions: { width: 512, height: 512 }
  },
  logos: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'],
    compressionQuality: 0.85,
    maxDimensions: { width: 1024, height: 1024 }
  }
} as const

export type BucketName = keyof typeof BUCKET_CONFIGS

class SupabaseStorageService {
  private supabase: any
  private isServer: boolean

  constructor(isServer = false) {
    this.isServer = isServer
    // Don't create client in constructor - create it lazily when needed
    this.supabase = null
  }

  private getSupabaseClient() {
    if (!this.supabase) {
      // Avoid creating client during build time
      if (process.env.NODE_ENV === 'production' && process.env.BUILDING === 'true' && !process.env.RAILWAY_ENVIRONMENT) {
        return this.createMockClient()
      }

      if (this.isServer) {
        // Server-side client with service role key
        this.supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        )
      } else {
        // Use the server client helper
        this.supabase = createServerClient()
      }
    }
    return this.supabase
  }

  private createMockClient() {
    return {
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: null }),
          download: async () => ({ data: null, error: null }),
          remove: async () => ({ data: null, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
          list: async () => ({ data: [], error: null })
        })
      }
    }
  }

  /**
   * Check if user has reached their storage limits using subscription service
   */
  async checkStorageLimits(tenantId: string, fileSize: number = 0): Promise<{
    canUpload: boolean
    totalUsed: number
    fileCount: number
    limits: any
    subscription: any
    error?: string
  }> {
    try {
      // Get current usage statistics
      const usage = await serverSubscriptionService.getTenantUsage(tenantId)
      
      // Check if the upload is allowed based on subscription
      const uploadCheck = await serverSubscriptionService.canUploadFile(
        tenantId,
        fileSize,
        usage.storageUsed,
        usage.fileCount
      )

      return {
        canUpload: uploadCheck.allowed,
        totalUsed: usage.storageUsed,
        fileCount: usage.fileCount,
        limits: uploadCheck.subscription?.tier,
        subscription: uploadCheck.subscription,
        error: uploadCheck.reason
      }
    } catch (error) {
      console.error('Storage limit check failed:', error)
      return {
        canUpload: true, // Allow upload on error to not block users
        totalUsed: 0,
        fileCount: 0,
        limits: STORAGE_LIMITS['free'],
        subscription: null,
        error: 'Unable to check storage limits'
      }
    }
  }

  /**
   * Compress image if needed
   */
  private async compressImage(
    file: File | Blob,
    config: StorageConfig
  ): Promise<{ compressedFile: File | Blob; compressed: boolean; originalSize: number }> {
    const originalSize = file.size
    
    // Skip compression for PDFs and SVGs
    if (file.type === 'application/pdf' || file.type === 'image/svg+xml') {
      return { compressedFile: file, compressed: false, originalSize }
    }

    // Only compress if file is larger than 1MB or dimensions might be large
    if (file.size < 1024 * 1024) {
      return { compressedFile: file, compressed: false, originalSize }
    }

    try {
      // Convert File/Blob to compression format
      const compressedBlob = await compress(file, {
        quality: config.compressionQuality,
        type: file.type as any,
        width: config.maxDimensions?.width,
        height: config.maxDimensions?.height,
      })

      // Convert back to File if original was File
      if (file instanceof File) {
        const compressedFile = new File([compressedBlob], file.name, {
          type: file.type,
          lastModified: file.lastModified
        })
        return { 
          compressedFile, 
          compressed: compressedFile.size < originalSize,
          originalSize 
        }
      }

      return { 
        compressedFile: compressedBlob, 
        compressed: compressedBlob.size < originalSize,
        originalSize 
      }
    } catch (error) {
      console.warn('Image compression failed, using original:', error)
      return { compressedFile: file, compressed: false, originalSize }
    }
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    bucket: BucketName,
    file: File | Blob,
    path: string,
    tenantId: string,
    subscriptionTier: keyof typeof STORAGE_LIMITS = 'free'
  ): Promise<UploadResult> {
    try {
      const config = BUCKET_CONFIGS[bucket]
      
      // Validate file type
      if (!config.allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} not allowed for ${bucket}`)
      }

      // Check storage limits before upload
      const limitsCheck = await this.checkStorageLimits(tenantId, file.size)
      if (!limitsCheck.canUpload) {
        throw new Error(limitsCheck.error || 'Storage limit exceeded')
      }

      // Validate file size against bucket limits
      if (file.size > config.maxFileSize) {
        throw new Error(`File size exceeds limit of ${Math.round(config.maxFileSize / 1024 / 1024)}MB`)
      }

      // Additional validation against subscription limits (belt and suspenders)
      if (limitsCheck.limits && file.size > (limitsCheck.limits.max_file_size_mb * 1024 * 1024)) {
        throw new Error(`File size exceeds subscription limit of ${limitsCheck.limits.max_file_size_mb}MB`)
      }

      // Compress image if needed
      const { compressedFile, compressed, originalSize } = await this.compressImage(file, config)
      
      // Create full path with tenant isolation
      const fullPath = `${tenantId}/${path}`
      
      // Upload to Supabase Storage
      const { data, error } = await this.getSupabaseClient().storage
        .from(bucket)
        .upload(fullPath, compressedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        })

      if (error) {
        console.error(`Upload error for ${bucket}:`, error)
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL for the uploaded file
      const { data: publicUrlData } = this.getSupabaseClient().storage
        .from(bucket)
        .getPublicUrl(fullPath)

      return {
        url: data.path,
        publicUrl: publicUrlData.publicUrl,
        path: fullPath,
        metadata: {
          size: compressedFile.size,
          type: file.type,
          compressed,
          originalSize: compressed ? originalSize : undefined
        }
      }
    } catch (error: any) {
      console.error('File upload failed:', error)
      throw error
    }
  }

  /**
   * Upload receipt image
   */
  async uploadReceiptImage(
    file: File | Blob,
    receiptId: string,
    tenantId: string,
    subscriptionTier: keyof typeof STORAGE_LIMITS = 'free'
  ): Promise<UploadResult> {
    const timestamp = Date.now()
    const extension = file.type === 'application/pdf' ? 'pdf' : 'jpg'
    const path = `receipts/${receiptId}_${timestamp}.${extension}`
    
    return this.uploadFile('receipts', file, path, tenantId, subscriptionTier)
  }

  /**
   * Upload invoice attachment
   */
  async uploadInvoiceAttachment(
    file: File | Blob,
    invoiceId: string,
    tenantId: string,
    subscriptionTier: keyof typeof STORAGE_LIMITS = 'free'
  ): Promise<UploadResult> {
    const timestamp = Date.now()
    const extension = file.type === 'application/pdf' ? 'pdf' : 'jpg'
    const path = `invoices/${invoiceId}_${timestamp}.${extension}`
    
    return this.uploadFile('invoices', file, path, tenantId, subscriptionTier)
  }

  /**
   * Upload user profile image
   */
  async uploadProfileImage(
    file: File | Blob,
    userId: string,
    tenantId: string,
    subscriptionTier: keyof typeof STORAGE_LIMITS = 'free'
  ): Promise<UploadResult> {
    const timestamp = Date.now()
    const extension = file.type.includes('png') ? 'png' : 'jpg'
    const path = `profiles/${userId}_${timestamp}.${extension}`
    
    return this.uploadFile('profiles', file, path, tenantId, subscriptionTier)
  }

  /**
   * Upload logo
   */
  async uploadLogo(
    file: File | Blob,
    tenantId: string,
    logoType: string = 'main',
    subscriptionTier: keyof typeof STORAGE_LIMITS = 'free'
  ): Promise<UploadResult> {
    const timestamp = Date.now()
    const extension = file.type === 'image/svg+xml' ? 'svg' : 
                     file.type.includes('png') ? 'png' : 'jpg'
    const path = `logos/${logoType}_${timestamp}.${extension}`
    
    return this.uploadFile('logos', file, path, tenantId, subscriptionTier)
  }

  /**
   * Delete file from storage
   */
  async deleteFile(bucket: BucketName, path: string): Promise<void> {
    try {
      const { error } = await this.getSupabaseClient().storage
        .from(bucket)
        .remove([path])

      if (error) {
        console.error(`Delete error for ${bucket}/${path}:`, error)
        throw new Error(`Delete failed: ${error.message}`)
      }
    } catch (error: any) {
      console.error('File deletion failed:', error)
      throw error
    }
  }

  /**
   * Get signed URL for private file access
   */
  async getSignedUrl(
    bucket: BucketName,
    path: string,
    expiresIn: number = 3600 // 1 hour default
  ): Promise<string> {
    try {
      const { data, error } = await this.getSupabaseClient().storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

      if (error) {
        console.error(`Signed URL error for ${bucket}/${path}:`, error)
        throw new Error(`Signed URL failed: ${error.message}`)
      }

      return data.signedUrl
    } catch (error: any) {
      console.error('Signed URL generation failed:', error)
      throw error
    }
  }

  /**
   * Clean up old files (for automatic cleanup)
   */
  async cleanupOldFiles(
    tenantId: string,
    olderThanDays: number = 90,
    buckets: BucketName[] = ['receipts', 'invoices'],
    maxDeletes: number = 1000,
    dryRun: boolean = false
  ): Promise<{ deletedCount: number; errors: any[] }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    
    let deletedCount = 0
    const errors: any[] = []

    for (const bucket of buckets) {
      if (deletedCount >= maxDeletes) {
        break
      }

      try {
        const { data: files, error } = await this.getSupabaseClient()
          .storage
          .from(bucket)
          .list(tenantId, { limit: 1000 })

        if (error) {
          errors.push({ bucket, error })
          continue
        }

        const oldFiles = files?.filter(file => {
          const fileDate = new Date(file.created_at || file.updated_at || 0)
          return fileDate < cutoffDate
        }) || []

        if (oldFiles.length > 0) {
          // Limit the number of files to delete in this batch
          const remainingDeletes = maxDeletes - deletedCount
          const filesToDelete = oldFiles.slice(0, remainingDeletes)
          const pathsToDelete = filesToDelete.map(file => `${tenantId}/${file.name}`)
          
          if (dryRun) {
            console.log(`🔍 Would delete ${filesToDelete.length} old files from ${bucket} for tenant ${tenantId}`)
            deletedCount += filesToDelete.length
          } else {
            const { error: deleteError } = await this.getSupabaseClient().storage
              .from(bucket)
              .remove(pathsToDelete)

            if (deleteError) {
              errors.push({ bucket, error: deleteError, files: filesToDelete.length })
            } else {
              deletedCount += filesToDelete.length
              console.log(`✅ Deleted ${filesToDelete.length} old files from ${bucket} for tenant ${tenantId}`)
            }
          }
        }
      } catch (error) {
        errors.push({ bucket, error })
      }
    }

    return { deletedCount, errors }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(tenantId: string): Promise<{
    totalSize: number
    fileCount: number
    byBucket: Record<BucketName, { size: number; count: number }>
  }> {
    let totalSize = 0
    let fileCount = 0
    const byBucket: Record<BucketName, { size: number; count: number }> = {
      receipts: { size: 0, count: 0 },
      invoices: { size: 0, count: 0 },
      profiles: { size: 0, count: 0 },
      logos: { size: 0, count: 0 }
    }

    for (const bucket of Object.keys(BUCKET_CONFIGS) as BucketName[]) {
      try {
        const { data: files, error } = await this.getSupabaseClient()
          .storage
          .from(bucket)
          .list(tenantId, { limit: 10000 })

        if (!error && files) {
          const bucketSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
          const bucketCount = files.length

          byBucket[bucket] = { size: bucketSize, count: bucketCount }
          totalSize += bucketSize
          fileCount += bucketCount
        }
      } catch (error) {
        console.warn(`Failed to get stats for bucket ${bucket}:`, error)
      }
    }

    return { totalSize, fileCount, byBucket }
  }

  /**
   * Convert data URL to File
   */
  static dataUrlToFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',')
    const mimeMatch = arr[0].match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    
    return new File([u8arr], filename, { type: mime })
  }

  /**
   * Convert blob URL to File (for handling temporary blob URLs)
   */
  static async blobUrlToFile(blobUrl: string, filename: string): Promise<File> {
    const response = await fetch(blobUrl)
    const blob = await response.blob()
    return new File([blob], filename, { type: blob.type })
  }
}

// Create singleton instances for client and server use
export const clientStorage = new SupabaseStorageService(false)
export const serverStorage = new SupabaseStorageService(true)

// Export the service class for custom instances
export { SupabaseStorageService }
export default SupabaseStorageService