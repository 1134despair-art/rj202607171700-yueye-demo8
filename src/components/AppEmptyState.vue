<script setup lang="ts">
defineProps<{ title: string; copy?: string }>();
</script>

<template><view class="app-empty-state"><view class="empty-mark"><slot name="icon" /></view><text class="empty-title">{{ title }}</text><text v-if="copy" class="empty-copy">{{ copy }}</text><slot /></view></template>

<style scoped lang="scss">
.app-empty-state { display: flex; padding: 32px 24px; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.empty-mark { display: flex; width: var(--v3-detail-icon-size); height: var(--v3-detail-icon-size); margin: 0 auto; align-items: center; justify-content: center; border-radius: 50%; background: var(--v3-info-soft); color: var(--v3-info); }
</style>
