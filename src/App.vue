<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { useAppStore } from "@/stores/app";
onLaunch(() => {
  const app = useAppStore();
  app.initializeTheme();
  app.applyTabLanguage();
});
</script>

<style lang="scss">
@use "./styles/feature-pages.scss";
@use "./styles/global.scss";
@use "./styles/summit-features.scss";
@use "./styles/raven-v7.scss";
</style>
