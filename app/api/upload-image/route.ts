import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";
import { getTenantIdWithFallback } from "@/lib/api-tenant";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Parse the form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate MIME type - allow images and PDFs
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg", 
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only image files and PDFs are allowed." },
        { status: 400 },
      );
    }

    // Validate file size - limit to 10MB
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeInBytes) {
      return NextResponse.json(
        { error: "File too large. Maximum size allowed is 10MB." },
        { status: 400 },
      );
    }

    // Get tenant ID for proper file organization
    const tenantId = await getTenantIdWithFallback();

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate unique filename with tenant organization
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueFilename = `${timestamp}-${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `${tenantId}/${uniqueFilename}`;

    // Convert File to ArrayBuffer for Supabase storage
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    // Generate a signed URL for the private file (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('receipts')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      // Fallback to public URL (though it won't work for private buckets)
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);
      
      return NextResponse.json({ 
        url: urlData.publicUrl,
        path: filePath,
        filename: uniqueFilename
      });
    }

    console.log('✅ Receipt image uploaded successfully:', filePath);

    return NextResponse.json({ 
      url: signedUrlData.signedUrl,
      path: filePath,
      filename: uniqueFilename
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 },
    );
  }
}
