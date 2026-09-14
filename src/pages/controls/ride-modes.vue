<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import AppModalShell from "@/components/AppModalShell.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useAppStore } from "@/stores/app";
import { useVehicleStore } from "@/stores/vehicle";
import { useFeedback } from "@/composables/useFeedback";
import wheelieVehicleImage from "@/assets/ui/illustrations/binsen-x5-real-wheelie@3x.png";
import {
  normalizeWheelieAngle,
  WHEELIE_ANGLE_MAX,
  WHEELIE_ANGLE_MIN,
  WHEELIE_ANGLE_STEP,
  WHEELIE_ANGLE_TICKS,
} from "@/utils/wheelieAngle";
import type { ControlSettings, SpeedLimit, WheelieMode } from "@/types";

const vehicle = useVehicleStore();
const app = useAppStore();
const { t } = useI18n();
const feedback = useFeedback();
const regen = ref(vehicle.controls.regenLevel);
const wheelie = ref<WheelieMode>(vehicle.controls.wheelieMode);
const maxAngle = ref(vehicle.controls.wheelieMaxAngle);
const speed = ref<SpeedLimit>(vehicle.controls.speedLimit);
type PendingSetting = "regen" | "wheelie" | "wheelieAngle" | "speed";
const pendingSetting = ref<PendingSetting | null>(null);
const isWriting = computed(() => pendingSetting.value !== null || vehicle.saving);
const regenOptions = [0, 1, 2, 3];
const wheelieOptions: WheelieMode[] = ["off", "practice", "advanced", "master", "custom"];
const speedOptions: SpeedLimit[] = [0, 25, 45];
const angleTicks = WHEELIE_ANGLE_TICKS;
const disclaimerOpen = ref(false);
const disclaimerAcknowledged = ref(false);
const disclaimerTarget = ref<WheelieMode | null>(null);
const disclaimerActionLabel = computed(() => disclaimerTarget.value
  ? t("controls.wheelieDisclaimerAgree")
  : t("common.done"));

async function applySetting(
  pending: PendingSetting,
  label: string,
  values: Partial<ControlSettings>,
  apply: () => void,
  rollback: () => void,
) {
  if (!vehicle.isConnected) {
    feedback.toast({ message: t("controls.connectRequired"), tone: "warning" });
    return;
  }
  if (isWriting.value) return;

  pendingSetting.value = pending;
  apply();
  try {
    await vehicle.writeControls(values);
    feedback.toast({ message: t("controls.settingApplied", { setting: label }), tone: "success" });
  } catch (reason) {
    rollback();
    feedback.toast({
      message: t("controls.settingApplyFailed", {
        setting: label,
        reason: reason instanceof Error ? reason.message : t("controls.writeFailed"),
      }),
      tone: "danger",
    });
  } finally {
    pendingSetting.value = null;
  }
}

function setRegen(option: number) {
  const previous = regen.value;
  if (previous === option) return;
  void applySetting("regen", t("controls.regenLevel"), { regenLevel: option }, () => { regen.value = option; }, () => { regen.value = previous; });
}

function applyWheelieMode(option: WheelieMode) {
  const previous = wheelie.value;
  if (previous === option) return;
  const values: Partial<ControlSettings> = option === "custom"
    ? { wheelieMode: option, wheelieMaxAngle: normalizeWheelieAngle(maxAngle.value) }
    : { wheelieMode: option };
  void applySetting("wheelie", t("controls.wheelieMode"), values, () => { wheelie.value = option; }, () => { wheelie.value = previous; });
}

function setWheelie(option: WheelieMode) {
  if (wheelie.value === option) return;
  if (option !== "off" && !app.wheelieDisclaimerAccepted) {
    disclaimerTarget.value = option;
    disclaimerAcknowledged.value = false;
    disclaimerOpen.value = true;
    return;
  }
  applyWheelieMode(option);
}

function showWheelieDisclaimer() {
  disclaimerTarget.value = null;
  disclaimerAcknowledged.value = app.wheelieDisclaimerAccepted;
  disclaimerOpen.value = true;
}

