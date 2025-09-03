import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence workspace root warning by pointing output tracing to this project root
  outputFileTracingRoot: __dirname,
  // Optionally, you can disable eslint during build if needed
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
