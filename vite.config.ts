import { defineConfig } from "vite";

// Standalone game project (migrated from the Bjorn & Son website repo's game/ folder).
// Served statically; no SSR, no backend. base './' keeps builds portable.
export default defineConfig({
  base: "./",
  css: {
    // Inline PostCSS config so Vite never picks up a postcss.config from a
    // parent directory (the game originally lived inside the storefront repo).
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
