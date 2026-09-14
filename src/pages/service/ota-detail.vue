<script setup lang="ts">
import { computed } from "vue";
import { onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useAppStore } from "@/stores/app";
import { useOtaStore } from "@/stores/ota";
import { useVehicleStore } from "@/stores/vehicle";
import { useFeedback } from "@/composables/useFeedback";

const app = useAppStore();
const ota = useOtaStore();
const vehicle = useVehicleStore();
const { t } = useI18n();
const feedback = useFeedback();

const preparing = computed(() => ["downloading", "verifying"].includes(ota.session.stage));
const actionLabel = computed(() => {
  if (ota.session.stage === "downloading") return t("ota.downloadingPackage", { progress: ota.downloadProgress });
  if (ota.session.stage === "verifying") return t("ota.verifying");
  if (ota.session.verificationState === "failed") return t("ota.retryOneTapUpdate");
  return t("ota.oneTapUpdate");
});

async function start() {
  if (!vehicle.isConnected) return feedback.toast({ message: t("ota.connectBefore"), tone: "warning" });
  const ready = await ota.prepareUpdate(app.preferences.otaScenario);
  if (!ready) {
    if (ota.session.verificationState === "failed") feedback.toast({ message: t("ota.verifyFailed"), tone: "danger" });
    return;
  }
  feedback.toast({ message: t("ota.verifySuccessNext"), tone: "success" });
  if (!ota.start(app.preferences.otaScenario)) return feedback.toast({ message: t("ota.verifyBefore"), tone: "warning" });
  uni.navigateTo({ url: "/pages/service/ota-progress" });
}

onUnload(() => ota.cancelPreparation());
</script>

<template>
  <view class="page-shell safe-bottom">
    <AppHeader :title="t('ota.detailTitle')" back fallback="/pages/service/ota" />
    <view class="detail-hero"><view class="firmware-chip"><UiIcon name="PackageOpen" tone="warning" :size="30" /></view><text class="detail-kicker">{{ t(`ota.modules.${ota.selectedModule.id}`) }}</text><text class="detail-version brand-font">v{{ ota.selectedModule.targetVersion }}</text><text>{{ t("ota.installed", { version: ota.selectedModule.currentVersion }) }}</text></view>
    <view class="content">
      <view class="version-flow card"><view><text>{{ t("ota.current") }}</text><text>{{ ota.selectedModule.currentVersion }}</text></view><view /><view><text>{{ t("ota.available") }}</text><text>{{ ota.selectedModule.targetVersion }}</text></view></view>
      <text class="section-title">{{ t("ota.packageInfo") }}</text>
      <view class="card package-info"><view><text>{{ t("ota.fileName") }}</text><text>{{ ota.selectedPackage.fileName }}</text></view><view><text>{{ t("ota.fileSize") }}</text><text>{{ ota.selectedPackage.sizeMb }} MB</text></view></view>
      <text class="section-title">{{ t("ota.whatsNew") }}</text>
      <view class="card notes"><view v-for="note in ota.selectedPackage.releaseNotes" :key="note"><UiIcon name="Check" tone="success" :size="15" /><text>{{ t(note) }}</text></view></view>
      <view class="preparation-card card" :class="ota.session.verificationState">
        <UiIcon :name="preparing ? 'LoaderCircle' : ota.session.verificationState === 'failed' ? 'ShieldAlert' : 'CloudDownload'" :tone="ota.session.verificationState === 'failed' ? 'danger' : 'info'" :size="22" :spinning="preparing" />
        <view class="preparation-copy"><text>{{ ota.session.stage === "downloading" ? t("ota.downloadPackage") : ota.session.stage === "verifying" ? t("ota.verifyState.checking") : ota.session.verificationState === "failed" ? t("ota.verifyFailed") : t("ota.oneTapUpdate") }}</text><text>{{ t(ota.session.verificationState === "failed" ? "ota.verifyFailedCopy" : "ota.downloadCopy") }}</text><view v-if="ota.session.stage === 'downloading'" class="download-progress"><view :style="{ width: ota.downloadProgress + '%' }" /></view></view>
      </view>
      <button class="primary-button action" :disabled="preparing" data-testid="ota-one-tap-update" @click="start"><UiIcon :name="preparing ? 'LoaderCircle' : 'CloudDownload'" tone="inverse" :size="18" :spinning="preparing" />{{ actionLabel }}</button>
      <text v-if="!vehicle.isConnected" class="offline-note">{{ t("ota.offlineCopy") }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-hero { display: flex; min-height: 180px; padding: 22px; flex-direction: column; align-items: center; justify-content: center; background: var(--stage-bg); color: var(--ink); }
.firmware-chip { display: flex; width: 52px; height: 52px; align-items: center; justify-content: center; border-radius: 12px; background: var(--surface); box-shadow: var(--v3-shadow-card); }
.detail-kicker { margin-top: 12px; color: var(--muted); font-size: 12px; font-weight: 700; }
.detail-version { margin-top: 3px; font-size: 34px; }
.detail-hero > text:last-child { margin-top: 5px; color: var(--muted); font-size: 12px; }
.version-flow { display: grid; min-height: 74px; padding: 12px 15px; align-items: center; grid-template-columns: auto 1fr auto; gap: 14px; }
.version-flow > view:not(:nth-child(2)) { display: flex; flex-direction: column; }
.version-flow > view:nth-child(2) { height: 1px; background: var(--divider); }
.version-flow text:first-child { color: var(--muted); font-size: 11px; }
.version-flow text:last-child { margin-top: 3px; font-size: 20px; font-weight: 800; }
.package-info { padding: 4px 14px; }
.package-info view { display: flex; min-height: 50px; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--divider); }
.package-info view:last-child { border: 0; }
.package-info text:first-child { color: var(--muted); font-size: 12px; }
.package-info text:last-child { max-width: 68%; text-align: right; font-size: 12px; overflow-wrap: anywhere; }
.notes { padding: 8px 14px; }
.notes view { display: flex; min-height: 44px; align-items: center; gap: 9px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.preparation-card { display: flex; min-height: 84px; margin-top: 12px; padding: 13px 14px; align-items: center; gap: 11px; }
.preparation-card.failed { border-color: var(--bs-vi-sys-color-text-danger); background: var(--bs-vi-sys-color-status-danger-background); }
.preparation-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.preparation-copy > text:first-child { font-weight: 700; }
.preparation-copy > text:nth-child(2) { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.download-progress { width: 100%; height: 4px; margin-top: 10px; overflow: hidden; border-radius: 2px; background: var(--bs-vi-sys-color-border-strong); }
.download-progress view { height: 100%; background: var(--ride-green); transition: width .1s linear; }
.action { margin-top: 12px; }
.offline-note { display: block; margin-top: 9px; color: var(--bs-vi-sys-color-text-danger); font-size: 12px; text-align: center; }
</style>
