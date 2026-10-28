/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Makes the app installable and lets it open with no signal. The service
    // worker only caches the app itself (HTML, JS, CSS, fonts, icons); farm data
    // is handled by the app (src/offline) so it stays tied to the signed-in user.
    VitePWA({
      // New versions wait for the user to accept them, so a deploy can't reload
      // the page in the middle of entering a record.
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Cattle Manager",
        short_name: "Cattle Manager",
        description: "Herd records, vaccinations, weights and counts - works without signal.",
        lang: "en",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#2F6244",
        background_color: "#F6F7F5",
        categories: ["business", "productivity"],
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Daily count", short_name: "Count", url: "/daily-counts" },
          { name: "Register", short_name: "Register", url: "/register" },
          { name: "Vaccinations", short_name: "Vaccines", url: "/vaccinations" },
        ],
      },
      workbox: {
        // Single-page app: any page address opens the app shell, but never the API.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Keep the install download small: only the Latin font files are needed.
        globIgnores: ["**/inter-cyrillic*", "**/inter-greek*", "**/inter-vietnamese*"],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    // Same-origin in dev too, so the SameSite=Strict session cookie just works.
    proxy: { "/api": { target: "http://localhost:4000", changeOrigin: false } },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          chakra: ["@chakra-ui/react", "@emotion/react", "@emotion/styled", "framer-motion"],
          charts: ["recharts"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    css: false,
  },
});
