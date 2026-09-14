<script setup lang="ts">
import type { BleState } from "@/types";
import UiIcon from "@/components/UiIcon.vue";
import AppBottomSheet from "@/components/AppBottomSheet.vue";

const props = defineProps<{ open: boolean; state: BleState; title: string; copy: string; retryLabel: string; closeLabel: string }>();
const emit = defineEmits<{ (event: "close"): void; (event: "retry"): void }>();
</script>

<template>
  <AppBottomSheet :open="props.open" @dismiss="emit('close')">
    <view class="connection-sheet">
      <button class="sheet-close" :aria-label="props.closeLabel" @click="emit('close')"><UiIcon name="X" :size="20" /></button>
      <view class="sheet-status" :class="`sheet-status--${props.state}`">
        <UiIcon v-if="props.state === 'connected'" name="Check" tone="success" :size="28" />
        <UiIcon v-else-if="props.state === 'failed'" name="RefreshCw" tone="danger" :size="27" />
        <UiIcon v-else name="Bluetooth" tone="info" :size="28" />
      </view>
      <text class="sheet-title">{{ props.title }}</text>
      <text class="sheet-copy">{{ props.copy }}</text>
      <view v-if="props.state === 'scanning' || props.state === 'connecting'" class="sheet-progress"><view /></view>
      <button v-if="props.state === 'failed'" class="primary-button" @click="emit('retry')">{{ props.retryLabel }}</button>
    </view>
  </AppBottomSheet>
</template>

<style scoped lang="scss">
.connection-sheet { position: relative; width: 100%; text-align: center; }
.sheet-close { position: absolute; top: 1px; right: 0; display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; border-radius: 50%; background: var(--surface-muted); color: var(--muted); }
.sheet-status { display: flex; width: 62px; height: 62px; margin: 7px auto 15px; align-items: center; justify-content: center; border-radius: 50%; background: var(--bs-vi-sys-color-status-info-background); color: var(--navy); }
.sheet-status--connected { background: var(--bs-vi-sys-color-status-success-background); color: var(--ride-green); }
.sheet-status--failed { background: var(--bs-vi-sys-color-status-danger-background); color: var(--bs-vi-sys-color-text-danger); }
.sheet-status--scanning, .sheet-status--connecting { animation: breathe 1.2s ease-in-out infinite; }
.sheet-title { display: block; font-size: 19px; font-weight: 700; }
.sheet-copy { display: block; max-width: 300px; margin: 8px auto 20px; color: var(--muted); font-size: 13px; line-height: 1.55; }
.sheet-progress { height: 5px; margin: 0 16px; overflow: hidden; border-radius: 3px; background: var(--bs-vi-sys-color-border-subtle); }
.sheet-progress view { width: 42%; height: 100%; border-radius: 3px; background: var(--navy); animation: scan 1.15s ease-in-out infinite; }
.primary-button { margin-top: 18px; }
@keyframes scan { 50% { transform: translateX(138%); } }
@keyframes breathe { 50% { transform: scale(.94); opacity: .7; } }
</style>
