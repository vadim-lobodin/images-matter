import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/cascade",
  assetPrefix: "/cascade",
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
