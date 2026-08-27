import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 560,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "three", test: /node_modules[\\/]three[\\/]/ },
            { name: "react", test: /node_modules[\\/](?:react|react-dom)[\\/]/ },
            {
              name: "geo",
              test: /node_modules[\\/](?:d3-geo|topojson-client)[\\/]/,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.FLIGHT_MAP_API_URL ?? "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});
