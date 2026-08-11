import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cloudflux/contracts"],
  agentRules: false,
};

export default nextConfig;
