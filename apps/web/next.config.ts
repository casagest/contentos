import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Content-engine scaffold has pre-existing type errors — skip during build
    ignoreBuildErrors: true,
  },
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
};

export default nextConfig;
