/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compile the workspace package from source instead of relying on a prebuilt
  // dist/ (which isn't committed). This makes production builds — including
  // Vercel — work from a clean checkout with no separate build step.
  transpilePackages: ["@hive/shared"],

  webpack: (config) => {
    // @hive/shared's source uses NodeNext-style ".js" extensions on relative
    // imports (e.g. `export * from "./config.js"`). Map those back to the ".ts"
    // sources so webpack can resolve them when transpiling from source.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
};

export default nextConfig;
