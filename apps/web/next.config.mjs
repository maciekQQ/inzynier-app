/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  eslint: {
    // Skip lint errors during docker/CI builds to allow deployment
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.railway.app",
      },
    ],
  },
};

export default nextConfig;
