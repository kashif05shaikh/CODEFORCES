import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Codeforces JSON API
      "/api": {
        target: "https://codeforces.com",
        changeOrigin: true,
        secure: true,
      },
      // Codeforces HTML pages (for scraping when API not available)
      "/cf": {
        target: "https://codeforces.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/cf/, ""),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        },
      },
    },
  },
});