import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  root: "src",
  server: {
    port: 7000
  },
  preview: {
    port: 7000
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
});
