<script setup lang="ts">
defineProps<{ columns?: number }>();
</script>

<template>
  <view class="feature-grid" :style="{ gridTemplateColumns: `repeat(${columns || 3}, 1fr)` }"><slot /></view>
</template>

<style scoped lang="scss">
.feature-grid { display: grid; overflow: hidden; border-top: 1px solid var(--divider); background: var(--surface); }
.feature-grid :deep(button) { min-width: 0; }
</style>
