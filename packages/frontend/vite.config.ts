import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const bffTarget = process.env.BFF_TARGET ?? "http://localhost:3100";
const proxiedPaths = [
  "/auth",
  "/identity",
  "/request",
  "/incidents",
  "/problem-change",
  "/sla",
  "/escalation",
  "/notifications",
  "/audit",
  "/reporting",
  "/integration",
] as const;

const proxy = Object.fromEntries(
  proxiedPaths.map((path) => [
    path,
    {
      target: bffTarget,
      changeOrigin: true,
      xfwd: true,
    },
  ])
);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },
  server: {
    port: 5173,
    proxy,
    allowedHosts:['barricade-composite-laziness.ngrok-free.dev']
  },
});
