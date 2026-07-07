import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/src/**/*.test.ts", "packages/**/src/**/__tests__/**/*.test.ts"],
    exclude: ["**/node_modules/**", "packages/contracts/**"],
  },
});
