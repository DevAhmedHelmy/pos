import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@pos/shared', '@pos/ui', '@pos/config'],
};

export default nextConfig;
