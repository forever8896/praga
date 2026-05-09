import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pin the workspace root so Next.js doesn't walk up past the parent dir's lockfile
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
