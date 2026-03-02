import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack to use webpack (needed for pdfkit compatibility)
  turbopack: false,
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
  typescript: {
    ignoreBuildErrors: false,
  },
  // Exclude pdfkit from client bundle
  serverExternalPackages: ['pdfkit', 'fontkit'],
};

export default nextConfig;
