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
    // wagmi's `connectors` barrel (pulled in transitively by RainbowKit's
    // getDefaultConfig) statically re-exports several connectors whose optional
    // peer deps we don't install: the Tempo Wallet connector needs `accounts`,
    // the Porto connector needs `porto`, and the Safe connector needs the
    // `@safe-global/*` SDKs. We don't offer those wallets, so alias each unused
    // optional dep to `false` and let webpack tree-shake those code paths away.
    // NOTE: `@walletconnect/ethereum-provider` is intentionally NOT stubbed — it
    // is installed and required for mobile wallet connections via WalletConnect.
    config.resolve.alias = {
      ...config.resolve.alias,
      accounts: false,
      porto: false,
      "@safe-global/safe-apps-sdk": false,
      "@safe-global/safe-apps-provider": false,
    };
    return config;
  },
};

export default nextConfig;
