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
  },
  // Performance optimizations
  experimental: {
    // Optimize package imports — only bundle what's actually used
    optimizePackageImports: ["lucide-react", "@supabase/supabase-js"],
  },
  // Compress responses
  compress: true,
  // PoweredBy header is noise
  poweredByHeader: false,
};

export default nextConfig;
