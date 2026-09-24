<script setup lang="ts">
import { useI18n } from "vue-i18n";
import UiIcon from "@/components/UiIcon.vue";
import AppFeedbackHost from "@/components/AppFeedbackHost.vue";
import logoImage from "@/assets/ui/branding/binsen-logo-horizontal-inverse.png";
import logoBlack from "@/assets/ui/branding/binsen-logo-horizontal-black.png";
import { useAppStore } from "@/stores/app";

const { t } = useI18n();
const app = useAppStore();

const props = withDefaults(defineProps<{ title?: string; back?: boolean; dark?: boolean; fallback?: string }>(), {
  title: "",
  back: false,
  dark: false,
  fallback: "",
});

function ravenFallback(screen: "dashboard" | "controls" | "service" | "profile" | "diagnostics" | "ota") {
  return `/pages/raven/index?screen=${screen}`;
}

function routeFallback() {
  const pages = getCurrentPages();
  const route = pages[pages.length - 1]?.route || "";
  if (route === "pages/service/diagnosis-result") return ravenFallback("diagnostics");
  if (route === "pages/service/ota-progress" || route === "pages/service/ota-detail") return ravenFallback("ota");
  if (route.startsWith("pages/controls/")) return ravenFallback("controls");
  if (route.startsWith("pages/me/")) return ravenFallback("profile");
  if (route.startsWith("pages/service/")) return ravenFallback("dashboard");
  return ravenFallback("dashboard");
}

function normalizeFallback(target: string) {
  const fallbackScreens: Record<string, string> = {
    "/pages/home/index": ravenFallback("dashboard"),
    "/pages/controls/index": ravenFallback("controls"),
    "/pages/service/index": ravenFallback("service"),
    "/pages/me/index": ravenFallback("profile"),
    "/pages/service/diagnosis": ravenFallback("diagnostics"),
    "/pages/service/ota": ravenFallback("ota"),
  };
  return fallbackScreens[target] || target;
}

function openFallback() {
  const target = normalizeFallback(props.fallback || routeFallback());
  const tabPages = ["/pages/home/index", "/pages/controls/index", "/pages/service/index", "/pages/me/index"];
  if (tabPages.includes(target)) uni.switchTab({ url: target });
  else uni.reLaunch({ url: target });
}

function goBack() {
  const pages = getCurrentPages();
  if (pages.length <= 1) {
    openFallback();
    return;
  }
  uni.navigateBack({ fail: openFallback });
}
</script>

<template>
  <view class="app-header" :class="{ 'app-header--dark': props.dark, 'app-header--back': props.back, 'app-header--plain-back': props.back }">
    <button v-if="props.back" class="icon-button" data-testid="back-button" :aria-label="t('common.back')" @click="goBack"><UiIcon name="ChevronLeft" :tone="app.resolvedTheme === 'dark' ? 'inverse' : 'navy'" :size="24" /></button>
    <image v-else class="app-header__logo" :src="app.resolvedTheme === 'dark' ? logoImage : logoBlack" mode="aspectFit" />
    <text v-if="props.title" class="app-header__title">{{ props.title }}</text>
    <view class="app-header__right">
      <slot name="right">
        <view v-if="props.back" class="icon-spacer" />
      </slot>
    </view>
</view>
  <AppFeedbackHost />
</template>

<style scoped lang="scss">
.app-header {
  position: sticky;
  z-index: 30;
  top: 0;
  display: grid;
  grid-template-columns: 88px 1fr 44px;
  min-height: 56px;
  padding: 0 12px;
  align-items: center;
  gap: 6px;
  background: rgba(9, 11, 10, .97);
  border-bottom: 1px solid rgba(183, 194, 184, .13);
  backdrop-filter: blur(16px);
}
.app-header--back { grid-template-columns: 44px 1fr 44px; padding-right: 12px; }
.app-header--dark { background: rgba(245, 247, 242, .96); color: var(--ink); border-color: rgba(223, 228, 219, .82); }
.app-header__logo { width: 76px; height: 22px; object-fit: contain; }
.app-header__title { position: absolute; right: 60px; bottom: 18px; left: 60px; overflow: hidden; color: #f1f4ef; text-align: center; font-size: 15px; font-weight: 700; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.brand-wordmark { align-self: center; }
.app-header--back .icon-button {
  padding: 0;
  color: #f1f4ef;
}
.app-header--dark.app-header--back .icon-button { color: #f1f4ef; }
.icon-spacer { width: 44px; height: 44px; }
.app-header__right { display: flex; width: 44px; height: 44px; grid-column: 3; align-items: center; justify-content: center; justify-self: end; }
[data-theme="dark"] .app-header,
[data-theme="dark"] .app-header--dark { background: rgba(9,11,10,.97); border-color: rgba(183,194,184,.13); }
.app-header.app-header--back.app-header--plain-back .icon-button,
[data-theme="dark"] .app-header.app-header--back.app-header--plain-back .icon-button {
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
</style>
