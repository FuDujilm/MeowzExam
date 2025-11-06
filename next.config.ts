import type { NextConfig } from "next";

const appUrl =
  process.env.AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3001";

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: appUrl,
    AUTH_URL: appUrl,
  },
};

export default nextConfig;
