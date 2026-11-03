import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // LAN phones/PCs open via http://192.168.x.x:3000 — Next blocks
  // cross-origin /_next/* unless the host is allowlisted.
  allowedDevOrigins: [
    "192.168.1.145",
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
  ],
  cacheComponents: false,
  partialPrefetching: false,
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=60" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
