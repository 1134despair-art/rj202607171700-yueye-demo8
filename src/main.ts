import { createSSRApp } from "vue";
import { createPinia } from "pinia";
import "./styles/binsen.tokens.css";
import "./styles/tokens.css";
import { i18n } from "./i18n";
import App from "./App.vue";

export function createApp() {
  const app = createSSRApp(App);
  app.use(createPinia());
  app.use(i18n);
  return { app };
}
