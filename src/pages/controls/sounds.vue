<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import PageIntro from '@/components/PageIntro.vue';
import BaseToggle from '@/components/BaseToggle.vue';
import ExperienceNotice from '@/components/ExperienceNotice.vue';
import ExperienceIcon from '@/components/ExperienceIcon.vue';
import UiIcon from '@/components/UiIcon.vue';
import { useExperienceStore } from '@/stores/experience';
import { useVehicleStore } from '@/stores/vehicle';
import { clone, soundKinds, type SoundKind, type SoundSettings } from '@/features/experience/model';
import { useFeedback } from '@/composables/useFeedback';

const experience = useExperienceStore();
const vehicle = useVehicleStore();
const feedback = useFeedback();
const draft = ref(clone(experience.profile.soundSettings));
const error = ref('');
const canWrite = computed(() => vehicle.isBound && vehicle.isConnected && !experience.busy);
const dependentDisabled = computed(() => !canWrite.value || !draft.value.speakerEnabled);
const kindIcons: Record<SoundKind, 'Power' | 'Bell' | 'Bike'> = { startup: 'Power', horn: 'Bell', reverse: 'Bike' };

watch(() => [experience.vehicleId, experience.profile.soundSettings] as const, () => {
  draft.value = clone(experience.profile.soundSettings);
  error.value = '';
}, { deep: true });

async function saveSettings(next: SoundSettings, message: string) {
  const previous = clone(experience.profile.soundSettings);
  draft.value = next;
  error.value = '';
  try {
    await experience.saveSoundSettings(next);
    feedback.toast({ message, tone: 'success' });
  } catch (reason) {
    draft.value = previous;
    error.value = reason instanceof Error ? reason.message : '音频设置失败';
  }
}
function updateSetting<Key extends keyof SoundSettings>(key: Key, value: SoundSettings[Key]) {
  const next = { ...draft.value, [key]: value } as SoundSettings;
  const labels: Record<keyof SoundSettings, string> = {
    speakerEnabled: value ? '车辆音箱已开启' : '车辆音箱已关闭',
    throttleWaveEnabled: value ? '油门联动声浪已开启' : '油门联动声浪已关闭',
    startupEnabled: value ? '开机提示音已开启' : '开机提示音已关闭',
    volume: `音量已调整为 ${value}%`,
  };
  void saveSettings(next, labels[key]);
}
function number(event: { detail: { value: number } }) { return Number(event.detail.value); }
</script>
<template>
  <view class="page-shell experience-page">
    <AppHeader title="音频设置" back />
    <PageIntro title="声音跟随每次出发" copy="控制车辆音箱、骑行声浪与三类提示音，配置仅保存在当前车辆。" eyebrow="RIDE SOUND" icon="Radio" tone="info" compact><template #emblem><ExperienceIcon kind="sound" /></template></PageIntro>
    <view class="experience-content">
      <ExperienceNotice />
      <view class="sound-settings-card">
        <BaseToggle data-testid="sound-speaker-toggle" :model-value="draft.speakerEnabled" :disabled="!canWrite" label="车辆音箱" description="控制车辆提示音与联动音效播放" @update:model-value="updateSetting('speakerEnabled', $event)">
          <template #icon><view class="sound-row-icon sound-row-icon--info"><ExperienceIcon kind="sound" /></view></template>
        </BaseToggle>
        <view class="sound-divider" />
        <BaseToggle data-testid="sound-throttle-toggle" :model-value="draft.throttleWaveEnabled" :disabled="dependentDisabled" label="油门联动声浪" description="根据转把开度实时变化音色与节奏" @update:model-value="updateSetting('throttleWaveEnabled', $event)">
          <template #icon><view class="sound-row-icon sound-row-icon--success"><UiIcon name="Gauge" tone="success" :size="20" /></view></template>
        </BaseToggle>
        <view class="sound-divider" />
        <BaseToggle data-testid="sound-startup-toggle" :model-value="draft.startupEnabled" :disabled="dependentDisabled" label="开机提示音开关" description="车辆上电后播放当前开机提示音" @update:model-value="updateSetting('startupEnabled', $event)">
          <template #icon><view class="sound-row-icon sound-row-icon--warning"><UiIcon name="Power" tone="warning" :size="20" /></view></template>
        </BaseToggle>

        <template v-for="item in soundKinds" :key="item.id">
          <view class="sound-divider" />
          <button class="sound-entry" :data-testid="`sound-${item.id}`" :disabled="!vehicle.isBound" @click="uni.navigateTo({ url: `/pages/controls/sound-detail?kind=${item.id}` })">
            <view class="sound-row-icon"><UiIcon :name="kindIcons[item.id]" tone="info" :size="20" /></view>
            <view class="sound-entry__copy"><text>{{ item.label }}</text><text>{{ experience.profile.sounds[item.id].active === 'custom' ? '当前使用自定义音效' : '当前使用系统默认' }}</text></view>
            <UiIcon name="ChevronRight" tone="muted" :size="17" />
          </button>
        </template>

        <view class="sound-divider" />
        <view class="volume-setting" :class="{ 'volume-setting--disabled': dependentDisabled }">
          <view class="sound-row-icon"><UiIcon name="Signal" tone="info" :size="20" /></view>
          <view class="volume-setting__main">
            <view class="volume-setting__header"><view><text>音量</text><text>提示音与联动声浪的播放音量</text></view><text class="volume-value">{{ draft.volume }}%</text></view>
            <slider data-testid="sound-volume" aria-label="音量" :min="0" :max="100" :value="draft.volume" :disabled="dependentDisabled" activeColor="#3569C8" backgroundColor="#E5EAF0" :block-size="20" @changing="draft.volume = number($event)" @change="updateSetting('volume', number($event))" />
          </view>
        </view>
      </view>
      <text v-if="error" class="experience-error" role="alert">{{ error }}</text>
      <view class="experience-note"><UiIcon name="Info" tone="info" :size="17" /><text>自定义音频支持 MP3 / M4A / WAV，时长 1–240 秒，单个文件不超过 30 MB。请停车后调整，避免遮挡必要的车辆警示声音。</text></view>
    </view>
  </view>
