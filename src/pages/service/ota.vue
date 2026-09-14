<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useAppStore } from "@/stores/app";
import { useOtaStore } from "@/stores/ota";
import { useVehicleStore } from "@/stores/vehicle";
import { useFeedback } from "@/composables/useFeedback";
import type { OtaModuleId } from "@/types";

const app = useAppStore();
const ota = useOtaStore();
const vehicle = useVehicleStore();
const { t } = useI18n();
const feedback = useFeedback();

async function check() {
  await ota.check(app.preferences.otaScenario, vehicle.vehicle?.model);
  if (ota.session.checkState === "updates") feedback.toast({ message: t("ota.foundCount", { count: ota.updateCount }), tone: "success" });
  if (ota.session.checkState === "none") feedback.toast({ message: t("ota.noUpdates"), tone: "info" });
}

function openModule(id: OtaModuleId) {
  const module = ota.modules.find((item) => item.id === id);
  if (!module?.hasUpdate) return feedback.toast({ message: t("ota.moduleLatest"), tone: "info" });
  ota.selectModule(id);
  uni.navigateTo({ url: "/pages/service/ota-detail" });
}

onShow(() => {
  if (ota.session.checkState === "idle") check();
});
</script>

<template>
  <view class="page-shell safe-bottom">
    <AppHeader :title="t('ota.title')" back />
    <view class="ota-hero">
      <view class="hero-icon"><UiIcon :name="ota.session.checkState === 'failed' ? 'CircleAlert' : ota.updateCount ? 'CloudDownload' : 'ShieldCheck'" :tone="ota.session.checkState === 'failed' ? 'danger' : ota.updateCount ? 'warning' : 'success'" :size="31" /></view>
      <text class="brand-font">{{ ota.session.checkState === "checking" ? t("ota.checking") : ota.session.checkState === "failed" ? t("ota.checkFailed") : ota.updateCount ? `${ota.updateCount} ${t("ota.modulesCanUpdate")}` : t("ota.latest") }}</text>
      <text>{{ t("ota.centerCopy") }}</text>
    </view>
    <view class="content">
      <view v-if="ota.session.checkState === 'failed'" class="state-card danger card"><UiIcon name="CircleAlert" tone="danger" :size="20" /><view><text>{{ t("ota.checkFailed") }}</text><text>{{ t("ota.checkFailedCopy") }}</text></view></view>
      <view v-else-if="ota.session.checkState === 'none'" class="state-card card"><UiIcon name="CheckCircle2" tone="success" :size="20" /><view><text>{{ t("ota.noUpdates") }}</text><text>{{ t("ota.noUpdatesCopy") }}</text></view></view>

      <text class="section-title">{{ t("ota.vehicleModules") }}</text>
      <view class="card module-list">
        <button v-for="item in ota.modules" :key="item.id" class="module-row" @click="openModule(item.id)">
          <view class="module-icon" :data-testid="`ota-module-icon-${item.id}`"><UiIcon :name="item.id === 'bms' ? 'BatteryCharging' : item.id === 'display' ? 'CircleGauge' : 'Cpu'" :tone="item.hasUpdate ? 'warning' : 'success'" :size="21" /></view>
          <view class="module-copy"><text>{{ t(`ota.modules.${item.id}`) }}</text><text>v{{ item.currentVersion }} → v{{ item.targetVersion }}</text></view>
          <view class="module-end"><text class="status-pill" :class="item.hasUpdate ? 'status-pill--red' : 'status-pill--green'">{{ item.hasUpdate ? t("ota.update") : t("ota.latestShort") }}</text><UiIcon name="ChevronRight" tone="muted" :size="17" /></view>
        </button>
      </view>
      <button class="secondary-button check-button" :disabled="ota.session.checkState === 'checking'" @click="check"><UiIcon name="RefreshCw" :tone="ota.session.checkState === 'failed' ? 'danger' : 'navy'" :size="18" :spinning="ota.session.checkState === 'checking'" />{{ ota.session.checkState === "checking" ? t("ota.checking") : t("ota.checkAgain") }}</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ota-hero { display: flex; min-height: 180px; padding: 22px; flex-direction: column; align-items: center; justify-content: center; background: var(--stage-bg); color: var(--ink); text-align: center; }
.hero-icon { display: flex; width: 52px; height: 52px; align-items: center; justify-content: center; border-radius: 12px; background: var(--surface); box-shadow: var(--v3-shadow-card); }
.ota-hero .brand-font { margin-top: 12px; font-size: 22px; }
.ota-hero > text:last-child { max-width: 300px; margin-top: 5px; color: var(--muted); font-size: 12px; line-height: 1.5; }
.state-card { display: flex; min-height: 68px; padding: 12px 14px; align-items: center; gap: 11px; }
.state-card.danger { border-color: var(--bs-vi-sys-color-text-danger); background: var(--bs-vi-sys-color-status-danger-background); }
.state-card view { display: flex; flex-direction: column; }
.state-card view text:first-child { font-weight: 700; }
.state-card view text:last-child { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.module-list { padding: 0 14px; }
.module-row { display: flex; width: 100%; min-height: 76px; padding: 10px 0; align-items: center; gap: 11px; border-bottom: 1px solid var(--divider); background: transparent; text-align: left; }
.module-row:last-child { border: 0; }
.module-icon { display: flex; width: 40px; height: 40px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 12px; background: var(--bs-vi-sys-color-status-warning-background); }
.module-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.module-copy text:first-child { font-weight: 700; }
.module-copy text:last-child { margin-top: 4px; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.module-end { display: flex; flex: 0 0 auto; align-items: center; gap: 6px; }
.check-button { margin-top: 20px; }
</style>
