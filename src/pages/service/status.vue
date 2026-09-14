<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useOtaStore } from "@/stores/ota";
import { useVehicleStore } from "@/stores/vehicle";
import { useFeedback } from "@/composables/useFeedback";
import { getVehicleDisplayName, getVehicleIdentityLine } from "@/utils/vehicleDisplay";

const vehicle = useVehicleStore();
const ota = useOtaStore();
const feedback = useFeedback();
const { t } = useI18n();
const modules = computed(() => {
  const bms = ota.modules.find((item) => item.id === "bms");
  const controller = ota.modules.find((item) => item.id === "controller");
  return [
    { id: "ecu", name: t("service.moduleNames.ecu"), icon: "Cpu", tone: "info", version: "2.3.1", targetVersion: "2.3.1", hasUpdate: false },
    { id: "bms", name: t("service.moduleNames.bms"), icon: "BatteryMedium", tone: "success", version: bms?.currentVersion || "3.8.0", targetVersion: bms?.targetVersion || "3.8.0", hasUpdate: Boolean(bms?.hasUpdate) },
    { id: "motor", name: t("service.moduleNames.motor"), icon: "Cog", tone: "warning", version: "1.9.4", targetVersion: "1.9.4", hasUpdate: false },
    { id: "controller", name: t("service.moduleNames.controller"), icon: "Gauge", tone: "info", version: controller?.currentVersion || vehicle.vehicle?.firmware || "1.4.2", targetVersion: controller?.targetVersion || vehicle.vehicle?.firmware || "1.4.2", hasUpdate: Boolean(controller?.hasUpdate) },
  ] as const;
});

async function refresh() {
  try {
    await vehicle.loadVehicleData();
    feedback.toast({ message: t("service.statusRefreshed"), tone: "success" });
  } catch (reason) {
    feedback.toast({ message: reason instanceof Error ? reason.message : t("service.statusRefreshFailed"), tone: "danger" });
  }
}

function showAlert() {
  if (!vehicle.activeAlert) return;
  feedback.confirm({ title: t(`service.alerts.${vehicle.activeAlert}.title`), content: t(`service.alerts.${vehicle.activeAlert}.copy`), showCancel: false, confirmText: t("common.done"), tone: "danger" });
}
</script>

<template>
  <view class="page-shell safe-bottom">
    <AppHeader :title="t('service.statusTitle')" back />
    <view class="status-strip">
      <view class="status-strip__icon"><UiIcon name="Radio" :tone="vehicle.isConnected ? 'success' : 'muted'" :size="20" /></view>
      <view class="status-strip__copy"><text>{{ vehicle.vehicle ? getVehicleDisplayName(vehicle.vehicle) : "BINSEN" }}</text><text>{{ vehicle.vehicle ? getVehicleIdentityLine(vehicle.vehicle) : "--" }}</text><text>{{ vehicle.vehicle?.serialNumber || "--" }}</text></view>
      <view class="status-strip__state" :class="{ online: vehicle.isConnected }"><text>{{ vehicle.isConnected ? t("common.connected") : t("service.offlineSnapshot") }}</text><UiIcon name="Bluetooth" :tone="vehicle.isConnected ? 'success' : 'muted'" :size="14" /></view>
    </view>
    <view class="content">
      <button v-if="vehicle.activeAlert" class="alert-banner" @click="showAlert"><UiIcon :name="vehicle.activeAlert === 'overheat' ? 'Thermometer' : 'Zap'" tone="danger" :size="21" /><view><text>{{ t(`service.alerts.${vehicle.activeAlert}.title`) }}</text><text>{{ t(`service.alerts.${vehicle.activeAlert}.summary`) }}</text></view><UiIcon name="ChevronRight" tone="danger" :size="18" /></button>
      <view v-if="!vehicle.hasTelemetry" class="no-data card"><UiIcon name="Unplug" tone="muted" :size="28" /><text>{{ t(vehicle.isConnected ? "service.noTelemetry" : "service.connectForTelemetry") }}</text><button v-if="vehicle.isConnected" class="secondary-button" @click="refresh">{{ t("common.reset") }}</button></view>
      <template v-else>
        <view class="metric-grid card">
          <view class="metric"><view class="metric-icon metric-icon--motor" data-testid="status-metric-icon-motor"><UiIcon name="Cog" tone="warning" :size="20" /></view><view class="metric-copy"><text class="data-value">{{ vehicle.telemetry.motorTemp }}°C</text><text>{{ t("service.motorTemp") }}</text></view></view>
          <view class="metric"><view class="metric-icon metric-icon--controller" data-testid="status-metric-icon-controller"><UiIcon name="Cpu" :tone="vehicle.moduleStatuses.controller === 'warning' ? 'danger' : 'info'" :size="20" /></view><view class="metric-copy"><text class="data-value">{{ vehicle.telemetry.controllerTemp }}°C</text><text>{{ t("service.controllerTemp") }}</text></view></view>
          <view class="metric"><view class="metric-icon metric-icon--current" data-testid="status-metric-icon-current"><UiIcon name="Zap" tone="info" :size="20" /></view><view class="metric-copy"><text class="data-value">{{ vehicle.telemetry.current }} A</text><text>{{ t("service.currentDraw") }}</text></view></view>
          <view class="metric"><view class="metric-icon metric-icon--battery" data-testid="status-metric-icon-battery"><UiIcon name="Battery" :tone="vehicle.moduleStatuses.bms === 'warning' ? 'danger' : 'success'" :size="20" /></view><view class="metric-copy"><text class="data-value">{{ vehicle.telemetry.batteryTemp }}°C</text><text>{{ t("service.batteryTemperature") }}</text></view></view>
        </view>
      </template>
      <text class="section-title">{{ t("service.moduleVersions") }}</text>
      <view class="card module-list" data-testid="module-version-list"><view v-for="item in modules" :key="item.id" class="module-row"><view class="module-icon" :class="`module-icon--${item.id}`"><UiIcon :name="item.icon" :tone="item.tone" :size="19" /></view><view class="module-copy"><text>{{ item.name }}</text><text>{{ item.hasUpdate ? t("service.versionTransition", { current: item.version, target: item.targetVersion }) : t("service.version", { version: item.version }) }}</text></view><text class="status-pill" :class="item.hasUpdate ? 'status-pill--amber' : 'status-pill--green'">{{ t(item.hasUpdate ? "service.versionPending" : "service.versionLatest") }}</text></view></view>
      <button v-if="vehicle.isConnected" class="secondary-button refresh-button" :disabled="vehicle.controlReadState === 'loading'" @click="refresh"><UiIcon name="RefreshCw" tone="navy" :size="18" :spinning="vehicle.controlReadState === 'loading'" />{{ t("service.refreshStatus") }}</button>
      <text class="section-title">{{ t("service.identity") }}</text>
      <view class="card identity"><view><text>{{ t("service.model") }}</text><text>{{ vehicle.vehicle?.model || "--" }}</text></view><view><text>{{ t("service.serial") }}</text><text>{{ vehicle.vehicle?.serialNumber || "--" }}</text></view><view><text>{{ t("service.bleName") }}</text><text>{{ vehicle.vehicle?.bluetoothName || "--" }}</text></view></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.status-strip { display: flex; width: calc(100% - 40px); min-height: 78px; margin: 16px 20px 0; padding: 12px 14px; align-items: center; gap: 11px; border: 1px solid rgba(223,228,219,.82); border-radius: 16px; background: linear-gradient(135deg, var(--v3-hero-start), var(--v3-surface)); box-shadow: var(--v3-shadow-card); color: var(--muted); }
