import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // Enable static exports
  images: {
    unoptimized: true,  // Required for static export
  },
  // Only add basePath and assetPrefix when building for production/GitHub Pages
  ...(process.env.NODE_ENV === 'production' ? {
    basePath: '/wordplaying',
    assetPrefix: '/wordplaying/',
  } : {}),
};

export default nextConfig;