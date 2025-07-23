"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface SecureImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  path?: string | null;
  fallback?: string;
  bucket?: string;
}

export function SecureImage({ 
  path, 
  fallback = "/placeholder-logo.png",
  bucket = "logos",
  className,
  alt,
  ...props 
}: SecureImageProps) {
  const [imageUrl, setImageUrl] = useState<string>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path) {
      setImageUrl(fallback);
      setLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        const supabase = createClient();
        
        // Check if it's already a full URL (legacy base64 or external URL)
        if (path.startsWith('data:') || path.startsWith('http')) {
          setImageUrl(path);
          setLoading(false);
          return;
        }

        // Generate a signed URL for the private bucket
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (error) throw error;

        setImageUrl(data.signedUrl);
      } catch (error) {
        console.error('Error loading secure image:', error);
        setImageUrl(fallback);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [path, bucket, fallback]);

  if (loading) {
    return (
      <div className={cn("animate-pulse bg-gray-200 rounded", className)} />
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={() => setImageUrl(fallback)}
      {...props}
    />
  );
}