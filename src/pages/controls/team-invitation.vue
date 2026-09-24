<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { onUnload } from '@dcloudio/uni-app';
import AppHeader from '@/components/AppHeader.vue';
import ExperienceNotice from '@/components/ExperienceNotice.vue';
import ExperienceIcon from '@/components/ExperienceIcon.vue';
import LightSummary from '@/components/LightSummary.vue';
import { useExperienceStore } from '@/stores/experience';
import { useVehicleStore } from '@/stores/vehicle';
import { useFeedback } from '@/composables/useFeedback';
const experience = useExperienceStore();
const vehicle = useVehicleStore();
const feedback = useFeedback();
const now = ref(Date.now());
const error = ref('');
const seconds = computed(() => Math.max(0, Math.ceil(((experience.incoming?.expiresAt || 0) - now.value) / 1000)));
const timer = setInterval(() => { now.value = Date.now(); }, 500);
async function answer(accepted: boolean) {
  try { await experience.answerInvitation(accepted); feedback.toast({ message: accepted ? '已接受邀请（演示）' : '已拒绝邀请（演示）', tone: 'success' }); uni.navigateBack(); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : '处理失败'; }
}
onUnload(() => clearInterval(timer)); onUnmounted(() => clearInterval(timer));
</script>
<template>
  <view class="page-shell experience-page">
    <AppHeader title="组队邀请" back />
    <view class="experience-content">
      <ExperienceNotice />
      <template v-if="experience.incoming">
        <view class="experience-card experience-stack"><view class="experience-emblem experience-emblem--green"><ExperienceIcon kind="team" /></view><text class="experience-title">{{ experience.incoming.vehicle.name }}邀请你同行</text><text class="experience-copy">{{ experience.incoming.vehicle.model }} · 演示车辆 · {{ seconds ? `邀请剩余 ${seconds} 秒` : '邀请已过期' }}</text><text class="experience-tag">接受前，请确认下面的灯光与音频方案</text></view>
        <view class="experience-card experience-stack"><text class="experience-title">队长的默认方案</text><LightSummary :config="experience.incoming.plan.lights" :sound="experience.incoming.plan.sound" /><text class="experience-copy">接受后同步车队灯光。队长实时同步音效时仅在本次车队临时播放，不会保存或覆盖你的本车音效。</text></view>
        <view class="experience-note"><text>你将以队员身份加入。队长可统一下发氛围灯、双闪、鸣笛与实时音效，或移除成员、解散车队；你可随时离开并恢复本车单骑设置。</text></view>
        <view class="experience-actions"><button class="experience-button" data-testid="invite-reject" :disabled="!vehicle.isConnected || !seconds || Boolean(experience.busy)" @click="answer(false)">拒绝邀请</button><button class="experience-button experience-button--primary" data-testid="invite-accept" :disabled="!vehicle.isConnected || !seconds || Boolean(experience.busy)" @click="answer(true)">接受并加入</button></view>
        <button v-if="!seconds" class="experience-button" @click="experience.incoming = null; uni.navigateBack()">关闭过期邀请</button>
      </template>
      <view v-else class="experience-card experience-empty"><text class="experience-title">暂时没有待处理邀请</text><text class="experience-copy">邀请可能已处理，或因连接变化失效。请返回车队页面重新确认。</text></view>
      <text v-if="error" class="experience-error" role="alert">{{ error }}</text>
    </view>
  </view>
</template>
