<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useVehicleStore } from "@/stores/vehicle";
import { useFeedback } from "@/composables/useFeedback";
import { WHEEL_CIRCUMFERENCE_MAX, WHEEL_CIRCUMFERENCE_MIN, WHEEL_CIRCUMFERENCE_PRESETS } from "@/utils/wheelCircumference";

const vehicle = useVehicleStore();
const { t } = useI18n();
const feedback = useFeedback();
const value = ref(String(vehicle.controls.wheelCircumference));
const error = ref("");
const presets = WHEEL_CIRCUMFERENCE_PRESETS;
const measurementSteps = [
  { icon: "CircleDot" as const, title: "controls.wheelMark", copy: "controls.wheelMarkCopy", tone: "info" as const },
  { icon: "MoveRight" as const, title: "controls.wheelRoll", copy: "controls.wheelRollCopy", tone: "success" as const },
  { icon: "Ruler" as const, title: "controls.wheelMeasure", copy: "controls.wheelMeasureCopy", tone: "navy" as const },
];

function choosePreset(preset: number) {
  value.value = String(preset);
  error.value = "";
}

function adjustValue(delta: number) {
  const current = Number(value.value);
  const next = (Number.isFinite(current) ? current : vehicle.controls.wheelCircumference) + delta;
  value.value = String(Math.min(WHEEL_CIRCUMFERENCE_MAX, Math.max(WHEEL_CIRCUMFERENCE_MIN, Math.round(next))));
  error.value = "";
}

async function save() {
  const numeric = Number(value.value);
  if (!Number.isFinite(numeric) || numeric < WHEEL_CIRCUMFERENCE_MIN || numeric > WHEEL_CIRCUMFERENCE_MAX) {
    error.value = t("controls.wheelRange");
    return;
  }
  error.value = "";
  try {
    await vehicle.writeControl("wheelCircumference", Math.round(numeric));
    feedback.toast({ message: t("controls.wheelSaved"), tone: "success" });
  } catch (reason) {
    feedback.toast({ message: reason instanceof Error ? reason.message : t("common.unableToSave"), tone: "danger" });
  }
}
</script>

