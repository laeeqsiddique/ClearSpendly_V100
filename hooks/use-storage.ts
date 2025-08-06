import { useState, useCallback } from 'react'

export interface UploadOptions {
  type: 'receipt' | 'invoice' | 'profile' | 'logo'
  entityId?: string
  logoType?: string
  subscriptionTier?: string
}

export interface UploadProgress {
  progress: number
  stage: 'preparing' | 'uploading' | 'processing' | 'complete' | 'error'
  message: string
}

export interface UploadResult {
  success: boolean
  data?: {
    url: string
    publicUrl: string
    path: string
    metadata?: any
  }
  error?: string
}

export interface StorageStats {
  totalSize: number
  fileCount: number
  byBucket: Record<string, { size: number; count: number }>
  limits: {
    canUpload: boolean
    totalUsed: number
    fileCount: number
    limits: any
    subscription: any
  }
  usage: {
    storagePercentage: number
    filesPercentage: number
  }
}

export function useStorage() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [stats, setStats] = useState<StorageStats | null>(null)

  const uploadFile = useCallback(async (
    file: File,
    options: UploadOptions
  ): Promise<UploadResult> => {
    setUploading(true)
    setProgress({ 
      progress: 0, 
      stage: 'preparing', 
      message: 'Preparing file for upload...' 
    })

    try {
      // Validate file
      if (!file || file.size === 0) {
        throw new Error('Invalid file')
      }

      // Prepare form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', options.type)
      
      if (options.entityId) {
        formData.append('entityId', options.entityId)
      }
      
      if (options.logoType) {
        formData.append('logoType', options.logoType)
      }
      
      if (options.subscriptionTier) {
        formData.append('subscriptionTier', options.subscriptionTier)
      }

      setProgress({ 
        progress: 25, 
        stage: 'uploading', 
        message: 'Uploading file...' 
      })

      // Upload file
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setProgress({ 
        progress: 75, 
        stage: 'processing', 
        message: 'Processing upload...' 
      })

      // Small delay to show processing stage
      await new Promise(resolve => setTimeout(resolve, 500))

      setProgress({ 
        progress: 100, 
        stage: 'complete', 
        message: 'Upload complete!' 
      })

      return {
        success: true,
        data: result.data
      }
    } catch (error: any) {
      console.error('Upload failed:', error)
      setProgress({ 
        progress: 0, 
        stage: 'error', 
        message: error.message || 'Upload failed' 
      })
      
      return {
        success: false,
        error: error.message || 'Upload failed'
      }
    } finally {
      setUploading(false)
      // Clear progress after a delay
      setTimeout(() => setProgress(null), 3000)
    }
  }, [])

  const deleteFile = useCallback(async (
    bucket: string,
    path: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/storage/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bucket, path }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Delete failed')
      }

      return { success: true }
    } catch (error: any) {
      console.error('Delete failed:', error)
      return {
        success: false,
        error: error.message || 'Delete failed'
      }
    }
  }, [])

  const getSignedUrl = useCallback(async (
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<{ success: boolean; signedUrl?: string; error?: string }> => {
    try {
      const params = new URLSearchParams({
        bucket,
        path,
        expiresIn: expiresIn.toString()
      })

      const response = await fetch(`/api/storage/download?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get signed URL')
      }

      return {
        success: true,
        signedUrl: result.data.signedUrl
      }
    } catch (error: any) {
      console.error('Get signed URL failed:', error)
      return {
        success: false,
        error: error.message || 'Failed to get signed URL'
      }
    }
  }, [])

  const getStorageStats = useCallback(async (
    subscriptionTier?: string
  ): Promise<void> => {
    try {
      const params = subscriptionTier 
        ? new URLSearchParams({ tier: subscriptionTier })
        : new URLSearchParams()

      const response = await fetch(`/api/storage/stats?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get storage stats')
      }

      setStats(result.data)
    } catch (error: any) {
      console.error('Get storage stats failed:', error)
      setStats(null)
    }
  }, [])

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  const isUploadAllowed = useCallback((fileSize: number): {
    allowed: boolean
    reason?: string
  } => {
    if (!stats?.limits) {
      return { allowed: true }
    }

    const limits = stats.limits.limits
    if (!limits) {
      return { allowed: true }
    }

    // Check file size limit
    const maxFileSizeBytes = limits.max_file_size_mb * 1024 * 1024
    if (fileSize > maxFileSizeBytes) {
      return {
        allowed: false,
        reason: `File size exceeds limit of ${limits.max_file_size_mb}MB for your plan`
      }
    }

    // Check storage limit
    const maxStorageBytes = limits.storage_limit_mb * 1024 * 1024
    if (stats.limits.totalUsed + fileSize > maxStorageBytes) {
      return {
        allowed: false,
        reason: `Adding this file would exceed your storage limit of ${limits.storage_limit_mb}MB`
      }
    }

    // Check file count limit
    if (stats.limits.fileCount >= limits.max_files) {
      return {
        allowed: false,
        reason: `You've reached the file limit of ${limits.max_files} files for your plan`
      }
    }

    return { allowed: true }
  }, [stats])

  return {
    // State
    uploading,
    progress,
    stats,
    
    // Actions
    uploadFile,
    deleteFile,
    getSignedUrl,
    getStorageStats,
    
    // Utilities
    formatFileSize,
    isUploadAllowed,
  }
}