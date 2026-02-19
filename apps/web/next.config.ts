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
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@supabase/supabase-js",
      "framer-motion",
      "recharts",
    ],
    staleTimes: { dynamic: 30, static: 180 },
  },
  async redirects() {
    return [
      { source: "/brain-dump", destination: "/braindump", permanent: true },
      { source: "/score", destination: "/analyze", permanent: true },
      { source: "/scoring", destination: "/analyze", permanent: true },
      { source: "/content-score", destination: "/analyze", permanent: true },
    ];
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  logging: { fetches: { fullUrl: false } },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
};

export default nextConfig;
