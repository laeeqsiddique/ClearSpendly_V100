# Supabase Storage System - Complete Implementation Guide

This document outlines the complete Supabase Storage integration for the Flowvya application, replacing temporary blob URLs with a robust, scalable file storage system.

## Overview

The storage system provides:
- **Secure file storage** for receipts, invoices, profiles, and logos
- **Subscription-based limits** with automatic enforcement
- **Image compression and optimization** 
- **Automatic cleanup** of orphaned and old files
- **Multi-tenant isolation** with proper RLS policies
- **RESTful API** for all storage operations

## Architecture

### Components

1. **Storage Service** (`lib/storage/supabase-storage.ts`)
   - Core service handling all file operations
   - Image compression and optimization
   - Subscription limit enforcement
   - Multi-bucket management

2. **Subscription Service** (`lib/subscription/subscription-service.ts`)
   - Manages subscription tiers and limits
   - Usage tracking and validation
   - Tier-based feature access control

3. **API Endpoints** (`app/api/storage/`)
   - `/upload` - File upload with compression
   - `/download` - Signed URL generation
   - `/delete` - Secure file deletion
   - `/stats` - Usage statistics
   - `/cleanup` - Manual cleanup operations
   - `/cleanup/job` - Automated cleanup job

4. **React Hook** (`hooks/use-storage.ts`)
   - Client-side storage operations
   - Upload progress tracking
   - Usage statistics display

5. **Database Schema**
   - Storage buckets with RLS policies
   - Subscription tables and limits
   - Cleanup queue for orphaned files
   - File metadata storage

## Storage Buckets

### 1. Receipts Bucket (`receipts`)
- **Privacy**: Private (authenticated access only)
- **File Size Limit**: 25MB
- **Allowed Types**: JPEG, PNG, WebP, PDF
- **Compression**: Enabled (0.8 quality, max 2048x2048)

### 2. Invoices Bucket (`invoices`) 
- **Privacy**: Private
- **File Size Limit**: 25MB
- **Allowed Types**: JPEG, PNG, WebP, PDF
- **Compression**: Enabled (0.9 quality, max 2048x2048)

### 3. Profiles Bucket (`profiles`)
- **Privacy**: Private 
- **File Size Limit**: 2MB
- **Allowed Types**: JPEG, PNG, WebP
- **Compression**: Enabled (0.7 quality, max 512x512)

### 4. Logos Bucket (`logos`)
- **Privacy**: Public read, private write
- **File Size Limit**: 5MB
- **Allowed Types**: JPEG, PNG, WebP, SVG
- **Compression**: Enabled (0.85 quality, max 1024x1024)

## Subscription Tiers

### Free Tier
- **Storage**: 100MB total
- **Max File Size**: 5MB
- **Max Files**: 50
- **Features**: Basic OCR, reporting

### Basic Tier ($9.99/month)
- **Storage**: 1GB total
- **Max File Size**: 10MB
- **Max Files**: 500
- **Features**: Advanced OCR, exports

### Premium Tier ($24.99/month)
- **Storage**: 10GB total
- **Max File Size**: 25MB
- **Max Files**: 5,000
- **Features**: AI categorization, multi-user

### Enterprise Tier ($99.99/month)
- **Storage**: 100GB total
- **Max File Size**: 100MB
- **Max Files**: 50,000
- **Features**: White-label, custom integrations

## Usage Examples

### Upload Receipt Image

```typescript
import { useStorage } from '@/hooks/use-storage'

const { uploadFile, uploading, progress } = useStorage()

const handleReceiptUpload = async (file: File, receiptId: string) => {
  const result = await uploadFile(file, {
    type: 'receipt',
    entityId: receiptId,
    subscriptionTier: 'free'
  })
  
  if (result.success) {
    console.log('Upload successful:', result.data?.publicUrl)
  } else {
    console.error('Upload failed:', result.error)
  }
}
```

### Server-side Upload

```typescript
import { serverStorage } from '@/lib/storage/supabase-storage'

const uploadReceiptImage = async (file: File, receiptId: string, tenantId: string) => {
  try {
    const result = await serverStorage.uploadReceiptImage(
      file,
      receiptId,
      tenantId,
      'free' // subscription tier
    )
    
    // Update database with storage info
    await updateReceiptWithStorage(receiptId, result)
    
    return result
  } catch (error) {
    console.error('Upload failed:', error)
    throw error
  }
}
```

### Check Storage Limits

```typescript
import { useStorage } from '@/hooks/use-storage'

const { stats, getStorageStats, isUploadAllowed } = useStorage()

useEffect(() => {
  getStorageStats('premium')
}, [])

const handleFileSelect = (file: File) => {
  const { allowed, reason } = isUploadAllowed(file.size)
  
  if (!allowed) {
    alert(`Upload not allowed: ${reason}`)
    return
  }
  
  // Proceed with upload
  uploadFile(file, options)
}
```

## Database Integration

### Updated Receipt Save Process

The receipt save process now includes automatic image storage:

1. **Process OCR data** (existing functionality)
2. **Save receipt record** to database
3. **Upload image** to Supabase Storage
4. **Update receipt** with storage URLs and metadata
5. **Create line items** (existing functionality)

### Storage Metadata

Each uploaded file stores metadata:

```json
{
  "size": 1048576,
  "type": "image/jpeg",
  "compressed": true,
  "originalSize": 2097152
}
```

### Database Schema Updates

New columns added to existing tables:

