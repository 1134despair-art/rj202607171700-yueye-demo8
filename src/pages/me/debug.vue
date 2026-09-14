<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import BaseToggle from "@/components/BaseToggle.vue";
import ListRow from "@/components/ListRow.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useAppStore } from "@/stores/app";
import { useDiagnosisStore } from "@/stores/diagnosis";
import { useOtaStore } from "@/stores/ota";
import { useUpdateMessageStore } from "@/stores/updateMessages";
import { useVehicleStore } from "@/stores/vehicle";
import { clearDemoStorage } from "@/utils/storage";
import { useFeedback } from "@/composables/useFeedback";
import type { AppUpdateScenario, DiagnosisScenario, OtaScenario, TelemetryScenario } from "@/types";

const app = useAppStore();
const vehicle = useVehicleStore();
const diagnosis = useDiagnosisStore();
const ota = useOtaStore();
const updateMessages = useUpdateMessageStore();
const { t } = useI18n();
const feedback = useFeedback();

async function resetDemo() {
  const confirmed = await feedback.confirm({ title: t("debug.resetTitle"), content: t("debug.resetCopy"), confirmText: t("common.reset"), cancelText: t("common.cancel"), tone: "danger" });
  if (!confirmed) return;
  clearDemoStorage();
  app.reset();
  vehicle.reset();
  diagnosis.reset();
  ota.reset();
  updateMessages.reset();
  vehicle.persistControls();
  ota.persist();
  uni.reLaunch({ url: "/pages/home/index" });
}

function armConnectionFailure() { vehicle.failNextConnection = true; feedback.toast({ message: t("debug.nextConnectionFail"), tone: "warning" }); }
function armWriteFailure() { vehicle.failNextWrite = true; feedback.toast({ message: t("debug.nextWriteFail"), tone: "warning" }); }
function armReadFailure() { vehicle.failNextRead = true; feedback.toast({ message: t("debug.nextReadFail"), tone: "warning" }); }

async function chooseTelemetry() {
  const values: TelemetryScenario[] = ["normal", "overheat", "overvoltage", "no-data"];
  const index = await feedback.choose({ title: t("debug.telemetry"), items: values.map((value) => ({ label: t(`debug.telemetryScenarios.${value}`), icon: value === "overheat" ? "Thermometer" : value === "overvoltage" ? "Zap" : value === "no-data" ? "Unplug" : "Gauge", tone: value === "normal" ? "success" : value === "no-data" ? "muted" : "danger" })), cancelText: t("common.cancel") });
  if (index !== null) { app.setTelemetryScenario(values[index]); await vehicle.setTelemetryScenario(values[index]); }
}

async function chooseDiagnosis() {
  const values: DiagnosisScenario[] = ["normal", "motor-sensor", "bms-overheat", "unknown"];
  const index = await feedback.choose({ title: t("debug.diagnosisScenario"), items: values.map((value) => ({ label: t(`debug.diagnosisScenarios.${value}`), icon: "Stethoscope", tone: value === "normal" ? "success" : "danger" })), cancelText: t("common.cancel") });
  if (index !== null) app.setDiagnosisScenario(values[index]);
}

async function chooseOta() {
  const values: OtaScenario[] = ["normal", "no-update", "check-failed", "verify-failed", "transfer-failed", "rollback-failed"];
  const index = await feedback.choose({ title: t("debug.otaScenario"), items: values.map((value) => ({ label: t(`debug.otaScenarios.${value}`), icon: "CloudDownload", tone: value === "normal" ? "success" : value === "no-update" ? "muted" : "danger" })), cancelText: t("common.cancel") });
  if (index !== null) app.setOtaScenario(values[index]);
}

async function chooseAppUpdate() {
  const values: AppUpdateScenario[] = ["available", "latest", "failed"];
  const index = await feedback.choose({ title: t("debug.appUpdateScenario"), items: values.map((value) => ({ label: t(`debug.appUpdateScenarios.${value}`), icon: "Smartphone", tone: value === "available" ? "info" : value === "latest" ? "success" : "danger" })), cancelText: t("common.cancel") });
  if (index !== null) app.setAppUpdateScenario(values[index]);
}
</script>

