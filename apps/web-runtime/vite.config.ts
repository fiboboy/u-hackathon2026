import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  server: {
    port: 3000,
    host: true,
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        demo: resolve(__dirname, "demo.html"),
      },
    },
  },
});

