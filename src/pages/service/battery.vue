<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useVehicleStore } from "@/stores/vehicle";
import { useFeedback } from "@/composables/useFeedback";

const vehicle = useVehicleStore();
const feedback = useFeedback();
const { t } = useI18n();

function showAlert() {
  if (!vehicle.activeAlert) return;
  feedback.confirm({ title: t(`service.alerts.${vehicle.activeAlert}.title`), content: t(`service.alerts.${vehicle.activeAlert}.copy`), showCancel: false, confirmText: t("common.done"), tone: "danger" });
}
</script>

<template>
  <view class="page-shell safe-bottom">
    <AppHeader :title="t('service.batteryTitle')" back />
    <view class="battery-hero" :class="{ unavailable: !vehicle.hasTelemetry }"><view class="battery-pack"><view :style="{ height: vehicle.hasTelemetry ? vehicle.telemetry.soc + '%' : '0%' }" /></view><view><text class="battery-kicker">{{ t("service.stateOfCharge") }}</text><text class="battery-soc brand-font">{{ vehicle.hasTelemetry ? vehicle.telemetry.soc + '%' : '--' }}</text><text class="battery-range">{{ vehicle.hasTelemetry ? t("service.remaining", { range: vehicle.telemetry.range }) : t(vehicle.isConnected ? "service.noTelemetry" : "service.connectForTelemetry") }}</text></view></view>
    <view class="content">
      <button v-if="vehicle.activeAlert" class="battery-alert" @click="showAlert"><UiIcon :name="vehicle.activeAlert === 'overheat' ? 'Thermometer' : 'Zap'" tone="danger" :size="20" /><text>{{ t(`service.alerts.${vehicle.activeAlert}.title`) }}</text><UiIcon name="ChevronRight" tone="danger" :size="17" /></button>
      <view class="battery-grid card">
        <view class="battery-metric"><view class="battery-metric__icon battery-metric__icon--health"><UiIcon name="HeartPulse" tone="success" :size="18" /></view><view><text class="data-value">{{ vehicle.hasTelemetry ? vehicle.telemetry.soh + '%' : '--' }}</text><text>{{ t("service.stateOfHealth") }}</text></view></view>
        <view class="battery-metric"><view class="battery-metric__icon battery-metric__icon--voltage"><UiIcon name="Zap" :tone="vehicle.activeAlert === 'overvoltage' ? 'danger' : 'info'" :size="18" /></view><view><text class="data-value">{{ vehicle.hasTelemetry ? vehicle.telemetry.voltage + ' V' : '--' }}</text><text>{{ t("service.packVoltage") }}</text></view></view>
        <view class="battery-metric"><view class="battery-metric__icon battery-metric__icon--temperature"><UiIcon name="Thermometer" :tone="vehicle.activeAlert === 'overheat' ? 'danger' : 'warning'" :size="18" /></view><view><text class="data-value">{{ vehicle.hasTelemetry ? vehicle.telemetry.batteryTemp + '°C' : '--' }}</text><text>{{ t("service.temperature") }}</text></view></view>
        <view class="battery-metric"><view class="battery-metric__icon battery-metric__icon--cycles"><UiIcon name="BatteryCharging" tone="success" :size="18" /></view><view><text class="data-value">{{ vehicle.hasTelemetry ? vehicle.telemetry.cycles : '--' }}</text><text>{{ t("service.cycles") }}</text></view></view>
        <view class="battery-metric capacity-card" data-testid="battery-capacity"><view class="battery-metric__icon battery-metric__icon--capacity"><UiIcon name="BatteryMedium" tone="info" :size="18" /></view><view><text class="data-value">{{ vehicle.hasTelemetry ? vehicle.telemetry.batteryCapacity + ' Ah' : '--' }}</text><text>{{ t("service.batteryCapacity") }}</text></view></view>
      </view>
      <view class="notice">{{ t("service.snapshot") }}</view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.battery-hero { display: flex; min-height: 184px; padding: 22px 28px; align-items: center; gap: 24px; background: var(--stage-bg); color: var(--ink); }
.battery-hero.unavailable { color: var(--muted); }
.battery-pack { position: relative; width: 60px; height: 108px; overflow: hidden; border: 3px solid var(--muted); border-radius: 10px; background: var(--surface-stage-translucent); }
.battery-pack::before { position: absolute; z-index: 2; top: -8px; left: 18px; width: 19px; height: 7px; content: ""; border-radius: 3px 3px 0 0; background: var(--muted); }
.battery-pack view { position: absolute; right: 5px; bottom: 5px; left: 5px; background: var(--ride-green); }
.battery-kicker { color: var(--muted); font-size: 12px; font-weight: 700; }
.battery-soc { display: block; margin-top: 5px; font-size: 42px; line-height: 1; }
.battery-range { display: block; max-width: 230px; margin-top: 8px; color: var(--muted); font-size: 13px; line-height: 1.4; }
.battery-alert { display: flex; width: 100%; min-height: 54px; margin-bottom: 12px; padding: 10px 13px; align-items: center; gap: 10px; border: 1px solid rgba(232,66,50,.28); border-radius: 12px; background: var(--bs-vi-sys-color-status-danger-background); color: var(--bs-vi-sys-color-text-danger); box-shadow: var(--v3-shadow-card); text-align: left; }
.battery-alert text { min-width: 0; flex: 1; font-weight: 700; }
.battery-grid { display: grid; overflow: hidden; padding: 0; grid-template-columns: 1fr 1fr; }
.battery-metric { display: flex; min-height: 94px; padding: 14px; align-items: center; gap: 10px; color: var(--muted); }
.battery-metric:nth-child(odd):not(:last-child) { border-right: 1px solid var(--divider); }
.battery-metric:nth-child(-n+4) { border-bottom: 1px solid var(--divider); }
.battery-metric > view:last-child { display: flex; min-width: 0; flex-direction: column; }
.battery-metric__icon { display: flex; width: 38px; height: 38px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 50%; background: var(--v3-info-soft); }
.battery-metric__icon--health,
.battery-metric__icon--cycles { background: var(--v3-success-soft); }
.battery-metric__icon--temperature { background: var(--v3-warning-soft); }
.battery-metric__icon--capacity { background: var(--v3-info-soft); }
.battery-grid .capacity-card { grid-column: 1 / -1; min-height: 78px; }
.battery-grid .data-value { color: var(--ink); font-family: "Roboto Mono", "SFMono-Regular", Consolas, monospace; font-size: 20px; font-weight: 700; line-height: 1.1; white-space: nowrap; }
.battery-metric > view:last-child > text:last-child { margin-top: 5px; font-size: 11px; }
.notice { margin: 18px 4px; color: var(--muted); font-size: 12px; line-height: 1.5; }
</style>
