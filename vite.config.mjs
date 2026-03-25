import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 关键修复：设置基础路径为相对路径，解决 Electron 打包后白屏问题
  base: "./",
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // 建议：确保 assets 文件夹中的文件名不带过长的 hash，方便排查
    assetsDir: "assets"
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  },
  server: {
    port: 5174,
    strictPort: true
  }
});