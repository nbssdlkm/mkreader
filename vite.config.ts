import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("react-markdown") || id.includes("remark") || id.includes("rehype") || id.includes("mdast") || id.includes("hast") || id.includes("unified") || id.includes("micromark")) {
            return "vendor-markdown";
          }
        },
      },
    },
  },
  clearScreen: false,
});
