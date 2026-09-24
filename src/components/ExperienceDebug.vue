<script setup lang="ts">
import { useExperienceStore } from '@/stores/experience';
import { useVehicleStore } from '@/stores/vehicle';
import { useFeedback } from '@/composables/useFeedback';
defineProps<{ team?: boolean }>();
const experience = useExperienceStore();
const vehicle = useVehicleStore();
const feedback = useFeedback();
function receive() {
  try { experience.mockIncomingInvite(); uni.navigateTo({ url: '/pages/controls/team-invitation' }); }
  catch (reason) { feedback.toast({ message: reason instanceof Error ? reason.message : '模拟邀请失败', tone: 'warning' }); }
}
</script>
<template>
  <details class="experience-debug">
    <summary>演示联调场景</summary>
    <view class="experience-stack">
      <text class="experience-copy">仅用于验证流程，以下操作不会控制真实车辆。</text>
      <button class="experience-button" data-testid="experience-fail-next" :disabled="Boolean(experience.busy)" @click="experience.failNextCommand = !experience.failNextCommand">{{ experience.failNextCommand ? '已设定下次传输失败 · 点击取消' : '模拟下一次传输失败' }}</button>
      <template v-if="team">
        <button class="experience-button" data-testid="team-empty-scenario" :disabled="experience.searching" @click="experience.searchEmpty = !experience.searchEmpty">{{ experience.searchEmpty ? '搜索场景：无附近车辆' : '搜索场景：三辆演示车辆' }}</button>
        <button class="experience-button" data-testid="team-incoming-demo" :disabled="!vehicle.isConnected || Boolean(experience.team) || Boolean(experience.busy)" @click="receive">模拟收到组队邀请</button>
        <button v-if="experience.team" class="experience-button" data-testid="team-poweroff-demo" :disabled="Boolean(experience.busy)" @click="experience.mockCaptainPowerOff()">模拟队长车辆下电</button>
      </template>
    </view>
  </details>
</template>
<style scoped>
.experience-debug { padding: 0 12px; border: 1px dashed var(--divider); border-radius: 12px; }
.experience-debug summary { display: list-item; min-height: 44px; padding: 12px 0; color: var(--muted); font-size: 12px; cursor: pointer; }
.experience-debug > view { padding-bottom: 12px; }
</style>
