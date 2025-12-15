import path from 'path';
import { NextConfig } from 'next';

/** @type {NextConfig} */
const nextConfig: NextConfig = {
  // Force Turbopack to use this folder as the project root
  turbopack: {
    root: path.resolve(__dirname)
  },
  // Removed: 'experimental.appDir' as it is obsolete/invalid when using the App Router.
  reactStrictMode: true
};

export default nextConfig;