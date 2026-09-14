<script setup lang="ts">
import UiIcon from "@/components/UiIcon.vue";
import type { UiIconName } from "@/assets/ui/icon-registry";
import type { FeedbackTone } from "@/composables/useFeedback";

withDefaults(defineProps<{ open: boolean; title?: string; content?: string; tone?: FeedbackTone; icon?: UiIconName; dismissible?: boolean }>(), {
  title: "", content: "", tone: "info", icon: "Info", dismissible: true,
});
const emit = defineEmits<{ dismiss: [] }>();
</script>

<template>
  <view v-if="open" class="modal-layer">
    <button class="modal-scrim" aria-label="Close" @click="dismissible && emit('dismiss')" />
    <view class="modal-panel" role="dialog" aria-modal="true">
      <view class="modal-icon" :class="`modal-icon--${tone}`"><UiIcon :name="icon" :tone="tone" :size="25" /></view>
      <text v-if="title" class="modal-title">{{ title }}</text>
      <text v-if="content" class="modal-copy">{{ content }}</text>
      <slot />
      <view v-if="$slots.actions" class="modal-actions"><slot name="actions" /></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.modal-layer { position: fixed; z-index: 90; inset: 0; display: flex; padding: 20px; align-items: center; justify-content: center; }
.modal-scrim { position: absolute; inset: 0; width: 100%; height: 100%; background: var(--bs-vi-sys-color-background-overlay); }
.modal-panel { position: relative; z-index: 1; width: 100%; max-width: var(--bs-vi-component-modal-max-width); padding: 20px; border: 1px solid var(--v3-divider); border-radius: 16px; background: var(--surface); box-shadow: var(--v3-shadow-raised); text-align: center; }
.modal-icon { display: flex; width: 48px; height: 48px; margin: 0 auto 14px; align-items: center; justify-content: center; border-radius: 12px; background: var(--bs-vi-sys-color-status-info-background); }
.modal-icon--success { background: var(--bs-vi-sys-color-status-success-background); }.modal-icon--warning { background: var(--bs-vi-sys-color-status-warning-background); }.modal-icon--danger { background: var(--bs-vi-sys-color-status-danger-background); }
.modal-title { display: block; color: var(--ink); font-size: 18px; font-weight: 600; line-height: 1.3; }
.modal-copy { display: block; margin: 8px auto 0; color: var(--muted); font-size: 13px; line-height: 1.55; }
.modal-actions { display: grid; margin-top: 20px; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 12px; }
</style>