<template>
  <view class="page-shell safe-bottom wheel-page">
    <AppHeader :title="t('controls.wheelTitle')" back />
    <view class="content wheel-content">
      <text class="wheel-copy">{{ t("controls.wheelCopy") }}</text>

      <view class="card parameter-card">
        <view class="parameter-heading">
          <text>{{ t("controls.wheelCurrent") }}</text>
          <view class="recommend-pill"><UiIcon name="CircleDot" tone="info" :size="12" />{{ t("controls.wheelRecommended") }}</view>
        </view>
        <view class="current-value"><text>{{ value || "--" }}</text><text>mm</text></view>
        <view class="stepper">
          <button :aria-label="t('controls.wheelDecrease')" @click="adjustValue(-5)">−</button>
          <input v-model="value" class="stepper-input" type="number" inputmode="numeric" @input="error = ''" />
          <button :aria-label="t('controls.wheelIncrease')" @click="adjustValue(5)">+</button>
        </view>
        <text v-if="error" class="field-error">{{ error }}</text>
        <view class="preset-row" :style="{ gridTemplateColumns: `repeat(${presets.length}, minmax(0, 1fr))` }">
          <button v-for="preset in presets" :key="preset.size" :class="{ active: value === String(preset.circumference) }" @click="choosePreset(preset.circumference)">
            {{ t(preset.label) }}
          </button>
        </view>
      </view>

      <text class="section-title measure-title">{{ t("controls.wheelMeasureTitle") }}</text>
      <view class="card measure-card">
        <template v-for="(step, index) in measurementSteps" :key="step.title">
          <view class="measure-row">
            <view class="measure-icon" :class="`measure-icon--${step.tone}`"><UiIcon :name="step.icon" :tone="step.tone" :size="20" /></view>
            <view class="measure-copy"><text>{{ t(step.title) }}</text><text>{{ t(step.copy) }}</text></view>
            <text class="measure-number">{{ index + 1 }}</text>
          </view>
          <view v-if="index < measurementSteps.length - 1" class="measure-divider" />
        </template>
      </view>

      <view class="warning-note"><UiIcon name="AlertTriangle" tone="warning" :size="20" /><text>{{ t("controls.wheelWarning") }}</text></view>
      <button class="primary-button save-button" :disabled="!vehicle.isConnected" @click="save"><UiIcon name="Save" tone="inverse" :size="19" />{{ t("controls.saveCircumference") }}</button>
      <text v-if="!vehicle.isConnected" class="field-help offline-help">{{ t("controls.connectBeforeWheel") }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.wheel-page { background: var(--app-bg); }
.wheel-content { padding-top: 18px; }
.wheel-copy { display: block; color: var(--muted); font-size: 13px; line-height: 1.55; }
.parameter-card { margin-top: 18px; padding: 16px; }
.parameter-heading { display: flex; min-height: 26px; align-items: center; justify-content: space-between; color: var(--muted); font-size: 12px; }
.recommend-pill { display: inline-flex; min-height: 26px; padding: 0 9px; align-items: center; gap: 4px; border-radius: 13px; background: var(--bs-vi-sys-color-status-info-background); color: var(--bs-vi-sys-color-text-info); font-size: 11px; font-weight: 700; }
.current-value { display: flex; min-height: 92px; align-items: center; justify-content: center; gap: 5px; color: var(--ink); }
.current-value text:first-child { font-size: 44px; font-variant-numeric: tabular-nums; font-weight: 700; line-height: 1; }
.current-value text:last-child { align-self: flex-end; margin-bottom: 25px; font-size: 12px; font-weight: 700; }
.stepper { display: grid; height: 50px; overflow: hidden; border: 1px solid var(--bs-vi-sys-color-border-subtle); border-radius: 12px; background: var(--surface-muted); grid-template-columns: 48px 1fr 48px; }
.stepper button { display: flex; width: 48px; min-height: 48px; padding: 0; align-items: center; justify-content: center; background: transparent; color: var(--ink); font-size: 20px; line-height: 1; }
.stepper-input { width: 100%; height: 48px; border-right: 1px solid var(--divider); border-left: 1px solid var(--divider); background: var(--surface); color: var(--ink); font-size: 24px; font-variant-numeric: tabular-nums; font-weight: 700; line-height: 48px; text-align: center; }
.preset-row { display: grid; margin-top: 14px; gap: 8px; }
.preset-row button { display: flex; width: 100%; height: 44px; min-height: 44px; padding: 0 6px; align-items: center; justify-content: center; border-radius: 10px; background: var(--surface-muted); color: var(--muted); font-size: 13px; font-weight: 600; line-height: 1; }
.preset-row button.active { background: var(--primary-action); color: var(--on-primary-action); box-shadow: 0 5px 12px rgba(33, 39, 33, .12); }
.measure-title { margin-top: 20px; }
.measure-card { overflow: hidden; }
.measure-row { display: flex; min-height: 62px; padding: 9px 12px; align-items: center; gap: 11px; }
.measure-icon { display: flex; width: 40px; height: 40px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 12px; background: var(--bs-vi-sys-color-status-info-background); }
.measure-icon--success { background: var(--bs-vi-sys-color-status-success-background); }
.measure-icon--navy { background: var(--surface-muted); }
.measure-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.measure-copy text:first-child { font-size: 13px; font-weight: 700; line-height: 1.25; }
.measure-copy text:last-child { margin-top: 4px; color: var(--muted); font-size: 11px; line-height: 1.3; }
.measure-number { color: var(--muted); font-size: 12px; }
.measure-divider { height: 1px; margin-left: 61px; background: var(--divider); }
.warning-note { display: flex; min-height: 58px; margin-top: 14px; padding: 11px 13px; align-items: flex-start; gap: 9px; border-radius: var(--bs-vi-sys-radius-control); background: var(--bs-vi-sys-color-status-warning-background); color: var(--bs-vi-sys-color-text-warning); }
.warning-note text { flex: 1; font-size: 12px; line-height: 1.5; }
.save-button { margin-top: 14px; }
.offline-help { text-align: center; }
</style>
