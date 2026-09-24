<script setup lang="ts">
import { lightEffects, soundKinds, type LightConfig, type SoundKind } from '@/features/experience/model';
defineProps<{ config: LightConfig; sound?: SoundKind | 'none' }>();
</script>
<template>
  <view class="experience-stack">
    <view v-for="zone in config.zones" :key="zone.id" class="summary-zone"><view class="summary-color" :style="{ background: zone.enabled ? zone.color : '#D7DDE6' }" /><text>氛围灯 {{ zone.id }}</text><text>{{ zone.enabled ? `${lightEffects.find(item => item.id === zone.effect)?.label} · 亮度 ${zone.brightness}% · 速度 ${zone.speed}%` : '关闭' }}</text></view>
    <text v-if="sound !== undefined" class="experience-copy">音频方案：{{ sound === 'none' ? '不联动音效' : `${soundKinds.find(item => item.id === sound)?.label}（各自本车本地播放）` }}</text>
  </view>
</template>
<style scoped>
.summary-zone { display: flex; min-height: 24px; align-items: center; gap: 8px; color: var(--muted); font-size: 11px; line-height: 1.5; }
.summary-zone > text:last-child { margin-left: auto; text-align: right; }
.summary-color { width: 10px; height: 10px; flex: 0 0 10px; border: 1px solid var(--divider); border-radius: 50%; }
</style>
