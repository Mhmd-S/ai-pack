import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
    // Prefer ES modules over CommonJS for @react-three/drei
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-three/drei': '@react-three/drei/web',
    };
    
    return config;
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