function dismissWheelieDisclaimer() {
  disclaimerOpen.value = false;
  disclaimerTarget.value = null;
  disclaimerAcknowledged.value = false;
}

function acceptWheelieDisclaimer() {
  if (!disclaimerAcknowledged.value) return;
  const target = disclaimerTarget.value;
  app.acceptWheelieDisclaimer();
  disclaimerOpen.value = false;
  disclaimerTarget.value = null;
  if (target) applyWheelieMode(target);
}

function previewWheelieAngle(value: number) {
  if (isWriting.value) return;
  maxAngle.value = normalizeWheelieAngle(value);
}

function setWheelieAngle(value: number) {
  const next = normalizeWheelieAngle(value);
  const previous = vehicle.controls.wheelieMaxAngle;
  maxAngle.value = next;
  if (previous === next) return;
  void applySetting(
    "wheelieAngle",
    t("controls.wheelieMaxAngle"),
    { wheelieMaxAngle: next },
    () => { maxAngle.value = next; },
    () => { maxAngle.value = previous; },
  );
}

function setSpeed(option: SpeedLimit) {
  const previous = speed.value;
  if (previous === option) return;
  void applySetting("speed", t("controls.speedLimit"), { speedLimit: option }, () => { speed.value = option; }, () => { speed.value = previous; });
}
</script>

