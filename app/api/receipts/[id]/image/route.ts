import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";
import { getTenantIdWithFallback } from "@/lib/api-tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id: receiptId } = await params;
    const tenantId = await getTenantIdWithFallback();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get the receipt to verify ownership and get file path
    const { data: receipt, error: receiptError } = await supabase
      .from('receipt')
      .select('original_file_url')
      .eq('id', receiptId)
      .eq('tenant_id', tenantId)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json(
        { error: "Receipt not found" },
        { status: 404 }
      );
    }

    if (!receipt.original_file_url || receipt.original_file_url === 'placeholder') {
      return NextResponse.json(
        { error: "No image associated with this receipt" },
        { status: 404 }
      );
    }

    // Check if this is a legacy URL that's not in our storage bucket
    if (!receipt.original_file_url.includes('receipts/') && !receipt.original_file_url.includes(`${tenantId}/`)) {
      return NextResponse.json(
        { error: "Image not available - this appears to be a legacy receipt without stored image" },
        { status: 404 }
      );
    }

    // Debug logging
    console.log('Receipt original_file_url:', receipt.original_file_url);
    console.log('Tenant ID:', tenantId);
    
    // Check if it's already a signed URL or extract the file path
    let filePath = receipt.original_file_url;
    
    // If it's a Supabase storage URL, extract the actual file path
    const supabaseStoragePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/`;
    if (filePath.startsWith(supabaseStoragePrefix)) {
      // Handle signed URLs: extract the path from the URL before the query params
      if (filePath.includes('/sign/')) {
        // This is a signed URL format: .../storage/v1/object/sign/receipts/tenant/filename?token=...
        const urlParts = filePath.split('/sign/receipts/')[1]; // Get everything after /sign/receipts/
        if (urlParts) {
          filePath = urlParts.split('?')[0]; // Remove query parameters
          console.log('Extracted from signed URL:', filePath);
        }
      } else {
        // This is a regular storage URL: .../storage/v1/object/receipts/tenant/filename
        filePath = filePath.replace(supabaseStoragePrefix, '').replace('receipts/', '');
        console.log('Extracted from regular URL:', filePath);
      }
    } else if (!filePath.includes(`${tenantId}/`)) {
      // If it's just a filename, add tenant prefix
      filePath = `${tenantId}/${filePath}`;
      console.log('Added tenant prefix to filename:', filePath);
    }
    
    console.log('Final file path for signed URL:', filePath);

    // Generate a signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('receipts')
      .createSignedUrl(filePath, 3600);

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      
      // If it's a "not found" error, provide a more specific message
      if (signedUrlError.message?.includes('not found') || signedUrlError.message?.includes('Object not found')) {
        return NextResponse.json(
          { error: "Image file not found in storage - it may have been deleted or this is a legacy receipt" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to generate image access URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: signedUrlData.signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
    });

  } catch (error) {
    console.error("Error getting receipt image:", error);
    return NextResponse.json(
      { error: "Failed to get receipt image" },
      { status: 500 }
    );
  }
}