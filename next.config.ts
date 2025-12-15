import path from 'path';
import { NextConfig } from 'next';

/** @type {NextConfig} */
const nextConfig: NextConfig = {
  // Force Turbopack to use this folder as the project root
  turbopack: {
    root: path.resolve(__dirname)
  },
  // You're using the Pages Router (pages/). Ensure appDir is disabled.
  experimental: {
    appDir: false
  },
  reactStrictMode: true
};

export default nextConfig;
