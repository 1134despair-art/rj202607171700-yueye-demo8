<script setup lang="ts">
withDefaults(defineProps<{ open: boolean; dismissible?: boolean }>(), { dismissible: true });
const emit = defineEmits<{ dismiss: [] }>();
</script>

<template>
  <view v-if="open" class="sheet-layer">
    <button class="sheet-scrim" aria-label="Close" @click="dismissible && emit('dismiss')" />
    <view class="sheet-panel" role="dialog" aria-modal="true"><view class="sheet-handle" /><slot /></view>
  </view>
</template>

<style scoped lang="scss">
.sheet-layer { position: fixed; z-index: 90; inset: 0; display: flex; align-items: flex-end; }
.sheet-scrim { position: absolute; inset: 0; width: 100%; height: 100%; background: var(--bs-vi-sys-color-background-overlay); }
.sheet-panel { position: relative; z-index: 1; width: 100%; max-height: calc(100% - 44px); overflow-y: auto; padding: 12px 20px calc(20px + env(safe-area-inset-bottom)); border-radius: 16px 16px 0 0; background: var(--surface); box-shadow: var(--v3-shadow-raised); }
.sheet-handle { width: 38px; height: 4px; margin: 0 auto 14px; border-radius: 2px; background: var(--bs-vi-sys-color-border-strong); }
</style>
