import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Prevent static generation issues
  trailingSlash: false,
  
  // Railway-specific optimizations to prevent build hangs
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Externalize server components packages
  serverExternalPackages: ['@vercel/analytics', '@polar-sh/sdk', 'tesseract.js', 'pdfjs-dist', 'canvas'],
  
  // Railway deployment configuration
  output: 'standalone', // Required for Railway deployments
  
  
  // Optimize images for bandwidth savings
  images: {
    formats: ['image/webp', 'image/avif'], // Modern formats save bandwidth
    minimumCacheTTL: 31536000, // 1 year cache for cost savings
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-6f0cf05705c7412b93a792350f3b3aa5.r2.dev",
      },
      {
        protocol: "https",
        hostname: "jdj14ctwppwprnqu.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "chuhbgcwjjldivnwyvia.supabase.co",
      },
    ],
  },
  
  // Simplified webpack configuration for Next.js 15.3.1 compatibility
  webpack: (config, { isServer }) => {
    // Server-side configuration
    if (isServer) {
      // Prevent client-side code from being bundled on server
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
        canvas: false,
      };
    } else {
      // Client-side configuration with browserify fallbacks
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        zlib: require.resolve('browserify-zlib'),
        path: require.resolve('path-browserify'),
        os: require.resolve('os-browserify/browser'),
      };
    }
    
    return config;
  },
  
  // Compress responses to save bandwidth
  compress: true,
  
};

export default nextConfig;
// Force rebuild Wed, Jul 30, 2025 12:19:24 AM
