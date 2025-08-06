import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  // Enable standalone for production deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Prevent static generation issues
  trailingSlash: false,
  
  // Environment variables configuration
  env: {
    // Make Railway environment detection available
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    // Build-time environment detection
    IS_BUILD_TIME: process.env.NODE_ENV === 'production' && process.env.CI === 'true' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT ? 'true' : 'false',
  },
  
  // Railway-specific optimizations to prevent build hangs
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Externalize server components packages
  serverExternalPackages: ['@polar-sh/sdk', 'tesseract.js', 'pdfjs-dist', 'canvas'],
  
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
  
  // Enhanced webpack configuration for Next.js 15.3.1 with path alias support
  webpack: (config, { isServer }) => {
    // Ensure path aliases are properly resolved
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      '@/components': path.resolve(__dirname, 'components'),
      '@/lib': path.resolve(__dirname, 'lib'),
      '@/app': path.resolve(__dirname, 'app'),
      '@/types': path.resolve(__dirname, 'types'),
    };

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
  
  // Host validation for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/_next/static/chunks/(.*).css',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
        ],
      },
      {
        source: '/_next/static/css/(.*).css',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
        ],
      },
    ]
  },
  
};

export default nextConfig;
// Force rebuild Wed, Jul 30, 2025 12:19:24 AM
