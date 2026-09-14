<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useFeedback } from "@/composables/useFeedback";
import { useAppStore } from "@/stores/app";
import { useOtaStore } from "@/stores/ota";
import { useUpdateMessageStore } from "@/stores/updateMessages";
import { useVehicleStore } from "@/stores/vehicle";
import type { OtaModuleId } from "@/types";

const app = useAppStore();
const ota = useOtaStore();
const vehicle = useVehicleStore();
const updateMessages = useUpdateMessageStore();
const feedback = useFeedback();
const { t } = useI18n();

async function check() {
  await ota.check(app.preferences.otaScenario, vehicle.vehicle?.model);
  updateMessages.markRead("firmware");
  if (ota.session.checkState === "updates") feedback.toast({ message: t("ota.foundCount", { count: ota.updateCount }), tone: "success" });
  if (ota.session.checkState === "none") feedback.toast({ message: t("ota.noUpdates"), tone: "info" });
  if (ota.session.checkState === "failed") feedback.toast({ message: t("ota.checkFailed"), tone: "danger" });
}

function openModule(id: OtaModuleId) {
  ota.selectModule(id);
  uni.navigateTo({ url: "/pages/service/ota-detail" });
}

onShow(() => {
  updateMessages.markRead("firmware");
  if (ota.session.checkState === "idle") void check();
});
</script>

<template>
  <view class="page-shell safe-bottom firmware-page">
    <AppHeader :title="t('updates.firmwarePageTitle')" back />
    <view class="content firmware-content">
      <view class="firmware-summary">
        <view><text>{{ t("updates.firmwareHeading") }}</text><text>{{ t("updates.firmwarePageCopy") }}</text></view>
        <view class="firmware-count">{{ ota.updateCount }}</view>
      </view>
      <view v-if="ota.session.checkState === 'checking'" class="state-card card"><UiIcon name="RefreshCw" tone="info" :size="24" spinning /><view><text>{{ t("ota.checking") }}</text><text>{{ t("ota.centerCopy") }}</text></view></view>
      <view v-else-if="ota.session.checkState === 'failed'" class="state-card state-card--danger card"><UiIcon name="CircleAlert" tone="danger" :size="24" /><view><text>{{ t("ota.checkFailed") }}</text><text>{{ t("ota.checkFailedCopy") }}</text></view></view>
      <template v-else-if="ota.modules.length">
        <text class="section-title">{{ t("ota.vehicleModules") }}</text>
        <view class="module-list" data-testid="firmware-update-list">
        <button v-for="module in ota.modules" :key="module.id" class="module-row" :data-testid="`firmware-module-${module.id}`" @click="module.hasUpdate && openModule(module.id)">
          <view class="module-icon"><UiIcon :name="module.id === 'bms' ? 'BatteryCharging' : module.id === 'display' ? 'CircleGauge' : 'Cpu'" tone="warning" :size="21" /></view>
          <view class="module-copy"><text>{{ t(`ota.modules.${module.id}`) }}</text><text>{{ module.hasUpdate ? t("updates.versionFlow", { current: module.currentVersion, target: module.targetVersion }) : `v${module.currentVersion}` }}</text></view>
          <view class="module-end"><text class="status-pill" :class="module.hasUpdate ? 'status-pill--amber' : 'status-pill--green'">{{ module.hasUpdate ? t("ota.update") : t("ota.latest") }}</text><UiIcon name="ChevronRight" tone="muted" :size="18" /></view>
        </button>
        </view>
        <text class="section-title">{{ t("updates.requirements") }}</text>
        <view class="requirement-row"><text>{{ t("updates.vehicleState") }}</text><text class="requirement-ok">{{ vehicle.isConnected ? t("updates.stationaryConnected") : t("common.offline") }}</text></view>
        <view class="requirement-row"><text>{{ t("updates.currentBattery") }}</text><text>{{ t("updates.batteryRequirement", { value: vehicle.telemetry.soc }) }}</text></view>
        <view class="safety-line"><UiIcon :name="vehicle.isConnected ? 'ShieldCheck' : 'CircleAlert'" tone="warning" :size="22" /><view><text>{{ vehicle.isConnected ? t("updates.precheckPassed") : t("ota.connectBefore") }}</text><text>{{ t("updates.keepPowered") }}</text></view></view>
      </template>
      <view v-else class="empty-state card" data-testid="firmware-updates-empty"><UiIcon name="ShieldCheck" tone="success" :size="34" /><text>{{ t("updates.firmwareEmptyTitle") }}</text><text>{{ t("updates.firmwareEmptyCopy") }}</text></view>
      <button class="secondary-button check-button" :disabled="ota.session.checkState === 'checking'" @click="check"><UiIcon name="RefreshCw" tone="navy" :size="18" :spinning="ota.session.checkState === 'checking'" />{{ ota.session.checkState === "checking" ? t("ota.checking") : t("ota.checkAgain") }}</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.firmware-page { background: var(--app-bg); }
