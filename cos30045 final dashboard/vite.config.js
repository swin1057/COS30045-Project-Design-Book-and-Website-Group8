import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

export default defineConfig({
  base: "/cos30045/s105733275/dashboard/",
  plugins: [vue(), vuetify({ autoImport: true })],
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/vuetify/")) return "vuetify";
          if (id.includes("/node_modules/d3/") || id.includes("/node_modules/d3-")) return "visualizations";
        }
      }
    }
  }
});
