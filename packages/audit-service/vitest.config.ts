import { defineConfig, configDefaults } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: [...configDefaults.exclude, "**/*.integration.spec.ts"],
  },
  resolve: {
    alias: {
      "@pgic/shared": path.resolve(__dirname, "../shared/src"),
    },
  },
});