.firmware-content { padding-top: 0 !important; }
.firmware-summary { display: flex; min-height: 112px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--divider); }
.firmware-summary > view:first-child { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.firmware-summary > view:first-child text:first-child { font-size: 23px; font-weight: 800; }
.firmware-summary > view:first-child text:last-child { max-width: 240px; margin-top: 8px; color: var(--muted); font-size: 12px; line-height: 1.5; }
.firmware-count { display: flex; width: 58px; height: 58px; flex: 0 0 58px; align-items: center; justify-content: center; border: 1px solid rgba(216,112,58,.48); border-radius: 50%; color: #f1945f; font-size: 22px; font-weight: 800; }
.state-card { display: flex; min-height: 88px; padding: 15px; align-items: center; gap: 12px; }
.state-card--danger { border-color: var(--bs-vi-sys-color-text-danger); background: var(--bs-vi-sys-color-status-danger-background); }
.state-card > view { display: flex; min-width: 0; flex-direction: column; }
.state-card > view text:first-child { font-weight: 700; }
.state-card > view text:last-child { margin-top: 5px; color: var(--muted); font-size: 12px; line-height: 1.45; }
.module-list { border-top: 1px solid var(--divider); }
.module-row { display: flex; width: 100%; min-height: 78px; padding: 10px 0; align-items: center; gap: 11px; border-bottom: 1px solid var(--divider); text-align: left; }
.module-row:last-child { border-bottom: 0; }
.module-icon { display: flex; width: 42px; height: 42px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 12px; background: var(--bs-vi-sys-color-status-warning-background); }
.module-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.module-copy text:first-child { font-size: 15px; font-weight: 700; }
.module-copy text:last-child { margin-top: 5px; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.module-end { display: flex; flex: 0 0 auto; align-items: center; gap: 5px; }
.requirement-row { display: flex; min-height: 52px; align-items: center; justify-content: space-between; gap: 14px; border-bottom: 1px solid var(--divider); color: var(--muted); font-size: 12px; }
.requirement-row text:last-child { color: var(--ink); font-weight: 700; text-align: right; }
.requirement-row .requirement-ok { color: var(--accent); }
.safety-line { display: flex; min-height: 72px; align-items: center; gap: 12px; border-bottom: 1px solid var(--divider); }
.safety-line > view { display: flex; flex-direction: column; }
.safety-line text:first-child { color: #f1945f; font-size: 13px; font-weight: 700; }
.safety-line text:last-child { margin-top: 5px; color: var(--muted); font-size: 11px; }
.empty-state { display: flex; min-height: 220px; padding: 24px; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.empty-state text:nth-child(2) { margin-top: 12px; font-size: 16px; font-weight: 700; }
.empty-state text:last-child { max-width: 270px; margin-top: 6px; color: var(--muted); font-size: 12px; line-height: 1.5; }
.check-button { margin-top: 16px; }
</style>
