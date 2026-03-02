import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle pdfkit/fontkit compatibility issue - mark as external on client
    config.externals = [
      ...(config.externals || []),
      { 'fontkit': 'fontkit' }
    ];
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Ignore the middleware deprecation warning
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Exclude pdfkit from client bundle
  serverExternalPackages: ['pdfkit', 'fontkit'],
};

export default nextConfig;