<template>
  <view class="page-shell safe-bottom">
    <AppHeader :title="t('controls.rideModes')" back />
    <scroll-view scroll-y class="page-scroll">
      <view class="content mode-content">
        <view v-if="!vehicle.isConnected" class="offline card"><text>{{ t("controls.connectionRequired") }}</text><text>{{ t("controls.connectionRequiredCopy") }}</text><button class="primary-button" @click="uni.switchTab({ url: '/pages/home/index' })">{{ t("controls.goHome") }}</button></view>

        <text class="section-title">{{ t("controls.energyRecovery") }}</text>
        <view class="setting-card card">
          <view class="setting-heading"><view class="mode-icon info"><UiIcon name="RefreshCw" tone="info" :size="20" /></view><view><text>{{ t("controls.regenerative") }}</text><text>{{ t("controls.regenerativeCopy") }}</text></view></view>
          <view class="choice-grid four" :aria-busy="pendingSetting === 'regen'"><button v-for="option in regenOptions" :key="option" :class="{ active: regen === option, pending: pendingSetting === 'regen' && regen === option }" :disabled="!vehicle.isConnected || isWriting" @click="setRegen(option)"><UiIcon v-if="pendingSetting === 'regen' && regen === option" name="LoaderCircle" tone="inverse" :size="14" spinning />{{ t(`controls.regenOptions.${option}`) }}</button></view>
        </view>

        <text class="section-title">{{ t("controls.wheelieMode") }}</text>
        <view class="setting-card card">
          <view class="setting-heading"><view class="mode-icon warning"><UiIcon name="Bike" tone="warning" :size="20" /></view><view><text>{{ t("controls.wheelieMode") }}</text><text>{{ t("controls.wheelieCopy") }}</text></view></view>
          <view class="wheelie-risk" data-testid="wheelie-risk-summary">
            <UiIcon name="TriangleAlert" tone="danger" :size="19" />
            <view><text>{{ t("controls.wheelieRiskTitle") }}</text><text>{{ t("controls.wheelieRiskSummary") }}</text></view>
            <button class="wheelie-risk__review" @click="showWheelieDisclaimer">{{ t("controls.wheelieDisclaimerReview") }}<UiIcon name="ChevronRight" tone="danger" :size="15" /></button>
          </view>
          <view class="choice-grid wheelie" :aria-busy="pendingSetting === 'wheelie'"><button v-for="option in wheelieOptions" :key="option" :class="{ active: wheelie === option, pending: pendingSetting === 'wheelie' && wheelie === option }" :disabled="!vehicle.isConnected || isWriting" @click="setWheelie(option)"><UiIcon v-if="pendingSetting === 'wheelie' && wheelie === option" name="LoaderCircle" tone="inverse" :size="14" spinning />{{ t(`controls.wheelieOptions.${option}`) }}</button></view>
          <view
            v-if="wheelie === 'custom'"
            class="custom-angle"
            :class="{ writing: isWriting }"
            :aria-busy="isWriting"
          >
            <view class="angle-heading">
              <text>{{ t("controls.wheelieMaxAngle") }}</text>
              <view class="angle-value" aria-live="polite">
                <UiIcon v-if="pendingSetting === 'wheelieAngle'" name="LoaderCircle" tone="info" :size="16" spinning />
                <text>{{ maxAngle }}°</text>
              </view>
            </view>

            <view
              class="angle-stage"
              :style="{ '--wheelie-angle': `${maxAngle}deg` }"
              role="img"
              :aria-label="t('controls.wheelieAnglePreview', { angle: maxAngle })"
            >
              <view class="angle-stage__grid" aria-hidden="true" />
              <view class="angle-stage__ground" aria-hidden="true" />
              <view class="angle-stage__baseline" aria-hidden="true" />
              <view class="angle-stage__ray" aria-hidden="true" />
              <view class="angle-stage__bike" aria-hidden="true"><image :src="wheelieVehicleImage" mode="aspectFit" /></view>
              <view class="angle-stage__pivot" aria-hidden="true" />
              <text class="angle-stage__brand" aria-hidden="true">RAVEN</text>
            </view>

            <slider
              class="angle-slider"
              :value="maxAngle"
              :min="WHEELIE_ANGLE_MIN"
              :max="WHEELIE_ANGLE_MAX"
              :step="WHEELIE_ANGLE_STEP"
              active-color="#C1E54E"
              background-color="#DDE2DA"
              :disabled="!vehicle.isConnected || isWriting"
              @changing="previewWheelieAngle(Number($event.detail.value))"
              @change="setWheelieAngle(Number($event.detail.value))"
            />
            <view class="angle-scale" aria-hidden="true">
              <view v-for="tick in angleTicks" :key="tick" class="angle-scale__tick">
                <view />
                <text>{{ tick }}°</text>
              </view>
            </view>
          </view>
        </view>

        <text class="section-title">{{ t("controls.speedLimit") }}</text>
        <view class="setting-card card">
          <view class="setting-heading"><view class="mode-icon brand"><UiIcon name="Gauge" tone="navy" :size="20" /></view><view><text>{{ t("controls.speedLimit") }}</text><text>{{ t("controls.speedLimitCopy") }}</text></view></view>
          <view class="choice-grid three" :aria-busy="pendingSetting === 'speed'"><button v-for="option in speedOptions" :key="option" :class="{ active: speed === option, pending: pendingSetting === 'speed' && speed === option }" :disabled="!vehicle.isConnected || isWriting" @click="setSpeed(option)"><UiIcon v-if="pendingSetting === 'speed' && speed === option" name="LoaderCircle" tone="inverse" :size="14" spinning />{{ option === 0 ? t("common.off") : `${option} km/h` }}</button></view>
        </view>
      </view>
    </scroll-view>

    <AppModalShell
      :open="disclaimerOpen"
      :title="t('controls.wheelieDisclaimerTitle')"
      tone="danger"
      icon="TriangleAlert"
      data-testid="wheelie-disclaimer"
      @dismiss="dismissWheelieDisclaimer"
    >
      <view class="disclaimer-copy">
        <text>{{ t("controls.wheelieDisclaimerRisk") }}</text>
        <text>{{ t("controls.wheelieDisclaimerTraining") }}</text>
        <text>{{ t("controls.wheelieDisclaimerProtection") }}</text>
        <text>{{ t("controls.wheelieDisclaimerResponsibility") }}</text>
      </view>
      <button
        class="disclaimer-check"
        role="checkbox"
        :aria-checked="disclaimerAcknowledged"
        data-testid="wheelie-disclaimer-check"
        @click="disclaimerAcknowledged = !disclaimerAcknowledged"
      >
        <view class="disclaimer-check__box" :class="{ checked: disclaimerAcknowledged }"><UiIcon v-if="disclaimerAcknowledged" name="Check" tone="inverse" :size="14" /></view>
        <text>{{ t("controls.wheelieDisclaimerAcknowledge") }}</text>
      </button>
      <template #actions>
        <button class="secondary-button" data-testid="wheelie-disclaimer-cancel" @click="dismissWheelieDisclaimer">{{ t("common.cancel") }}</button>
        <button class="primary-button primary-button--red" :disabled="!disclaimerAcknowledged" data-testid="wheelie-disclaimer-confirm" @click="acceptWheelieDisclaimer">{{ disclaimerActionLabel }}</button>
      </template>
    </AppModalShell>
  </view>