<template>
  <view class="page-shell safe-bottom"><AppHeader :title="t('debug.title')" back /><view class="debug-warning"><UiIcon name="Bug" tone="warning" :size="20" /><view><text>{{ t("debug.heading") }}</text><text>{{ t("debug.copy") }}</text></view></view><view class="content"><text class="section-title">{{ t("debug.scenarios") }}</text><view class="card list-card"><ListRow :label="t('debug.telemetry')" :detail="t(`debug.telemetryScenarios.${app.preferences.telemetryScenario}`)" @click="chooseTelemetry"><template #icon><view class="row-icon"><UiIcon name="Gauge" tone="info" :size="19" /></view></template></ListRow><view class="list-divider" /><ListRow :label="t('debug.diagnosisScenario')" :detail="t(`debug.diagnosisScenarios.${app.preferences.diagnosisScenario}`)" @click="chooseDiagnosis"><template #icon><view class="row-icon"><UiIcon name="Stethoscope" tone="info" :size="19" /></view></template></ListRow><view class="list-divider" /><ListRow :label="t('debug.otaScenario')" :detail="t(`debug.otaScenarios.${app.preferences.otaScenario}`)" @click="chooseOta"><template #icon><view class="row-icon"><UiIcon name="CloudDownload" tone="warning" :size="19" /></view></template></ListRow><view class="list-divider" /><ListRow :label="t('debug.appUpdateScenario')" :detail="t(`debug.appUpdateScenarios.${app.preferences.appUpdateScenario}`)" @click="chooseAppUpdate"><template #icon><view class="row-icon"><UiIcon name="Smartphone" tone="info" :size="19" /></view></template></ListRow></view><text class="section-title">{{ t("debug.abnormal") }}</text><view class="card list-card"><BaseToggle :label="t('debug.failureMode')" :description="t('debug.failureModeCopy')" :model-value="app.preferences.abnormalScenario" @update:model-value="app.setAbnormalScenario($event)" /><view class="list-divider" /><ListRow :label="t('debug.failBle')" :detail="t('debug.failBleCopy')" :chevron="false" @click="armConnectionFailure"><template #icon><view class="row-icon danger-icon"><UiIcon name="WifiOff" tone="danger" :size="19" /></view></template><template #end><text class="status-pill" :class="vehicle.failNextConnection ? 'status-pill--red' : ''">{{ vehicle.failNextConnection ? t("debug.armed") : t("common.off") }}</text></template></ListRow><view class="list-divider" /><ListRow :label="t('debug.failRead')" :detail="t('debug.failReadCopy')" :chevron="false" @click="armReadFailure"><template #icon><view class="row-icon danger-icon"><UiIcon name="FileSearch" tone="danger" :size="19" /></view></template><template #end><text class="status-pill" :class="vehicle.failNextRead ? 'status-pill--red' : ''">{{ vehicle.failNextRead ? t("debug.armed") : t("common.off") }}</text></template></ListRow><view class="list-divider" /><ListRow :label="t('debug.failWrite')" :detail="t('debug.failWriteCopy')" :chevron="false" @click="armWriteFailure"><template #icon><view class="row-icon danger-icon"><UiIcon name="ZapOff" tone="danger" :size="19" /></view></template><template #end><text class="status-pill" :class="vehicle.failNextWrite ? 'status-pill--red' : ''">{{ vehicle.failNextWrite ? t("debug.armed") : t("common.off") }}</text></template></ListRow></view><text class="section-title">{{ t("debug.localData") }}</text><button class="danger-button reset-button" @click="resetDemo"><UiIcon name="RotateCcw" tone="danger" :size="18" />{{ t("debug.resetData") }}</button></view></view>
</template>

<style scoped lang="scss">
.debug-warning { display: flex; min-height: 72px; padding: 12px 16px; align-items: center; gap: 11px; background: var(--bs-vi-sys-color-status-warning-background); color: var(--bs-vi-sys-color-text-warning); border-bottom: 1px solid var(--bs-vi-ref-color-semantic-warning); }
.debug-warning > view { display: flex; flex-direction: column; }
.debug-warning text:first-child { font-size: 12px; font-weight: 700; }
.debug-warning text:last-child { margin-top: 3px; color: var(--muted); font-size: 12px; }
.row-icon { display: flex; width: 40px; height: 40px; align-items: center; justify-content: center; border-radius: 12px; background: var(--bs-vi-sys-color-background-surface-muted); }
.danger-icon { background: var(--bs-vi-sys-color-status-danger-background); color: var(--bs-vi-sys-color-text-danger); }
.reset-button { width: 100%; }
.reset-note { display: block; margin-top: 9px; color: var(--muted); font-family: monospace; font-size: 11px; text-align: center; }
</style>
