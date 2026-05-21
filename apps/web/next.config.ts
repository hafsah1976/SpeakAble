import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output:
    process.env.NEXT_PRIVATE_TARGET === "netlify-static" ||
    process.env.NEXT_PUBLIC_ENABLE_SUBMISSION_DEMO === "true"
      ? "export"
      : undefined,
  transpilePackages: ["@speakable/types", "@speakable/ui"],
  typedRoutes: true
};

export default nextConfig;
