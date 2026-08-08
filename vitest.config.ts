import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const source = (name: string) => resolve(process.cwd(), "packages", name, "src", "index.ts");

export default defineConfig({
  resolve: {
    alias: {
      "@specbridge/core": source("core"),
      "@specbridge/parsers": source("parsers"),
      "@specbridge/repository": source("repository"),
      "@specbridge/rules": source("rules"),
      "@specbridge/adapters": source("adapters"),
      "@specbridge/sarif": source("sarif"),
      "@specbridge/cli": source("cli"),
      "@specbridge/benchmark": source("benchmark"),
      "@specbridge/benchmark-adapters": source("benchmark-adapters"),
    },
  },
});
