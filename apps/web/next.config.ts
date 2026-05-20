import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@speakable/types", "@speakable/ui"],
  typedRoutes: true
};

export default nextConfig;
