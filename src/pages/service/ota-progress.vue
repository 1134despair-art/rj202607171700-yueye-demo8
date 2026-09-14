<script setup lang="ts">
import { computed } from "vue";
import { onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useFeedback } from "@/composables/useFeedback";
import { useAppStore } from "@/stores/app";
import { useOtaStore } from "@/stores/ota";
import { useVehicleStore } from "@/stores/vehicle";

const app = useAppStore();
const ota = useOtaStore();
const vehicle = useVehicleStore();
const feedback = useFeedback();
const { t } = useI18n();
const active = computed(() => ["transferring", "installing", "restarting"].includes(ota.session.stage));
const canPause = computed(() => ota.session.stage === "transferring");
const visualProgress = computed(() => ota.session.stage === "success" || ota.session.rollbackState === "success" ? 100 : Math.max(0, Math.min(100, ota.session.progress)));
const ringStyle = computed(() => ({ "--ring-progress": `${visualProgress.value}%` }));
const rollbackResult = computed(() => ota.session.rollbackState === "success" || ota.session.rollbackState === "service-required");
const stageTitle = computed(() => {
  if (ota.session.rollbackState === "running") return t("ota.rollbackRunning");
  if (ota.session.rollbackState === "success") return t("ota.rollbackSuccess");
  if (ota.session.rollbackState === "service-required") return t("ota.rollbackService");
  if (ota.session.stage === "available" && ota.session.verificationState !== "success") return t("ota.preparationRequired");
  return t(`ota.stages.${ota.session.stage}`);
});
const stageCopy = computed(() => {
  if (ota.session.rollbackState === "running") return t("ota.stageCopy.rollback");
  if (ota.session.rollbackState === "success") return t("ota.rollbackSuccessCopy");
  if (ota.session.rollbackState === "service-required") return t("ota.rollbackServiceCopy");
  if (ota.session.stage === "available" && ota.session.verificationState !== "success") return t("ota.preparationRequiredCopy");
  return ota.session.stage === "success" ? t("ota.stageCopy.success", { version: ota.session.currentVersion }) : t(ota.session.stage === "failed" && ota.session.error ? ota.session.error : `ota.stageCopy.${ota.session.stage}`);
});
const stageItems = ["ota.download", "ota.verify", "ota.transfer", "ota.install", "ota.restart"];

function stageDone(index: number) {
  if (index <= 1) return ota.session.verificationState === "success";
  return ota.session.progress >= [0, 0, 88, 96, 100][index];
}

function stageCurrent(index: number) {
  if (index < 2) return false;
  return ota.session.progress >= [0, 0, 1, 88, 96][index]
    && ota.session.progress < [0, 0, 88, 96, 100][index];
}

function finish() { uni.switchTab({ url: "/pages/service/index" }); }
function backToOta() { uni.redirectTo({ url: "/pages/service/ota" }); }

async function startAvailable() {
  if (!vehicle.isConnected) {
    feedback.toast({ message: t("ota.connectBefore"), tone: "warning" });
    return;
  }
  if (ota.session.verificationState !== "success") {
    const ready = await ota.prepareUpdate(app.preferences.otaScenario);
    if (!ready) {
      feedback.toast({ message: t("ota.verifyFailed"), tone: "danger" });
      return;
    }
    feedback.toast({ message: t("ota.verifySuccessNext"), tone: "success" });
  }
  if (ota.start(app.preferences.otaScenario)) feedback.toast({ message: t("ota.updateStarted"), tone: "success" });
}

async function rollback() {
  const confirmed = await feedback.confirm({ title: t("ota.keepPrevious"), content: t("ota.stageCopy.rollback"), tone: "warning", cancelText: t("common.cancel") });
  if (confirmed) await ota.rollback(app.preferences.otaScenario);
}

onUnload(() => { if (active.value) ota.pause(); });
</script>

