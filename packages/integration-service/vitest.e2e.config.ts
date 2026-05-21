import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__tests__/e2e/**/*.e2e.spec.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
