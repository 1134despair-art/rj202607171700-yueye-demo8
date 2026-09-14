<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import { defaultControls } from "@/mock/seed";
import { useVehicleStore } from "@/stores/vehicle";
import { useFeedback } from "@/composables/useFeedback";

const vehicle = useVehicleStore();
const { t } = useI18n();
const feedback = useFeedback();
const draft = ref([...vehicle.controls.powerCurve]);
const selected = ref(4);
const saving = ref(false);
const points = computed(() => draft.value.map((value, index) => `${index * 11.111},${100 - value}`).join(" "));

function setPoint(index: number, value: number) {
  const minimum = index === 0 ? 0 : draft.value[index - 1];
  const maximum = index === draft.value.length - 1 ? 100 : draft.value[index + 1];
  draft.value[index] = Math.max(minimum, Math.min(maximum, Math.round(value)));
}

function dragPoint(index: number, event: TouchEvent) {
  if (!vehicle.isConnected || saving.value) return;
  const touch = event.touches[0];
  if (!touch) return;
  selected.value = index;
  uni.createSelectorQuery().select(".curve-chart").boundingClientRect((rect: any) => {
    if (!rect) return;
    setPoint(index, 100 - ((touch.clientY - rect.top) / rect.height) * 100);
  }).exec();
}

function reset() {
  draft.value = [...defaultControls.powerCurve];
}

async function save() {
  if (!vehicle.isConnected) return feedback.toast({ message: t("controls.connectBeforeCurve"), tone: "warning" });
  saving.value = true;
  try {
    await vehicle.writePowerCurve(draft.value);
    feedback.toast({ message: t("controls.curveSaved"), tone: "success" });
  } catch (reason) {
    feedback.toast({ message: reason instanceof Error ? reason.message : t("controls.curveSaveFailed"), tone: "danger" });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <view class="page-shell safe-bottom curve-page">
    <AppHeader :title="t('controls.curveTitle')" back>
      <template #right><button class="header-help" @click="feedback.toast({ message: t('controls.curveCopy'), tone: 'info' })">{{ t("controls.curveHelp") }}</button></template>
    </AppHeader>
    <view class="content curve-content">
      <view class="curve-heading">
        <view><text>{{ t("controls.curveOutput") }}</text><text>{{ t("controls.powerCurve") }}</text></view>
        <view class="status-pill" :class="vehicle.isConnected ? 'status-pill--green' : ''">
          <UiIcon :name="vehicle.isConnected ? 'BluetoothConnected' : 'BluetoothOff'" :tone="vehicle.isConnected ? 'success' : 'muted'" :size="15" />
          {{ t(vehicle.isConnected ? "common.connected" : "common.offline") }}
        </view>
      </view>

      <view class="chart-card card" :class="{ 'chart-card--offline': !vehicle.isConnected }">
        <view class="chart-heading"><text>{{ t("controls.curveChartTitle") }}</text><text>{{ t("controls.curveDrag") }}</text></view>
        <view class="curve-chart">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon class="performance-zone" points="0,0 0,100 100,100" />
            <line v-for="position in [20, 40, 60, 80]" :key="`h-${position}`" x1="0" :y1="position" x2="100" :y2="position" />
            <line v-for="position in [20, 40, 60, 80]" :key="`v-${position}`" :x1="position" y1="0" :x2="position" y2="100" />
            <polyline :points="points" />
            <circle v-for="(pointValue, index) in draft" :key="index" :class="{ selected: selected === index }" :cx="index * 11.111" :cy="100 - pointValue" r="2.35" @touchstart.prevent="dragPoint(index, $event as any)" @touchmove.prevent="dragPoint(index, $event as any)" @click="selected = index" />
          </svg>
        </view>

        <view class="point-grid">
          <button v-for="(pointValue, index) in draft" :key="index" :class="{ active: selected === index }" @click="selected = index">
            <text>{{ pointValue }}%</text><text>P{{ index + 1 }}</text>
          </button>
        </view>
      </view>

      <view class="button-row">
        <button class="secondary-button" :disabled="saving" @click="reset"><UiIcon name="RotateCcw" :size="19" />{{ t("controls.resetCurve") }}</button>
        <button class="primary-button" :disabled="!vehicle.isConnected || saving" @click="save"><UiIcon name="Save" tone="inverse" :size="19" />{{ saving ? t("controls.writing") : t("controls.saveCurve") }}</button>
      </view>
      <text v-if="!vehicle.isConnected" class="field-help offline-help">{{ t("controls.connectBeforeCurve") }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.curve-page { background: var(--app-bg); }
.header-help { display: flex; width: 44px; height: 44px; padding: 0; align-items: center; justify-content: center; background: transparent; color: var(--muted); font-size: 13px; line-height: 1; }
.curve-content { padding-top: 18px; }
.curve-heading { display: flex; min-height: 58px; align-items: center; justify-content: space-between; gap: 14px; }
.curve-heading > view:first-child { display: flex; min-width: 0; flex-direction: column; }
.curve-heading > view:first-child text:first-child { font-size: 12px; font-weight: 700; }
.curve-heading > view:first-child text:last-child { margin-top: 4px; font-size: 22px; font-weight: 700; line-height: 1.12; }
.chart-card { margin-top: 10px; padding: 16px; }
.chart-heading { display: flex; min-height: 30px; align-items: flex-start; justify-content: space-between; gap: 12px; }
.chart-heading text:first-child { font-size: 15px; font-weight: 800; }
.chart-heading text:last-child { color: var(--muted); font-size: 11px; }
.curve-chart { position: relative; width: calc(100% - 24px); height: 232px; margin: 10px 12px 0; border-left: 1px solid var(--bs-vi-sys-color-border-strong); border-bottom: 1px solid var(--bs-vi-sys-color-border-strong); }
.curve-chart svg { display: block; width: 100%; height: 100%; overflow: visible; touch-action: none; }
.curve-chart line { stroke: var(--bs-vi-sys-color-border-subtle); stroke-width: .5; vector-effect: non-scaling-stroke; }
.performance-zone { fill: rgba(158,217,78,.09); }
.curve-chart polyline { fill: none; stroke: var(--accent); stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.6; vector-effect: non-scaling-stroke; }
.curve-chart circle { fill: var(--surface); stroke: var(--navy); stroke-width: 1.8; vector-effect: non-scaling-stroke; cursor: pointer; }
.curve-chart circle.selected { fill: var(--accent); stroke-width: 2.4; }
.point-grid { display: grid; margin-top: 40px; gap: 6px; grid-template-columns: repeat(5, minmax(0, 1fr)); }
.point-grid button { display: flex; width: 100%; height: 50px; min-width: 0; min-height: 50px; padding: 4px 2px; flex-direction: column; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: 10px; background: var(--surface-muted); color: var(--ink); line-height: 1; }
.point-grid button.active { border-color: var(--accent); background: var(--accent-soft); }
.point-grid button text:first-child { font-size: 17px; font-variant-numeric: tabular-nums; font-weight: 800; }
.point-grid button text:last-child { margin-top: 4px; color: var(--muted); font-size: 11px; }
.button-row { display: grid; margin-top: 14px; gap: 12px; grid-template-columns: 1fr 1fr; }
.offline-help { text-align: center; }
@media (max-height: 820px) {
  .curve-chart { height: 190px; }
  .point-grid { margin-top: 28px; }
}
</style>
