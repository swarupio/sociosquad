import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    open: true,
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/[/]node_modules[/](react|react-dom|react-router|react-router-dom|scheduler|@remix-run)[/]/.test(id)) return "vendor-react";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (/[/]node_modules[/](recharts|d3-[^/]+|victory-vendor|internmap)[/]/.test(id)) return "vendor-charts";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (/[/]node_modules[/](leaflet|react-leaflet|@react-leaflet)[/]/.test(id)) return "vendor-leaflet";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (/[/]node_modules[/](i18next|react-i18next|i18next-browser-languagedetector)[/]/.test(id)) return "vendor-i18n";
          return undefined;
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
