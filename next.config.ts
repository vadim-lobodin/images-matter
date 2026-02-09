import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/libraries',
        destination: 'https://berlin-libraries.vercel.app/libraries',
      },
      {
        source: '/libraries/:path+',
        destination: 'https://berlin-libraries.vercel.app/libraries/:path+',
      },
      {
        source: '/intercom',
        destination: 'https://intercom-lyart.vercel.app/intercom',
      },
      {
        source: '/intercom/:path+',
        destination: 'https://intercom-lyart.vercel.app/intercom/:path+',
      },
    ];
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
