import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',  
        hostname: 'replicate.delivery',
        port: '',
        pathname: '/yhqm/**',
      },
      {
        protocol: 'https',
        hostname: 'naturafund.s3.amazonaws.com',
        port: '',
        pathname: '/**',
        search: '',
      }
    ],
  },
};

export default nextConfig;