<template>
  <view class="page-shell safe-bottom">
    <AppHeader :title="t('ota.progressTitle')" back fallback="/pages/service/ota" />
    <view class="progress-hero" :class="{ failed: ota.session.stage === 'failed' || ota.session.rollbackState === 'service-required', success: ota.session.stage === 'success' || ota.session.rollbackState === 'success' }">
      <view class="progress-ring" :style="ringStyle"><view><UiIcon v-if="ota.session.stage === 'failed' || ota.session.rollbackState === 'service-required'" name="AlertTriangle" tone="danger" :size="28" /><UiIcon v-else-if="ota.session.stage === 'success' || ota.session.rollbackState === 'success'" name="Check" tone="success" :size="30" /><UiIcon v-else-if="ota.session.rollbackState === 'running'" name="RotateCcw" tone="warning" :size="30" spinning /><text v-else class="brand-font">{{ visualProgress }}%</text></view></view>
      <text class="stage-title brand-font">{{ stageTitle }}</text>
      <text class="stage-copy">{{ stageCopy }}</text>
      <view v-if="!rollbackResult" class="hero-progress"><view :style="{ width: ota.session.progress + '%' }" /></view>
    </view>
    <view class="content">
      <view v-if="!rollbackResult" class="stage-list card">
        <view v-for="(item, index) in stageItems" :key="item" class="stage-row"><view :class="{ done: stageDone(index), current: stageCurrent(index) }"><UiIcon v-if="stageDone(index)" name="Check" tone="success" :size="13" /><text v-else>{{ index + 1 }}</text></view><text>{{ t(item) }}</text></view>
      </view>
      <button v-if="canPause" class="secondary-button action" @click="ota.pause"><UiIcon name="Pause" :size="18" />{{ t("ota.pause") }}</button>
      <button v-else-if="ota.session.stage === 'available'" class="primary-button action" @click="startAvailable"><UiIcon name="Play" tone="inverse" :size="18" />{{ ota.session.verificationState === "success" ? t("ota.start") : t("ota.prepareAndStart") }}</button>
      <button v-else-if="ota.session.stage === 'paused'" class="primary-button action" @click="ota.resume"><UiIcon name="Play" tone="inverse" :size="18" />{{ t("ota.resume") }}</button>
      <button v-else-if="ota.session.stage === 'failed' && ota.session.rollbackState !== 'service-required'" class="primary-button action primary-button--red" @click="ota.retry"><UiIcon name="RotateCcw" tone="inverse" :size="18" />{{ t("ota.retry", { progress: ota.session.progress }) }}</button>
      <button v-if="ota.session.stage === 'failed' && ota.session.rollbackState !== 'service-required'" class="secondary-button rollback" @click="rollback">{{ t("ota.keepPrevious") }}</button>
      <button v-if="ota.session.stage === 'success'" class="primary-button action" @click="finish">{{ t("common.done") }}</button>
      <button v-if="ota.session.rollbackState === 'success'" class="primary-button action" @click="backToOta">{{ t("ota.backToCenter") }}</button>
      <button v-if="ota.session.rollbackState === 'service-required'" class="secondary-button action" @click="finish">{{ t("ota.returnService") }}</button>
      <view class="safety-message"><text>{{ t("ota.doNotPowerOff") }}</text><text>{{ t("ota.safetyCopy") }}</text></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.progress-hero { display: flex; min-height: 240px; padding: 24px 22px; flex-direction: column; align-items: center; justify-content: center; background: var(--stage-bg); color: var(--ink); text-align: center; }
.progress-ring { display: flex; width: 112px; height: 112px; padding: 7px; align-items: center; justify-content: center; border-radius: 50%; background: conic-gradient(var(--ride-green) var(--ring-progress, 0%), var(--bs-vi-sys-color-border-strong) 0); box-shadow: 0 0 0 1px rgba(223,228,219,.7); transform: rotate(-90deg); }
.progress-ring > view { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; border-radius: 50%; background: var(--surface); }
.progress-ring > view > * { transform: rotate(90deg); }
.progress-ring .brand-font { font-size: 32px; }
.stage-title { margin-top: 16px; font-size: 22px; }
.stage-copy { max-width: 310px; margin-top: 7px; color: var(--muted); font-size: 13px; line-height: 1.5; }
.hero-progress { width: 180px; height: 4px; margin-top: 16px; overflow: hidden; border-radius: 2px; background: var(--bs-vi-sys-color-border-strong); }
.hero-progress view { height: 100%; background: var(--ride-green); transition: width .2s ease; }
.progress-hero.failed .progress-ring { background: conic-gradient(var(--signal-red) var(--ring-progress, 0%), var(--bs-vi-sys-color-border-strong) 0); }
.progress-hero.failed .hero-progress view { background: var(--signal-red); }
.progress-hero.failed .stage-title { color: var(--signal-red); }
.progress-hero.success .progress-ring { background: var(--ride-green); }
.progress-hero.success .stage-title { color: var(--bs-vi-sys-color-text-success); }
.stage-list { padding: 7px 14px; }
.stage-row { display: flex; min-height: 48px; align-items: center; gap: 10px; color: var(--muted); font-size: 13px; }
.stage-row > view { display: flex; width: 24px; height: 24px; align-items: center; justify-content: center; border-radius: 50%; background: var(--bs-vi-sys-color-background-surface-muted); color: var(--muted); font-size: 11px; font-weight: 700; }
.stage-row > view.done { background: var(--bs-vi-sys-color-status-success-background); color: var(--bs-vi-sys-color-text-success); }
.stage-row > view.current { border: 1px solid var(--signal-red); background: var(--surface); color: var(--signal-red); }
.action { margin-top: 20px; }
.rollback { margin-top: 10px; }
.safety-message { margin-top: 18px; padding: 13px; border-left: 3px solid var(--warning); border-radius: 12px; background: var(--bs-vi-sys-color-status-warning-background); }
.safety-message text { display: block; }
.safety-message text:first-child { color: var(--bs-vi-sys-color-text-warning); font-size: 12px; font-weight: 700; }
.safety-message text:last-child { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.5; }
</style>
