const path = require("node:path");

const blockedGlobs =
  process.platform === "win32" && process.env.USERPROFILE
    ? [
        "Application Data",
        "Cookies",
        "Local Settings",
        "My Documents",
        "NetHood",
        "PrintHood",
        "Recent",
        "SendTo",
        "Start Menu",
        "Templates",
        path.join("AppData", "Local", "Application Data"),
        path.join("AppData", "Local", "ElevatedDiagnostics"),
        path.join("AppData", "Local", "Docker"),
        path.join("AppData", "Local", "Microsoft", "WindowsApps"),
      ].map((relativePath) =>
        path
          .join(process.env.USERPROFILE, relativePath)
          .replace(/\\/g, "/") + "/**",
      )
    : []

const appUrl =
  process.env.AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3001";

const oauthBaseUrl =
  process.env.OAUTH_BASE_URL ?? process.env.NEXT_PUBLIC_OAUTH_BASE_URL;

const remotePatterns = [];

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

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL: appUrl,
    AUTH_URL: appUrl,
  },
  images: remotePatterns.length ? { remotePatterns } : undefined,
  outputFileTracingRoot: path.resolve(__dirname),
  outputFileTracingExcludes:
    blockedGlobs.length > 0
      ? {
          "*": blockedGlobs,
          "next-server": blockedGlobs,
        }
      : undefined,
  webpack: (config, { isServer }) => {
    // Exclude problematic Windows directories from file watching
    if (process.platform === "win32" && process.env.USERPROFILE) {
      const excludedDirs = [
        path.join(process.env.USERPROFILE, "AppData", "Local", "Docker") + "/**",
        path.join(process.env.USERPROFILE, "AppData", "Local", "Application Data") + "/**",
        path.join(process.env.USERPROFILE, "AppData", "Local", "Microsoft", "WindowsApps") + "/**",
      ];

      const existingIgnored = config.watchOptions?.ignored;
      const ignoredArray = existingIgnored
        ? Array.isArray(existingIgnored)
          ? existingIgnored.filter(item => item && typeof item === 'string' && item.length > 0)
          : typeof existingIgnored === 'string' && existingIgnored.length > 0
            ? [existingIgnored]
            : []
        : [];

      config.watchOptions = {
        ...config.watchOptions,
        ignored: [...ignoredArray, ...excludedDirs],
      };

      // Use memory cache instead of filesystem cache to avoid permission issues
      if (config.cache && typeof config.cache === 'object' && 'type' in config.cache) {
        config.cache = {
          type: 'memory',
        };
      }
    }

    return config;
  },
};

module.exports = nextConfig;
