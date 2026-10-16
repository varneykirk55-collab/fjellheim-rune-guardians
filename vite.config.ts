import { defineConfig } from "vite";

// Standalone game project (separate from the root storefront app).
// Served statically; no SSR, no backend. base './' keeps builds portable.
export default defineConfig({
  base: "./",
  css: {
    // Inline PostCSS config so Vite does NOT pick up the storefront's
    // tailwind postcss.config.mjs from the repository root.
    postcss: { plugins: [] },
  },
  server: {
    host: "0.0.0.0",
    port: 5180,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 5180,
    allowedHosts: true,
  },
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
  },
});
