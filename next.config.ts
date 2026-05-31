import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this repo. Without this, a stray lockfile in a
  // parent directory (e.g. ~/package-lock.json) makes Next infer the wrong
  // root, which breaks server-action IDs ("Failed to find Server Action").
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
