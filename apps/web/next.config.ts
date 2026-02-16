import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@contentos/content-engine",
    "@contentos/database",
    "@contentos/shared",
    "@contentos/ui",
    "@contentos/dental-content",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    // Use Vercel's image optimization
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24, // 24h cache for optimized images
  },
  experimental: {
    // Tree-shake large icon/component libraries
    optimizePackageImports: ["lucide-react", "@supabase/supabase-js"],
  },
  // Gzip/Brotli compression
  compress: true,
  // Remove X-Powered-By header
  poweredByHeader: false,
  // Enable React strict mode for better development
  reactStrictMode: true,
  // Logging for debugging
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
