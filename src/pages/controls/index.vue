<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { onShow } from "@dcloudio/uni-app";
import AppHeader from "@/components/AppHeader.vue";
import AppTabBar from "@/components/AppTabBar.vue";
import UiIcon from "@/components/UiIcon.vue";
import VehicleControlIcon from "@/components/VehicleControlIcon.vue";
import vehicleThumbImage from "@/assets/ui/illustrations/binsen-x5-real-thumb@3x.png";
import BaseToggle from "@/components/BaseToggle.vue";
import ListRow from "@/components/ListRow.vue";
import SettingGroup from "@/components/SettingGroup.vue";
import { useVehicleStore } from "@/stores/vehicle";
import type { ControlSettings } from "@/types";
import { useFeedback } from "@/composables/useFeedback";
import { getVehicleDisplayName, getVehicleIdentityLine } from "@/utils/vehicleDisplay";

const vehicle = useVehicleStore();
const { t } = useI18n();
const feedback = useFeedback();

async function save<K extends keyof ControlSettings>(key: K, value: ControlSettings[K]) {
  try {
    await vehicle.writeControl(key, value);
    const labelKeys: Partial<Record<keyof ControlSettings, string>> = {
      autoPark: "controls.autoPark",
      tipOverCutoff: "controls.tipOver",
      sideStandSensor: "controls.sideStand",
      hillDescent: "controls.hillDescent",
    };
    feedback.toast({ message: t("controls.settingApplied", { setting: t(labelKeys[key] || "controls.title") }), tone: "success" });
  } catch (reason) {
    await feedback.confirm({
      title: t("controls.writeFailedTitle"),
      content: reason instanceof Error ? reason.message : t("common.unableToSave"),
      showCancel: false,
      confirmText: t("common.done"),
      tone: "danger",
    });
  }
}

function connectFromHome() {
  uni.switchTab({ url: "/pages/home/index" });
}

async function readControls() {
  try {
    await vehicle.loadVehicleData();
  } catch (reason) {
    feedback.toast({ message: reason instanceof Error ? reason.message : t("controls.readFailed"), tone: "danger" });
  }
}

onShow(() => {
  if (vehicle.isConnected && vehicle.controlReadState === "idle") readControls();
});
</script>

