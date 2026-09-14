import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  plugins: [uni()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "vue-i18n": fileURLToPath(new URL("./node_modules/vue-i18n/dist/vue-i18n.esm-browser.js", import.meta.url)),
    },
  },
});
