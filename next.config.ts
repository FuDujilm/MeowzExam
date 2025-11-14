import type { NextConfig } from "next";

const appUrl =
  process.env.AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3001";

const oauthBaseUrl =
  process.env.OAUTH_BASE_URL ?? process.env.NEXT_PUBLIC_OAUTH_BASE_URL;

type RemotePattern = {
  protocol?: "http" | "https"
  hostname: string
  port?: string
  pathname: string
}

const remotePatterns: RemotePattern[] = [];

if (oauthBaseUrl) {
  try {
    const url = new URL(oauthBaseUrl);
    const protocol = url.protocol.replace(":", "");

    if (protocol === "http" || protocol === "https") {
      remotePatterns.push({
        protocol,
        hostname: url.hostname,
        pathname: "/**",
      });
    }
  } catch (error) {
    console.warn("[Next.js] 无法解析 OAUTH_BASE_URL:", error);
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: appUrl,
    AUTH_URL: appUrl,
  },
  images: remotePatterns.length ? { remotePatterns } : undefined,
};

export default nextConfig;
