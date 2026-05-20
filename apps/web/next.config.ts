import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@assertive-coach/types", "@assertive-coach/ui"],
  typedRoutes: true
};

export default nextConfig;