</template>

<style scoped>
.sound-settings-card { overflow: hidden; border: 1px solid var(--divider); border-radius: 14px; background: var(--surface); box-shadow: var(--card-shadow); }
.sound-divider { height: 1px; margin-left: 66px; background: var(--divider); }
.sound-row-icon { display: flex; width: 40px; height: 40px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 11px; background: var(--bs-vi-sys-color-status-info-background); color: var(--bs-vi-sys-color-text-info); }
.sound-row-icon--success { background: var(--bs-vi-sys-color-status-success-background); }
.sound-row-icon--warning { background: var(--bs-vi-sys-color-status-warning-background); }
.sound-row-icon :deep(svg) { width: 21px; height: 21px; }
.sound-entry { display: flex; width: 100%; min-height: 68px; padding: 12px 14px; align-items: center; gap: 12px; border: 0; background: var(--surface); color: var(--ink); text-align: left; }
.sound-entry:disabled { opacity: .45; }
.sound-entry__copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.sound-entry__copy text:first-child { font-size: 15px; font-weight: 600; line-height: 1.4; }
.sound-entry__copy text:last-child { margin-top: 3px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.volume-setting { display: flex; min-height: 92px; padding: 12px 14px 10px; align-items: flex-start; gap: 12px; transition: opacity .18s ease; }
.volume-setting--disabled { opacity: .45; }
.volume-setting__main { min-width: 0; flex: 1; }
.volume-setting__header { display: flex; min-height: 40px; align-items: flex-start; justify-content: space-between; gap: 8px; }
.volume-setting__header > view { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.volume-setting__header view text:first-child { color: var(--ink); font-size: 15px; font-weight: 600; line-height: 1.4; }
.volume-setting__header view text:last-child { margin-top: 3px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.volume-value { min-width: 48px; padding: 4px 8px; border-radius: 8px; background: var(--bs-vi-sys-color-status-info-background); color: var(--bs-vi-sys-color-text-info); font-size: 12px; font-weight: 700; text-align: center; }
.volume-setting slider { margin: 4px 0 0; }
@media (max-width: 340px) {
  .sound-divider { margin-left: 62px; }
  .sound-row-icon { width: 36px; height: 36px; }
  .sound-entry { padding-right: 12px; padding-left: 12px; gap: 10px; }
  .volume-setting { padding-right: 12px; padding-left: 12px; gap: 10px; }
}
</style>
