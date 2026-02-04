import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // 👇 Add this. It prevents Vite from moving your library to .vite/deps
    exclude: ["open-quran-view"],
  },
});
