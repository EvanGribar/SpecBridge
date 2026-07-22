import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
export default defineConfig({ resolve: { alias: { "@specbridge/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)), "@specbridge/adapters": fileURLToPath(new URL("./packages/adapters/src/index.ts", import.meta.url)), "@specbridge/sarif": fileURLToPath(new URL("./packages/sarif/src/index.ts", import.meta.url)) } } });