.status-strip__icon { display: flex; width: 42px; height: 42px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 50%; background: var(--v3-success-soft); }
.status-strip__copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.status-strip__copy text:first-child { color: var(--ink); font-size: 15px; font-weight: 700; }
.status-strip__copy text:not(:first-child) { margin-top: 3px; overflow: hidden; color: var(--muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.status-strip__state { display: flex; min-height: 28px; padding: 0 9px; flex: 0 0 auto; align-items: center; gap: 5px; border-radius: 14px; background: var(--surface-muted); color: var(--muted); font-size: 11px; font-weight: 700; }
.status-strip__state.online { background: var(--v3-success-soft); color: var(--v3-success); }
.alert-banner { display: flex; width: 100%; min-height: 70px; padding: 12px 14px; align-items: center; gap: 11px; border: 1px solid rgba(232,66,50,.28); border-radius: 12px; background: var(--bs-vi-sys-color-status-danger-background); color: var(--bs-vi-sys-color-text-danger); box-shadow: var(--v3-shadow-card); text-align: left; }
.alert-banner view { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.alert-banner view text:first-child { font-weight: 700; }
.alert-banner view text:last-child { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.no-data { display: flex; min-height: 180px; padding: 20px; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: var(--muted); text-align: center; }
.no-data .secondary-button { width: 100%; margin-top: 5px; }
.metric-grid { display: grid; overflow: hidden; padding: 0; grid-template-columns: 1fr 1fr; }
.metric { display: flex; min-height: 96px; padding: 14px; align-items: center; gap: 10px; color: var(--muted); }
.metric:nth-child(odd) { border-right: 1px solid var(--divider); }
.metric:nth-child(-n+2) { border-bottom: 1px solid var(--divider); }
.metric-icon { display: flex; width: 38px; height: 38px; flex: 0 0 38px; align-items: center; justify-content: center; border-radius: 50%; }
.metric-icon--motor { background: var(--bs-vi-sys-color-status-warning-background); }
.metric-icon--controller,
.metric-icon--current { background: var(--bs-vi-sys-color-status-info-background); }
.metric-icon--battery { background: var(--bs-vi-sys-color-status-success-background); }
.metric-copy { display: flex; min-width: 0; flex-direction: column; }
.metric .data-value { color: var(--ink); font-family: "Roboto Mono", "SFMono-Regular", Consolas, monospace; font-size: 20px; font-weight: 700; line-height: 1.1; white-space: nowrap; }
.metric-copy > text:last-child { margin-top: 5px; font-size: 11px; line-height: 1.25; }
.module-list { padding: 0 14px; }
.module-row { display: flex; min-height: 70px; align-items: center; gap: 11px; border-bottom: 1px solid var(--divider); }
.module-row:last-child { border-bottom: 0; }
.module-icon { display: flex; width: 38px; height: 38px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 50%; background: var(--v3-info-soft); }
.module-icon--bms { background: var(--v3-success-soft); }
.module-icon--motor { background: var(--v3-warning-soft); }
.module-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.module-copy text:first-child { font-weight: 600; }
.module-copy text:last-child { margin-top: 3px; color: var(--muted); font-size: 12px; }
.refresh-button { margin-top: 14px; }
.identity { padding: 4px 14px; }
.identity view { display: flex; min-height: 50px; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--divider); }
.identity view:last-child { border: 0; }
.identity text:first-child { color: var(--muted); font-size: 12px; }
.identity text:last-child { max-width: 62%; text-align: right; font-size: 12px; overflow-wrap: anywhere; }
</style>
