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
    // wagmi's `connectors` barrel statically re-exports its Tempo Wallet
    // connector, which imports the optional peer dep `accounts` (~0.14). We
    // only use the `injected()` connector, so alias the unused optional dep to
    // `false` and let webpack tree-shake the Tempo code path away.
    config.resolve.alias = {
      ...config.resolve.alias,
      accounts: false,
    };
    return config;
  },
};

export default nextConfig;
