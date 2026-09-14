<script setup lang="ts">
import UiIcon from "@/components/UiIcon.vue";

withDefaults(defineProps<{ dark?: boolean }>(), { dark: false });
</script>

<template>
  <!-- #ifdef H5 -->
  <view class="ios-status-bar" :class="{ 'ios-status-bar--dark': dark }" aria-hidden="true">
    <text class="ios-time">9:41</text>
    <view class="ios-indicators">
      <UiIcon name="IosCellular" :tone="dark ? 'inverse' : 'navy'" :size="15" />
      <UiIcon name="Wifi" :tone="dark ? 'inverse' : 'navy'" :size="14" />
      <UiIcon name="IosBattery" :tone="dark ? 'inverse' : 'navy'" :size="18" />
    </view>
  </view>
  <!-- #endif -->
</template>

<style scoped lang="scss">
.ios-status-bar { position: absolute; z-index: 60; top: 0; right: 0; left: 0; display: flex; height: 28px; padding: 4px 17px 0; align-items: center; justify-content: space-between; color: var(--ink); pointer-events: none; }
.ios-status-bar--dark { color: white; }
.ios-time { min-width: 42px; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 700; line-height: 1; text-align: center; }
.ios-indicators { display: flex; height: 18px; align-items: center; gap: 6px; }
.ios-cellular { display: flex; height: 12px; align-items: flex-end; gap: 1.5px; }
.ios-cellular text { width: 2.5px; border-radius: 1px; background: currentColor; }
.ios-cellular text:nth-child(1) { height: 4px; }
.ios-cellular text:nth-child(2) { height: 6px; }
.ios-cellular text:nth-child(3) { height: 8px; }
.ios-cellular text:nth-child(4) { height: 10px; }
.ios-battery { position: relative; width: 20px; height: 10px; padding: 1px; border: 1.4px solid currentColor; border-radius: 3px; }
.ios-battery > view { width: 82%; height: 100%; border-radius: 1px; background: currentColor; }
.ios-battery > text { position: absolute; top: 2px; right: -3.5px; width: 2px; height: 4px; border-radius: 0 1px 1px 0; background: currentColor; opacity: .5; }
</style>
