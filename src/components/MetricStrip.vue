<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; value: string; accent?: boolean }>;
}>();
</script>

<template>
  <view class="metric-strip">
    <view v-for="item in items" :key="item.label" class="metric-strip__item">
      <text class="metric-strip__value" :class="{ 'metric-strip__value--accent': item.accent }">{{ item.value }}</text>
      <text class="metric-strip__label">{{ item.label }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.metric-strip { display: grid; min-height: 74px; grid-template-columns: repeat(3, 1fr); background: var(--surface); }
.metric-strip__item { position: relative; display: flex; min-width: 0; padding: 13px 6px; flex-direction: column; align-items: center; justify-content: center; }
.metric-strip__item + .metric-strip__item::before { position: absolute; top: 18px; bottom: 18px; left: 0; width: 1px; content: ""; background: var(--divider); }
.metric-strip__value { color: var(--navy); font-family: var(--bs-vi-sys-typography-family); font-size: 20px; font-variant-numeric: tabular-nums; font-weight: 700; line-height: 1; white-space: nowrap; }
.metric-strip__value--accent { color: var(--bs-vi-sys-color-text-success); }
.metric-strip__label { margin-top: 6px; color: var(--muted); font-size: 12px; text-align: center; }
</style>
