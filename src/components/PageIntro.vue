<script setup lang="ts">
import UiIcon from "@/components/UiIcon.vue";
import type { UiIconName, UiIconTone } from "@/assets/ui/icon-registry";

const props = withDefaults(defineProps<{
  eyebrow?: string;
  title: string;
  copy?: string;
  icon: UiIconName;
  tone?: UiIconTone;
  compact?: boolean;
}>(), {
  eyebrow: "BINSEN RIDE",
  copy: "",
  tone: "navy",
  compact: false,
});
</script>

<template>
  <view class="page-intro" :class="{ 'page-intro--compact': props.compact }">
    <view class="page-intro__copy">
      <text class="page-intro__eyebrow">{{ props.eyebrow }}</text>
      <text class="page-intro__title">{{ props.title }}</text>
      <text v-if="props.copy" class="page-intro__description">{{ props.copy }}</text>
      <slot name="meta" />
    </view>
    <view class="page-intro__emblem" :class="`page-intro__emblem--${props.tone}`">
      <UiIcon :name="props.icon" :tone="props.tone" :size="props.compact ? 23 : 28" />
    </view>
    <slot />
  </view>
</template>

<style scoped lang="scss">
.page-intro {
  position: relative;
  display: grid;
  min-height: 172px;
  padding: 27px var(--bs-vi-sys-spacing-page-default) 25px;
  overflow: hidden;
  align-items: start;
  background: var(--page-stage-glow);
  border-bottom: 1px solid rgba(221,226,218,.76);
  grid-template-columns: minmax(0, 1fr) 56px;
  gap: 20px;
}
.page-intro::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  content: "";
  background: linear-gradient(90deg, transparent, rgba(193,229,78,.72) 36%, transparent 82%);
}
.page-intro--compact { min-height: 148px; padding-top: 23px; padding-bottom: 22px; }
.page-intro__copy { position: relative; z-index: 1; display: flex; min-width: 0; flex-direction: column; }
.page-intro__eyebrow { display: flex; align-items: center; gap: 8px; color: #657d13; font-size: 11px; font-weight: 800; line-height: 1.2; }
.page-intro__eyebrow::before { width: 18px; height: 3px; flex: 0 0 18px; border-radius: 999px; background: var(--accent); content: ""; }
.page-intro__title { margin-top: 10px; color: var(--ink); font-size: 30px; font-weight: 850; line-height: 1.1; }
.page-intro__description { max-width: 280px; margin-top: 9px; color: var(--muted); font-size: 12px; line-height: 1.55; }
.page-intro__emblem { position: relative; z-index: 1; display: flex; width: 56px; height: 56px; align-items: center; justify-content: center; border: 1px solid rgba(221,226,218,.82); border-radius: 10px; background: rgba(255,255,255,.92); box-shadow: var(--card-shadow); }
.page-intro__emblem--info { background: var(--bs-vi-sys-color-status-info-background); }
.page-intro__emblem--success { background: var(--bs-vi-sys-color-status-success-background); }
.page-intro__emblem--warning { background: var(--bs-vi-sys-color-status-warning-background); }
.page-intro__emblem--danger { background: var(--bs-vi-sys-color-status-danger-background); }
@media (max-width: 389px) {
  .page-intro { padding-right: var(--bs-vi-sys-spacing-page-compact); padding-left: var(--bs-vi-sys-spacing-page-compact); grid-template-columns: minmax(0, 1fr) 52px; gap: 12px; }
  .page-intro__emblem { width: 52px; height: 52px; }
}
</style>