<template>
  <view class="page-shell tab-page controls-page">
    <AppHeader :title="t('controls.title')" />
    <view class="content--tight controls-content">
      <view class="control-summary card">
        <image :src="vehicleThumbImage" mode="aspectFit" />
        <view class="control-summary__copy"><text>{{ vehicle.vehicle ? getVehicleDisplayName(vehicle.vehicle) : "RAVEN" }}</text><text>{{ vehicle.vehicle ? getVehicleIdentityLine(vehicle.vehicle) : t("controls.noVehicleIdentity") }}</text><text>{{ vehicle.isConnected ? t("controls.connectedCopy") : t("controls.offlineCopy") }}</text></view>
        <view class="connection-pill" :class="{ online: vehicle.isConnected }"><UiIcon :name="vehicle.isConnected ? 'BluetoothConnected' : 'BluetoothOff'" :tone="vehicle.isConnected ? 'success' : 'muted'" :size="15" /><text>{{ vehicle.isConnected ? t("controls.live") : t("common.offline") }}</text></view>
      </view>
      <button v-if="!vehicle.isConnected" class="offline-entry" @click="connectFromHome"><UiIcon name="WifiOff" tone="warning" :size="18" /><text class="offline-copy">{{ t("controls.connectionRequiredCopy") }}</text><text class="offline-action">{{ t("controls.goHome") }}</text><UiIcon name="ChevronRight" tone="muted" :size="16" /></button>
      <view v-if="!vehicle.isConnected" class="snapshot-note"><UiIcon name="Info" tone="muted" :size="16" /><text>{{ t("controls.lastKnownSnapshot") }}</text></view>
      <view v-else-if="vehicle.controlReadState === 'loading'" class="read-state card"><UiIcon name="LoaderCircle" tone="info" :size="20" spinning /><text>{{ t("controls.reading") }}</text></view>
      <button v-else-if="vehicle.controlReadState === 'failed'" class="read-state failed card" @click="readControls"><UiIcon name="RefreshCw" tone="danger" :size="20" /><view><text>{{ t("controls.readFailed") }}</text><text>{{ t("controls.tapRetry") }}</text></view></button>

      <text class="section-title">{{ t("controls.protection") }}</text>
      <SettingGroup :class="{ 'controls-disabled': !vehicle.isConnected }">
        <BaseToggle :label="t('controls.autoPark')" :description="t('controls.autoParkCopy')" :model-value="vehicle.controls.autoPark" :disabled="!vehicle.isConnected || vehicle.saving" @update:model-value="save('autoPark', $event)"><template #icon><view class="setting-icon setting-icon--blue" data-testid="control-icon-auto-park" data-icon-name="IconfontParkingP"><VehicleControlIcon name="autoPark" :size="20" /></view></template></BaseToggle>
        <view class="list-divider" />
        <BaseToggle :label="t('controls.tipOver')" :description="t('controls.tipOverCopy')" :model-value="vehicle.controls.tipOverCutoff" :disabled="!vehicle.isConnected || vehicle.saving" @update:model-value="save('tipOverCutoff', $event)"><template #icon><view class="setting-icon setting-icon--pink" data-testid="control-icon-tip-over" data-icon-name="IconfontTiltedMotorcyclePowerOff"><VehicleControlIcon name="tipOverCutoff" :size="20" /></view></template></BaseToggle>
        <view class="list-divider" />
        <BaseToggle :label="t('controls.sideStand')" :description="t('controls.sideStandCopy')" :model-value="vehicle.controls.sideStandSensor" :disabled="!vehicle.isConnected || vehicle.saving" @update:model-value="save('sideStandSensor', $event)"><template #icon><view class="setting-icon setting-icon--amber" data-testid="control-icon-side-stand" data-icon-name="IconfontMotorcycleSideStand"><VehicleControlIcon name="sideStandSensor" :size="20" /></view></template></BaseToggle>
        <view class="list-divider" />
        <BaseToggle :label="t('controls.hillDescent')" :description="t('controls.hillDescentCopy')" :model-value="vehicle.controls.hillDescent" :disabled="!vehicle.isConnected || vehicle.saving" @update:model-value="save('hillDescent', $event)"><template #icon><view class="setting-icon setting-icon--green" data-testid="control-icon-hill-descent" data-icon-name="IconfontMotorcycleDownhillArrow"><VehicleControlIcon name="hillDescent" :size="20" /></view></template></BaseToggle>
      </SettingGroup>

      <text class="section-title">{{ t("controls.rideTuning") }}</text>
      <SettingGroup>
        <ListRow :label="t('controls.rideModes')" :detail="`${t('controls.regenOptions.' + vehicle.controls.regenLevel)} · ${t('controls.wheelieOptions.' + vehicle.controls.wheelieMode)} · ${vehicle.controls.speedLimit === 0 ? t('common.off') : vehicle.controls.speedLimit + ' km/h'}`" @click="uni.navigateTo({ url: '/pages/controls/ride-modes' })"><template #icon><view class="setting-icon setting-icon--blue" data-testid="control-icon-ride-modes" data-icon-name="IconfontDashboardModeSwitch"><VehicleControlIcon name="rideModes" :size="20" /></view></template></ListRow>
        <view class="list-divider" />
        <ListRow :label="t('controls.powerCurve')" :detail="t('controls.powerCurveCopy')" @click="uni.navigateTo({ url: '/pages/controls/power-curve' })"><template #icon><view class="setting-icon setting-icon--purple" data-testid="control-icon-power-curve" data-icon-name="IconfontPowerCurveControlPoints"><VehicleControlIcon name="powerCurve" :size="20" /></view></template></ListRow>
        <view class="list-divider" />
        <ListRow :label="t('controls.wheel')" :detail="`${vehicle.controls.wheelCircumference} mm`" @click="uni.navigateTo({ url: '/pages/controls/wheel' })"><template #icon><view class="setting-icon setting-icon--amber" data-testid="control-icon-wheel" data-icon-name="IconfontWheelCircumferenceArrows"><VehicleControlIcon name="wheelCircumference" :size="20" /></view></template></ListRow>
      </SettingGroup>
    </view>
    <AppTabBar active="controls" />
  </view>
