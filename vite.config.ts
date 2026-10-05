import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Webview 构建:产出到 out/webview,资源用相对路径(panel 再换成 webview URI)
export default defineConfig({
  root: "webview",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../out/webview",
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
});