```sql
-- Receipt table
ALTER TABLE receipt ADD COLUMN storage_path TEXT;
ALTER TABLE receipt ADD COLUMN storage_url TEXT;
ALTER TABLE receipt ADD COLUMN file_metadata JSONB DEFAULT '{}';

-- Invoice table  
ALTER TABLE invoice ADD COLUMN attachment_storage_path TEXT;
ALTER TABLE invoice ADD COLUMN attachment_storage_url TEXT;
ALTER TABLE invoice ADD COLUMN attachment_metadata JSONB DEFAULT '{}';

-- User table
ALTER TABLE "user" ADD COLUMN profile_image_storage_path TEXT;
ALTER TABLE "user" ADD COLUMN profile_image_storage_url TEXT;
ALTER TABLE "user" ADD COLUMN profile_image_metadata JSONB DEFAULT '{}';
```

## Security

### Row Level Security (RLS)

All storage buckets have RLS policies ensuring tenant isolation:

```sql
-- Example policy for receipts bucket
CREATE POLICY "Tenant receipts upload policy"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
);
```

### API Security

- All endpoints require authentication
- Tenant isolation enforced at the API level  
- File paths validated to prevent unauthorized access
- Subscription limits checked before operations

### Secure File Access

Private files are accessed via signed URLs with configurable expiration:

```typescript
const signedUrl = await serverStorage.getSignedUrl('receipts', filePath, 3600)
```

## Automatic Cleanup

### Cleanup Queue

When database records are deleted, associated files are queued for cleanup:

```sql
CREATE TRIGGER receipt_storage_cleanup
  AFTER DELETE ON receipt
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_storage_on_delete();
```

### Scheduled Cleanup Job

The cleanup job (`/api/storage/cleanup/job`) should be run regularly:

```bash
# Example cron job (daily at 2 AM)
0 2 * * * curl -X POST "https://your-app.com/api/storage/cleanup/job" \
  -H "Authorization: Bearer $CLEANUP_JOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"olderThanDays": 90, "maxDeletes": 1000}'
```

### Configuration

Set environment variables:

```bash
CLEANUP_JOB_TOKEN=your-secure-cleanup-token
```

## Migration Guide

### From Blob URLs to Supabase Storage

1. **Run database migrations** to create storage buckets and tables
2. **Update API endpoints** to use new storage system
3. **Migrate existing blob URLs** (if any) to permanent storage
4. **Update frontend components** to use new storage hooks
5. **Test upload/download flows** end-to-end

### Migration Script Example

```typescript
// Migrate existing receipts with blob URLs
const migrateExistingReceipts = async () => {
  const receipts = await getReceiptsWithBlobUrls()
  
  for (const receipt of receipts) {
    try {
      // Convert blob URL to file
      const file = await SupabaseStorageService.blobUrlToFile(
        receipt.original_file_url,
        `receipt_${receipt.id}.jpg`
      )
      
      // Upload to Supabase Storage
      const result = await serverStorage.uploadReceiptImage(
        file,
        receipt.id,
        receipt.tenant_id
      )
      
      // Update database
      await updateReceiptStorage(receipt.id, result)
      
      console.log(`Migrated receipt ${receipt.id}`)
    } catch (error) {
      console.error(`Failed to migrate receipt ${receipt.id}:`, error)
    }
  }
}
```

## Performance Considerations

### Image Compression

- **Automatic compression** for images > 1MB
- **Configurable quality** per bucket type
- **Dimension limits** to prevent huge files
- **Format optimization** (WebP support)

### Caching

- **CDN integration** via Supabase's global CDN
- **Cache headers** set appropriately (1 hour default)
- **Signed URL caching** for frequently accessed files

### Batch Operations

- **Bulk upload** support in storage service
- **Batch cleanup** with configurable limits
- **Progress tracking** for long operations

## Monitoring and Analytics

### Usage Statistics

Track storage usage per tenant:

```typescript
const stats = await serverStorage.getStorageStats(tenantId)
// Returns: { totalSize, fileCount, byBucket }
```

### Health Checks

Monitor system health:

```bash
curl "https://your-app.com/api/storage/cleanup/job"
# Returns cleanup queue status
```

### Error Handling

- **Graceful degradation** when storage is unavailable
- **Retry logic** for transient failures  
- **Error logging** with context
- **User-friendly error messages**

## Cost Optimization

### Storage Costs

- **Automatic cleanup** reduces storage costs
- **Image compression** reduces bandwidth and storage
- **Subscription limits** prevent runaway usage
- **CDN caching** reduces origin requests

### Bandwidth Optimization

- **Compressed images** reduce transfer size
- **CDN delivery** reduces origin bandwidth
- **Signed URL expiration** prevents URL sharing

## Deployment Checklist

- [ ] Database migrations applied
- [ ] Storage buckets created with proper RLS policies  
- [ ] Environment variables configured
- [ ] Subscription tiers seeded
- [ ] Cleanup job scheduled
- [ ] API endpoints tested
- [ ] Frontend components updated
- [ ] Error handling verified
- [ ] Performance benchmarked
- [ ] Monitoring configured

## Support and Troubleshooting

### Common Issues

1. **Upload failures**: Check subscription limits and file size
2. **Access denied**: Verify RLS policies and authentication
3. **Missing files**: Check cleanup queue for orphaned files
4. **Performance issues**: Review image compression settings

### Debug Tools

```typescript
// Enable debug logging
console.log('Storage debug info:', {
  subscription: await serverSubscriptionService.getTenantSubscription(tenantId),
  usage: await serverStorage.getStorageStats(tenantId),
  limits: await serverStorage.checkStorageLimits(tenantId, fileSize)
})
```

This storage system provides a production-ready foundation for file management in the Flowvya application, with proper security, scalability, and cost management built-in.