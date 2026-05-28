import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
const R2_DOMAIN = (process.env.R2_PUBLIC_DOMAIN ?? "").replace(/^https?:\/\//, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],

  async rewrites() {
    return [
      {
        source: "/api/:path*/",
        destination: `${BACKEND_URL}/api/:path*/`,
      },
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*/`,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
      ...(R2_DOMAIN
        ? [
            {
              protocol: "https" as const,
              hostname: R2_DOMAIN,
              pathname: "/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