</template>

<style scoped lang="scss">
.mode-content { padding-bottom: 28px; }
.offline { padding: 16px; background: var(--bs-vi-sys-color-status-danger-background); border-color: var(--bs-vi-sys-color-text-danger); }
.offline > text { display: block; }
.offline > text:first-child { font-weight: 700; }
.offline > text:nth-child(2) { margin-top: 5px; color: var(--muted); font-size: 12px; line-height: 1.45; }
.offline .primary-button { margin-top: 14px; }
.setting-card { padding: 16px; }
.setting-heading { display: flex; align-items: center; gap: 11px; }
.setting-heading > view:last-child { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.setting-heading > view:last-child text:first-child { font-weight: 700; }
.setting-heading > view:last-child text:last-child { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.mode-icon { display: flex; width: 40px; height: 40px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 12px; }
.mode-icon.info { background: var(--bs-vi-sys-color-status-info-background); }
.mode-icon.warning { background: var(--bs-vi-sys-color-status-warning-background); }
.mode-icon.brand { background: var(--accent-soft); }
.wheelie-risk { display: grid; margin-top: 14px; padding: 11px 12px; align-items: center; grid-template-columns: auto minmax(0, 1fr) auto; gap: 9px; border-left: 3px solid var(--bs-vi-ref-color-semantic-danger); border-radius: 12px; background: var(--bs-vi-sys-color-status-danger-background); }
.wheelie-risk > view { display: flex; min-width: 0; flex-direction: column; }
.wheelie-risk > view text:first-child { color: var(--bs-vi-sys-color-text-danger); font-size: 12px; font-weight: 800; }
.wheelie-risk > view text:last-child { margin-top: 2px; color: var(--muted); font-size: 11px; line-height: 1.4; }
.wheelie-risk__review { display: flex; min-width: 64px; min-height: 44px; padding: 0 2px 0 8px; align-items: center; justify-content: flex-end; gap: 2px; color: var(--bs-vi-sys-color-text-danger); font-size: 12px; font-weight: 700; white-space: nowrap; }
.choice-grid { display: grid; margin-top: 16px; gap: 8px; }
.choice-grid.four { grid-template-columns: repeat(4, 1fr); }
.choice-grid.three { grid-template-columns: repeat(3, 1fr); }
.choice-grid.wheelie { grid-template-columns: repeat(3, 1fr); }
.choice-grid button { display: flex; min-width: 0; min-height: 44px; padding: 6px 4px; align-items: center; justify-content: center; gap: 5px; border: 1px solid var(--bs-vi-sys-color-border-strong); border-radius: 12px; background: var(--surface); color: var(--muted); font-size: 12px; line-height: 1.25; }
.choice-grid button.active { border-color: var(--primary-action); background: var(--primary-action); color: var(--on-primary-action); font-weight: 700; }
.choice-grid button.pending { cursor: wait; }
.choice-grid button:disabled { opacity: .52; }
.custom-angle { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--divider); }
.custom-angle.writing { cursor: wait; }
.angle-heading { display: flex; min-height: 38px; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; font-weight: 700; }
.angle-value { display: flex; min-width: 68px; align-items: center; justify-content: flex-end; gap: 6px; color: var(--navy); font-variant-numeric: tabular-nums; }
.angle-value text { font-size: 24px; font-weight: 800; line-height: 1; }
.angle-stage { position: relative; height: 206px; margin-top: 10px; overflow: hidden; border-radius: 16px; background: linear-gradient(180deg, #edf3ef 0%, #f8faf8 72%, #e2e9e3 72%, #dbe4dc 100%); }
.angle-stage__grid { position: absolute; inset: 0 0 28%; opacity: .32; background-image: linear-gradient(rgba(19, 58, 55, .12) 1px, transparent 1px), linear-gradient(90deg, rgba(19, 58, 55, .12) 1px, transparent 1px); background-size: 32px 32px; }
.angle-stage__ground { position: absolute; right: 0; bottom: 0; left: 0; height: 28%; background: rgba(13, 42, 42, .08); }
.angle-stage__baseline { position: absolute; right: 7%; bottom: 33px; left: 8%; height: 1px; background: rgba(17, 48, 47, .38); }
.angle-stage__ray { position: absolute; bottom: 33px; left: 28%; width: 62%; height: 2px; border-radius: 2px; background: var(--accent); box-shadow: 0 0 0 1px rgba(57, 77, 27, .12); transform: rotate(calc(var(--wheelie-angle) * -1)); transform-origin: left center; transition: transform 100ms linear; }
.angle-stage__bike { position: absolute; top: calc(100% - 33px); left: 28%; width: 72%; max-width: 250px; aspect-ratio: 5 / 3; transform: rotate(calc(var(--wheelie-angle) * -1)); transform-origin: 0 0; transition: transform 100ms linear; }
.angle-stage__bike image { position: absolute; top: 0; left: 0; display: block; width: 100%; height: 100%; transform: translate(-25%, -93%); }
.angle-stage__pivot { position: absolute; bottom: 28px; left: calc(28% - 5px); width: 10px; height: 10px; border: 2px solid white; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 1px rgba(13, 42, 42, .24); }
.angle-stage__brand { position: absolute; right: 12px; bottom: 9px; color: rgba(13, 42, 42, .64); font-size: 11px; font-weight: 800; letter-spacing: 0; }
.angle-slider { margin: 17px 0 0; }
.angle-scale { display: flex; margin: -2px 12px 0; align-items: flex-start; justify-content: space-between; }
.angle-scale__tick { display: flex; min-width: 22px; flex-direction: column; align-items: center; color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.angle-scale__tick > view { width: 1px; height: 6px; margin-bottom: 4px; background: var(--bs-vi-sys-color-border-strong); }
.disclaimer-copy { margin-top: 15px; padding: 12px 13px; border-left: 3px solid var(--bs-vi-ref-color-semantic-danger); border-radius: 12px; background: var(--bs-vi-sys-color-status-danger-background); text-align: left; }
.disclaimer-copy text { display: block; color: var(--ink); font-size: 12px; line-height: 1.55; }
.disclaimer-copy text + text { margin-top: 8px; }
.disclaimer-check { display: flex; width: 100%; min-height: 52px; margin-top: 14px; padding: 9px 11px; align-items: center; gap: 10px; border: 1px solid var(--bs-vi-sys-color-border-strong); border-radius: 12px; background: var(--surface); color: var(--ink); text-align: left; }
.disclaimer-check__box { display: flex; width: 22px; height: 22px; flex: 0 0 auto; align-items: center; justify-content: center; border: 1px solid var(--bs-vi-sys-color-border-strong); border-radius: 3px; background: var(--surface); }
.disclaimer-check__box.checked { border-color: var(--bs-vi-ref-color-semantic-danger); background: var(--bs-vi-ref-color-semantic-danger); }
.disclaimer-check text { font-size: 12px; font-weight: 700; line-height: 1.45; }
@media (prefers-reduced-motion: reduce) {
  .angle-stage__ray,
  .angle-stage__bike { transition: none; }
}
</style>
