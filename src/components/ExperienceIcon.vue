<script setup lang="ts">
defineProps<{ kind: 'sound' | 'team' | 'light' | 'mic' }>();
</script>
<template>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="kind === 'sound'"><path d="M11 4 5 9H2v6h3l6 5V4Z" /><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></template>
    <template v-else-if="kind === 'team'"><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-2-4" /></template>
    <template v-else-if="kind === 'mic'"><rect x="8" y="2" width="8" height="13" rx="4" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></template>
    <template v-else><path d="M8 16c0-3-3-4-3-8a7 7 0 1 1 14 0c0 4-3 5-3 8H8Zm0 3h8m-6 3h4M12 5v5m-2-2 2 2 2-2" /></template>
  </svg>
</template>
