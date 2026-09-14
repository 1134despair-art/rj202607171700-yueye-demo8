<script setup lang="ts">
import { ref } from "vue";
import { onShow, onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import appMarkImage from "@/assets/ui/branding/binsen-app-mark@3x.png";
import { APP_CURRENT_VERSION, APP_TARGET_VERSION } from "@/mock/seed";
import { useAppStore } from "@/stores/app";
import { useUpdateMessageStore } from "@/stores/updateMessages";
import { useFeedback } from "@/composables/useFeedback";

const app = useAppStore();
const updateMessages = useUpdateMessageStore();
const { t } = useI18n();
const feedback = useFeedback();
const state = ref<"idle" | "checking" | "available" | "latest" | "failed">("idle");
let timer: ReturnType<typeof setTimeout> | undefined;

function check() {
  if (timer) clearTimeout(timer);
  state.value = "checking";
  timer = setTimeout(() => {
    timer = undefined;
    state.value = app.preferences.appUpdateScenario;
  }, 650);
}

async function openStore() {
  const completed = await feedback.confirm({
    title: t("appUpdate.completeTitle"),
    content: t("appUpdate.completeCopy"),
    cancelText: t("appUpdate.completeLater"),
    confirmText: t("appUpdate.completeConfirm"),
    tone: "info",
  });
  if (!completed) return;
  app.setAppUpdateScenario("latest");
  state.value = "latest";
  feedback.toast({ message: t("appUpdate.completed", { version: APP_TARGET_VERSION }), tone: "success" });
}

onShow(() => {
  updateMessages.markRead("app");
  if (state.value === "idle") check();
});
onUnload(() => { if (timer) clearTimeout(timer); });
</script>

<template>
  <view class="page-shell safe-bottom">
    <AppHeader :title="t('appUpdate.title')" back />
    <view class="app-update-hero">
      <image class="app-icon" :src="appMarkImage" mode="aspectFit" />
      <text class="brand-font">BINSEN RIDE</text>
      <text>{{ state === "checking" ? t("appUpdate.checking") : state === "available" ? t("appUpdate.available") : state === "latest" ? t("appUpdate.upToDate") : state === "failed" ? t("appUpdate.checkFailed") : t("appUpdate.currentVersion") }}</text>
    </view>
    <view class="content app-update-content">
      <view v-if="state === 'checking'" class="result-card"><view class="result-icon"><UiIcon name="RefreshCw" tone="info" :size="24" spinning /></view><view><text>{{ t("appUpdate.checking") }}</text><text>{{ t("appUpdate.checkingCopy") }}</text></view></view>
      <view v-else-if="state === 'failed'" class="result-card result-card--danger"><view class="result-icon"><UiIcon name="CircleAlert" tone="danger" :size="24" /></view><view><text>{{ t("appUpdate.checkFailed") }}</text><text>{{ t("appUpdate.checkFailedCopy") }}</text></view></view>
      <view v-else-if="state === 'latest'" class="result-card result-card--success"><view class="result-icon"><UiIcon name="ShieldCheck" tone="success" :size="24" /></view><view><text>{{ t("appUpdate.upToDate") }}</text><text>{{ t("appUpdate.upToDateCopy") }}</text></view></view>
      <view v-else class="result-card"><view class="result-icon"><UiIcon name="ArrowUpFromLine" tone="warning" :size="24" /></view><view><text>{{ t("appUpdate.available") }}</text><text>{{ t("appUpdate.availableCopy") }}</text></view></view>
      <text class="section-title">{{ t("appUpdate.versionService") }}</text>
      <view class="info-row"><text>{{ t("appUpdate.installedVersion") }}</text><text>{{ APP_CURRENT_VERSION }}</text></view>
      <view class="info-row"><text>{{ t("appUpdate.updateChannel") }}</text><text>{{ t("appUpdate.appStore") }}</text></view>
      <view class="info-row"><text>{{ t("appUpdate.checkState") }}</text><text class="state-value">{{ state === "checking" ? t("appUpdate.checkingShort") : state === "available" ? t("appUpdate.availableShort") : state === "latest" ? t("appUpdate.latestShort") : t("appUpdate.failedShort") }}</text></view>
      <template v-if="state === 'available'">
        <view class="version-flow card"><view><text>{{ t("appUpdate.installed") }}</text><text>{{ APP_CURRENT_VERSION }}</text></view><view /><view><text>{{ t("appUpdate.latest") }}</text><text>{{ APP_TARGET_VERSION }}</text></view></view>
        <text class="section-title">{{ t("appUpdate.releaseNotes") }}</text>
        <view class="card notes"><view><UiIcon name="Check" tone="success" :size="15" /><text>{{ t("appUpdate.notes.connection") }}</text></view><view><UiIcon name="Check" tone="success" :size="15" /><text>{{ t("appUpdate.notes.layout") }}</text></view><view><UiIcon name="Check" tone="success" :size="15" /><text>{{ t("appUpdate.notes.privacy") }}</text></view></view>
      </template>
      <button v-if="state === 'available'" class="primary-button action" @click="openStore"><UiIcon name="ArrowUpFromLine" tone="inverse" :size="19" />{{ t("appUpdate.openStore") }}</button>
      <button v-else class="secondary-button action" :disabled="state === 'checking'" @click="check"><UiIcon name="RefreshCw" tone="navy" :size="18" :spinning="state === 'checking'" />{{ state === "failed" ? t("appUpdate.retry") : t("appUpdate.checkAgain") }}</button>
      <text class="disclaimer">{{ t("appUpdate.disclaimer") }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.app-update-hero { display: flex; min-height: 180px; padding: 22px; flex-direction: column; align-items: center; justify-content: center; border: 0 !important; border-bottom: 1px solid var(--divider) !important; background: transparent !important; color: var(--ink); text-align: center; }
.app-icon { display: block; width: 52px; height: 52px; margin-bottom: 11px; border-radius: 12px; box-shadow: var(--v3-shadow-card); }
.app-update-hero .brand-font { font-size: 23px; }
.app-update-hero > text:last-child { margin-top: 6px; color: var(--muted); font-size: 13px; }
.app-update-content { padding-top: 0 !important; }
.result-card { display: flex; min-height: 104px; align-items: center; gap: 14px; border-bottom: 1px solid var(--divider); }
.result-icon { display: flex; width: 42px; height: 42px; flex: 0 0 42px; align-items: center; justify-content: center; border-radius: 50%; background: rgba(53,198,189,.12); }
.result-card--danger .result-icon { background: var(--bs-vi-sys-color-status-danger-background); }
.result-card--success .result-icon { background: var(--bs-vi-sys-color-status-success-background); }
.result-card > view { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.result-card > view text:first-child { font-size: 15px; font-weight: 700; }
.result-card > view text:last-child { margin-top: 5px; color: var(--muted); font-size: 12px; line-height: 1.45; }
.info-row { display: flex; min-height: 52px; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--divider); color: var(--muted); font-size: 12px; }
.info-row text:last-child { color: var(--ink); font-weight: 700; text-align: right; }
.info-row .state-value { color: #5bc5c1; }
.version-flow { display: grid; min-height: 72px; padding: 12px 15px; align-items: center; grid-template-columns: auto 1fr auto; gap: 15px; }
.version-flow > view:not(:nth-child(2)) { display: flex; flex-direction: column; }
.version-flow > view:nth-child(2) { height: 1px; background: var(--divider); }
.version-flow text:first-child { color: var(--muted); font-size: 11px; }
.version-flow text:last-child { margin-top: 3px; font-size: 22px; font-variant-numeric: tabular-nums; font-weight: 900; }
.notes { padding: 8px 14px; }
.notes view { display: flex; min-height: 44px; align-items: center; gap: 9px; color: var(--muted); font-size: 12px; }
.action { margin-top: 20px; }
.disclaimer { display: block; margin-top: 10px; color: var(--muted); font-size: 12px; line-height: 1.5; text-align: center; }
</style>
