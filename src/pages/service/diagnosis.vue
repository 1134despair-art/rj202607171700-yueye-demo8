<script setup lang="ts">
import { computed } from "vue";
import { onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useAppStore } from "@/stores/app";
import { useDiagnosisStore } from "@/stores/diagnosis";
import { useVehicleStore } from "@/stores/vehicle";
import { useFeedback } from "@/composables/useFeedback";

const app = useAppStore();
const diagnosis = useDiagnosisStore();
const vehicle = useVehicleStore();
const { t } = useI18n();
const feedback = useFeedback();
const buttonLabel = computed(() => diagnosis.running ? t("diagnosis.scanning", { progress: diagnosis.progress }) : t("diagnosis.start"));
const moduleName = (module: string) => t(`service.moduleNames.${module.toLowerCase()}`);

async function run() {
  if (!vehicle.isConnected) return feedback.toast({ message: t("diagnosis.connectBefore"), tone: "warning" });
  const result = await diagnosis.run(app.preferences.diagnosisScenario);
  if (result) {
    feedback.toast({ message: t(result.healthy ? "diagnosis.completedHealthy" : "diagnosis.completedAttention"), tone: result.healthy ? "success" : "warning" });
    uni.navigateTo({ url: "/pages/service/diagnosis-result" });
  }
}

function cancel() {
  diagnosis.stop();
  feedback.toast({ message: t("diagnosis.cancelled"), tone: "info" });
}

onUnload(() => { if (diagnosis.running) diagnosis.stop(); });
</script>

<template>
  <view class="page-shell safe-bottom">
    <AppHeader :title="t('diagnosis.title')" back />
    <view class="diagnosis-hero">
      <view class="scan-ring" :class="{ running: diagnosis.running }"><text>{{ diagnosis.progress }}%</text><text>{{ t("diagnosis.complete") }}</text></view>
      <text>{{ diagnosis.running ? t("diagnosis.keepConnected") : t("diagnosis.fourModule") }}</text>
      <text>{{ t("diagnosis.copy") }}</text>
    </view>
    <view class="content">
      <view class="card module-card">
        <view v-for="item in diagnosis.items" :key="item.id" class="scan-row">
          <view class="scan-state" :class="`scan-state--${item.status}`"><UiIcon v-if="item.status === 'ok'" name="Check" tone="success" :size="17" /><UiIcon v-else-if="item.status === 'warning'" name="TriangleAlert" tone="warning" :size="17" /><UiIcon v-else name="CircleDashed" :tone="item.status === 'checking' ? 'info' : 'muted'" :size="17" :spinning="item.status === 'checking'" /></view>
          <view><text>{{ moduleName(item.module) }}</text><text>{{ item.status === 'checking' ? t("diagnosis.checking") : item.message ? t(item.message) : t("diagnosis.waiting") }}</text></view>
          <text class="module-status">{{ t(`diagnosis.status.${item.status}`) }}</text>
        </view>
      </view>
      <view v-if="diagnosis.running" class="progress-track"><view class="progress-fill" :style="{ width: diagnosis.progress + '%' }" /></view>
      <button class="primary-button start-button" :disabled="diagnosis.running || !vehicle.isConnected" @click="run">{{ buttonLabel }}</button>
      <button v-if="diagnosis.running" class="secondary-button history-button" @click="cancel">{{ t("diagnosis.cancel") }}</button>
      <button v-else-if="diagnosis.latest" class="secondary-button history-button" @click="uni.navigateTo({ url: '/pages/service/diagnosis-result' })">{{ t("diagnosis.viewLatest") }}</button>
      <text v-if="!vehicle.isConnected" class="connection-note">{{ t("diagnosis.offline") }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.diagnosis-hero { display: flex; min-height: 180px; padding: 18px 20px; flex-direction: column; align-items: center; justify-content: center; background: var(--stage-bg); color: var(--ink); text-align: center; }
.scan-ring { position: relative; display: flex; width: 84px; height: 84px; margin-bottom: 12px; flex-direction: column; align-items: center; justify-content: center; border: 2px solid var(--bs-vi-sys-color-border-strong); border-radius: 50%; background: var(--surface-stage-translucent); }
.scan-ring.running::before { position: absolute; inset: -2px; border: 2px solid transparent; border-top-color: var(--ride-green); border-radius: 50%; content: ""; animation: subtle-spin 1.4s linear infinite; }
.scan-ring text:first-child { font-family: var(--bs-vi-sys-typography-family); font-size: 24px; font-variant-numeric: tabular-nums; font-weight: 700; }
.scan-ring text:last-child { margin-top: 2px; color: var(--muted); font-size: 11px; font-weight: 700; }
.diagnosis-hero > text:nth-child(2) { font-weight: 700; }
.diagnosis-hero > text:nth-child(3) { max-width: 310px; margin-top: 6px; color: var(--muted); font-size: 13px; line-height: 1.5; }
.module-card { padding: 0 14px; }
.scan-row { display: flex; min-height: 68px; align-items: center; gap: 11px; border-bottom: 1px solid var(--divider); }
.scan-row:last-child { border: 0; }
.scan-state { display: flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 50%; background: var(--bs-vi-sys-color-background-surface-muted); color: var(--muted); }
.scan-state--checking { color: var(--bs-vi-sys-color-text-warning); background: var(--bs-vi-sys-color-status-warning-background); }
.scan-state--ok { color: var(--bs-vi-sys-color-text-success); background: var(--bs-vi-sys-color-status-success-background); }
.scan-state--warning { color: var(--bs-vi-sys-color-text-danger); background: var(--bs-vi-sys-color-status-danger-background); }
.scan-row > view:nth-child(2) { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.scan-row > view:nth-child(2) text:first-child { font-weight: 700; }
.scan-row > view:nth-child(2) text:last-child { margin-top: 3px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.module-status { color: var(--muted); font-size: 11px; text-transform: uppercase; }
.progress-track { margin-top: 14px; }
.start-button { margin-top: 20px; }
.history-button { margin-top: 10px; }
.connection-note { display: block; margin-top: 10px; color: var(--bs-vi-sys-color-text-danger); font-size: 12px; text-align: center; }
@keyframes subtle-spin { to { transform: rotate(360deg); } }
</style>
