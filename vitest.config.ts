import { defineConfig } from "vitest/config";

// node:sqlite is a Node built-in (experimental) that this Vite version doesn't
// recognize, so it tries to resolve/transform "sqlite" as a package and fails.
// Intercept the import and serve a tiny shim that pulls the real builtin in at
// runtime via createRequire (Node executes this, Vite never sees "sqlite").
const NODE_SQLITE_SHIM = "\0virtual:node-sqlite-shim";
function externalizeNodeSqlite() {
  return {
    name: "externalize-node-sqlite",
    enforce: "pre" as const,
    resolveId(id: string) {
      if (id === "node:sqlite" || id === "sqlite") return NODE_SQLITE_SHIM;
      return null;
    },
    load(id: string) {
      if (id === NODE_SQLITE_SHIM) {
        return [
          "import { createRequire } from 'node:module';",
          "const require = createRequire(import.meta.url);",
          "const sqlite = require('node:sqlite');",
          "export const DatabaseSync = sqlite.DatabaseSync;",
          "export const StatementSync = sqlite.StatementSync;",
          "export default sqlite;",
        ].join("\n");
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [externalizeNodeSqlite()],
  test: {
    environment: "node",
    include: ["packages/**/src/**/*.test.ts", "packages/**/src/**/__tests__/**/*.test.ts"],
    exclude: ["**/node_modules/**", "packages/contracts/**"],
  },
});
