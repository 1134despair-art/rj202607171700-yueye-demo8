<script setup lang="ts">
import UiIcon from '@/components/UiIcon.vue';
import { useVehicleStore } from '@/stores/vehicle';
const vehicle = useVehicleStore();
</script>
<template>
  <view class="experience-stack">
    <view class="experience-note"><UiIcon name="Info" tone="info" :size="16" /><text>功能演示 · 车端协议待接入。配置下发、附近车辆及回执均为模拟数据。</text></view>
    <button v-if="!vehicle.isConnected" class="experience-button" data-testid="experience-connect" @click="uni.reLaunch({ url: '/pages/raven/index?screen=dashboard' })">
      <UiIcon name="Bluetooth" tone="info" :size="18" />{{ vehicle.isBound ? '连接本车后可下发配置' : '绑定车辆后使用此功能' }}<UiIcon name="ChevronRight" tone="muted" :size="16" />
    </button>
  </view>
</template>
