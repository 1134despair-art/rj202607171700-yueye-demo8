<script setup lang="ts">
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { House, Compass, UserRound } from "lucide-vue-next";
import UiIcon from "@/components/UiIcon.vue";

type TabKey = "home" | "controls" | "service" | "me";
const props = defineProps<{ active: TabKey }>();
const { t } = useI18n();
const tabs = [
  { key: "home" as const, route: "/pages/home/index", icon: House },
  { key: "controls" as const, route: "/pages/controls/index", icon: null },
  { key: "service" as const, route: "/pages/service/index", icon: Compass },
  { key: "me" as const, route: "/pages/me/index", icon: UserRound },
];
onMounted(() => { uni.hideTabBar({ animation: false }); });
function open(key: TabKey, route: string) {
  if (key !== props.active) uni.switchTab({ url: route });
}
</script>

<template>
  <view class="summit-dock">
    <view class="summit-tabs" role="tablist" :aria-label="t('home.controls')">
      <button v-for="tab in tabs" :key="tab.key" class="summit-tab" :class="{ active: active === tab.key }" role="tab" :aria-label="t(`tabs.${tab.key}`)" :aria-selected="active === tab.key" @click="open(tab.key,tab.route)">
        <component v-if="tab.icon" :is="tab.icon" class="summit-tab__icon" :size="24" :stroke-width="active === tab.key ? 2.2 : 1.8" />
        <UiIcon v-else name="Bike" class="summit-tab__icon" :size="24" :tone="active === tab.key ? 'brand' : 'muted'" />
        <text>{{ t(`tabs.${tab.key}`) }}</text>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.summit-dock { position: fixed; z-index: 70; right: 0; bottom: 0; left: 0; }
.summit-tabs { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); height: var(--v5-tabbar-height); padding: 6px 0 max(8px,env(safe-area-inset-bottom)); border-top: 1px solid rgba(183,194,184,.16); border-radius: 0; background: rgba(12,15,13,.98); backdrop-filter: blur(12px); box-shadow: none; }
.summit-tab { position: relative; display: flex; min-width: 0; height: 50px; min-height: 50px; padding: 3px 4px; flex-direction: column; gap: 5px; align-items: center; justify-content: center; color: #656b66; font-size: 10px; font-weight: 600; line-height: 1; background: transparent; }
.summit-tab.active { color: #eef2eb; font-weight: 700; }
.summit-tab.active::before { position: absolute; top: -7px; width: 32px; height: 2px; background: #a4f45a; content: ''; }
.summit-tab__icon { width: 24px; height: 24px; opacity: .9; }
.summit-tab:not(.active) .summit-tab__icon { opacity: .82; }
.summit-tab.active .summit-tab__icon { opacity: 1; }
</style>
