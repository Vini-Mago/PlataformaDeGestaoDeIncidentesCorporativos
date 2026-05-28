import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__tests__/e2e/**/*.e2e.spec.ts"],
    testTimeout: 45_000,
    hookTimeout: 45_000,
    fileParallelism: false,
  },
});

