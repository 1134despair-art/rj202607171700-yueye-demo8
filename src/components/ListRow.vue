<script setup lang="ts">
import UiIcon from "@/components/UiIcon.vue";
const props = defineProps<{ label: string; detail?: string; danger?: boolean; chevron?: boolean }>();
</script>

<template>
  <button class="list-row" :class="{ 'list-row--danger': props.danger }"><slot name="icon" /><view class="list-row__copy"><text class="list-row__label">{{ props.label }}</text><text v-if="props.detail" class="list-row__detail">{{ props.detail }}</text></view><slot name="end" /><UiIcon v-if="props.chevron !== false" class="list-row__chevron" name="ChevronRight" tone="muted" :size="18" /></button>
</template>

<style scoped lang="scss">
.list-row { display: flex; width: 100%; min-height: 68px; padding: 10px 14px; align-items: center; gap: 11px; background: var(--surface); color: var(--ink); text-align: left; }
.list-row--danger { color: var(--bs-vi-sys-color-text-danger); }
.list-row__copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.list-row__label { font-size: 14px; font-weight: 600; line-height: 1.35; }
.list-row__detail { margin-top: 4px; overflow-wrap: anywhere; color: var(--muted); font-size: 12px; line-height: 1.45; }
.list-row__chevron { flex: 0 0 auto; color: var(--v3-subtle); }
</style>
