<script setup lang="ts">
const props = defineProps<{ modelValue: boolean; disabled?: boolean; label: string; description?: string }>();
const emit = defineEmits<{ (event: "update:modelValue", value: boolean): void }>();
</script>

<template>
  <button class="toggle-row" :disabled="props.disabled" @click="emit('update:modelValue', !props.modelValue)">
    <slot name="icon" />
    <view class="toggle-row__copy"><text class="toggle-row__label">{{ props.label }}</text><text v-if="props.description" class="toggle-row__description">{{ props.description }}</text></view>
    <view class="toggle" :class="{ 'toggle--on': props.modelValue, 'toggle--disabled': props.disabled }"><view class="toggle__thumb" /></view>
  </button>
</template>

<style scoped lang="scss">
.toggle-row { display: flex; width: 100%; min-height: 76px; padding: 12px 16px; align-items: center; gap: 12px; background: var(--surface); color: var(--ink); text-align: left; }
.toggle-row__copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.toggle-row__label { font-size: 14px; font-weight: 600; line-height: 1.35; }
.toggle-row__description { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.45; }
.toggle { position: relative; width: 44px; height: 26px; flex: 0 0 auto; border-radius: 13px; background: #d9ded7; transition: background var(--v3-motion) ease; }
.toggle__thumb { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; box-shadow: 0 1px 3px rgba(0,0,0,.2); transition: transform .2s ease; }
.toggle--on { background: var(--v3-accent); }
.toggle--on .toggle__thumb { transform: translateX(20px); }
.toggle--disabled { background: #cfd4ce; }
.toggle--disabled .toggle__thumb { box-shadow: none; }
</style>
