import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // 👇 Add this. It prevents Vite from moving your library to .vite/deps
    exclude: ["open-quran-view"],
  },
  server: {
    proxy: {
      '/auth-proxy': {
        target: 'https://oauth2.quran.foundation',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth-proxy/, '')
      },
      '/api-proxy': {
        target: 'https://api.quran.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/content/, '')
      }
    }
  }
});