</template>

<style scoped lang="scss">
.controls-page { background: var(--app-bg); }
.controls-content { padding-top: 16px; }
.control-summary { position: relative; display: flex; min-height: 108px; overflow: hidden; padding: 14px 16px; align-items: center; gap: 12px; background: linear-gradient(135deg, var(--v3-hero-start), var(--v3-surface)); }
.control-summary::after { position: absolute; right: -22px; bottom: -32px; width: 112px; height: 112px; border: 1px solid rgba(158,217,78,.16); border-radius: 50%; content: ""; }
.control-summary image { width: 116px; height: 72px; flex: 0 0 auto; filter: drop-shadow(0 7px 8px rgba(52,65,43,.12)); }
.control-summary__copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.control-summary__copy text:first-child { font-size: 18px; font-weight: 700; line-height: 1.2; }
.control-summary__copy text:not(:first-child) { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.35; }
.control-summary__copy text:last-child { color: var(--subtle); }
.connection-pill { display: flex; min-height: 28px; padding: 0 8px; flex: 0 0 auto; align-items: center; gap: 5px; border-radius: 14px; background: var(--bs-vi-sys-color-background-surface-muted); color: var(--muted); font-size: 11px; font-weight: 700; }
.connection-pill.online { background: var(--bs-vi-sys-color-status-success-background); color: var(--bs-vi-sys-color-text-success); }
.offline-entry { display: flex; width: 100%; min-height: 56px; margin-top: 12px; padding: 10px 14px; align-items: center; gap: 9px; border: 1px solid rgba(255,179,71,.26); border-radius: 12px; background: var(--bs-vi-sys-color-status-warning-background); color: var(--muted); box-shadow: var(--v3-shadow-card); font-size: 12px; text-align: left; }
.offline-copy { min-width: 0; flex: 1; line-height: 1.4; }
.offline-action { flex: 0 0 auto; color: var(--bs-vi-sys-color-action-info); font-size: 12px; font-weight: 700; }
.snapshot-note { display: flex; min-height: 44px; margin-top: 8px; padding: 8px 12px; align-items: center; gap: 8px; border: 1px solid var(--divider); border-radius: 12px; background: rgba(255,255,255,.68); color: var(--muted); font-size: 12px; line-height: 1.4; }
.read-state { display: flex; min-height: 52px; margin-top: 12px; padding: 10px 12px; align-items: center; gap: 10px; color: var(--muted); font-size: 13px; text-align: left; }
.read-state.failed { width: 100%; border-color: var(--bs-vi-sys-color-text-danger); background: var(--bs-vi-sys-color-status-danger-background); }
.read-state.failed view { display: flex; flex-direction: column; }
.read-state.failed view text:first-child { color: var(--bs-vi-sys-color-text-danger); font-weight: 700; }
.read-state.failed view text:last-child { margin-top: 3px; font-size: 12px; }
.setting-icon { display: flex; width: 40px; height: 40px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 50%; }
.setting-icon--blue { background: var(--bs-vi-sys-color-status-info-background); color: var(--bs-vi-sys-color-text-info); }
.setting-icon--pink { background: var(--accent-soft); color: var(--navy); }
.setting-icon--amber { background: var(--bs-vi-sys-color-status-warning-background); color: var(--bs-vi-sys-color-text-warning); }
.setting-icon--green { background: var(--bs-vi-sys-color-status-success-background); color: var(--bs-vi-sys-color-text-success); }
.setting-icon--purple { background: var(--accent-soft); color: var(--navy); }
.controls-disabled { opacity: 1; }
.controls-disabled :deep(.toggle-row[disabled]) { opacity: 1; color: var(--ink) !important; }
.controls-disabled :deep(.toggle-row[disabled] .toggle-row__label) { color: var(--ink) !important; }
</style>
