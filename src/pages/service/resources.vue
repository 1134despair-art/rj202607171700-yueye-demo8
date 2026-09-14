<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import ServiceResourceList from "@/components/ServiceResourceList.vue";
import { serviceResources } from "@/mock/serviceResources";

const { t } = useI18n();
</script>

<template>
  <view class="page-shell safe-bottom resources-page">
    <AppHeader :title="t('resources.title')" back />
    <view class="content">
      <view class="resources-intro">
        <view class="resources-intro__icon"><UiIcon name="Download" tone="info" :size="24" /></view>
        <view><text>{{ t("resources.heading") }}</text><text>{{ t("resources.copy") }}</text></view>
        <text class="resource-count">{{ serviceResources.length }} {{ t("resources.itemUnit") }}</text>
      </view>

      <ServiceResourceList />
    </view>
  </view>
</template>

<style scoped lang="scss">
.resources-page { background: var(--app-bg); }
.resources-intro { display: flex; min-height: 84px; margin-bottom: 20px; padding: 12px 14px; align-items: center; gap: 12px; border: 1px solid var(--divider); border-radius: 16px; background: linear-gradient(135deg, var(--v3-hero-start), var(--v3-surface)); box-shadow: var(--v3-shadow-card); }
.resources-intro__icon { display: flex; width: 44px; height: 44px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 12px; background: var(--bs-vi-sys-color-status-info-background); }
.resources-intro > view:nth-child(2) { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.resources-intro > view:nth-child(2) text:first-child { color: var(--ink); font-size: 17px; font-weight: 700; line-height: 1.25; }
.resources-intro > view:nth-child(2) text:last-child { margin-top: 5px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.resource-count { flex: 0 0 auto; color: var(--muted); font-size: 12px; font-weight: 700; }
</style>
