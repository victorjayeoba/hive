import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Force @hive/shared to resolve to its compiled dist (webpack otherwise picks
    // up the TS source, whose .js-extensioned imports it can't resolve).
    config.resolve.alias["@hive/shared"] = resolve(here, "../shared/dist/index.js");
    return config;
  },
};

export default nextConfig;
