import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const bffTarget = "http://localhost:3100";
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
  server: {
    port: 5173,
    proxy,
    allowedHosts:['barricade-composite-laziness.ngrok-free.dev']
  },
});
