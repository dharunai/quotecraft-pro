import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: false,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['tesseract.js'],
    exclude: ['tesseract.js/dist/worker.min.js'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'tesseract': ['tesseract.js'],
        },
      },
    },
  },
}));
