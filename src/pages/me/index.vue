<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import AppTabBar from "@/components/AppTabBar.vue";
import ListRow from "@/components/ListRow.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useAppStore } from "@/stores/app";
import { useOtaStore } from "@/stores/ota";
import { useVehicleStore } from "@/stores/vehicle";
import { APP_CURRENT_VERSION, APP_TARGET_VERSION } from "@/mock/seed";
import { useFeedback } from "@/composables/useFeedback";
import { getVehicleDisplayName, getVehicleIdentityLine } from "@/utils/vehicleDisplay";

const app = useAppStore();
const ota = useOtaStore();
const vehicle = useVehicleStore();
const { t } = useI18n();
const feedback = useFeedback();
const cacheSize = computed(() => `${(app.cacheBytes / 1_000_000).toFixed(1)} MB`);
const languageName = computed(() => t(app.preferences.language === "zh" ? "me.chinese" : "me.english"));
const appUpdateDetail = computed(() => t(`me.appUpdateStatus.${app.preferences.appUpdateScenario}`, {
  current: APP_CURRENT_VERSION,
  target: APP_TARGET_VERSION,
}));
const firmwareUpdateDetail = computed(() => ota.updateCount
  ? t("me.firmwareUpdateCount", { count: ota.updateCount })
  : t("me.firmwareLatest"));

async function clearCache() {
  const confirmed = await feedback.confirm({ title: t("me.clearTitle"), content: t("me.clearCopy"), tone: "warning", cancelText: t("common.cancel") });
  if (confirmed) {
    app.clearCache();
    feedback.toast({ message: t("me.cacheCleared"), tone: "success" });
  }
}

async function changeLanguage() {
  const index = await feedback.choose({
    title: t("me.chooseLanguage"),
    items: [
      { label: t("me.chinese"), icon: "Languages", tone: "info" },
      { label: t("me.english"), icon: "Languages", tone: "muted" },
    ],
    cancelText: t("common.cancel"),
  });
  if (index !== null) app.setLanguage(index === 0 ? "zh" : "en");
}

</script>

<template>
  <view class="page-shell tab-page me-page">
    <AppHeader :title="t('me.title')" />

    <view class="content--tight me-content">
      <view class="device-panel card">
        <view class="device-mark"><UiIcon name="Bike" :size="29" /></view>
        <view class="device-copy">
          <text class="device-name">{{ vehicle.vehicle ? getVehicleDisplayName(vehicle.vehicle) : "BINSEN Ride" }}</text>
          <text class="device-detail">{{ vehicle.vehicle ? getVehicleIdentityLine(vehicle.vehicle) : t("me.localMode") }}</text>
          <text v-if="vehicle.vehicle" class="device-serial">{{ vehicle.vehicle.serialNumber }}</text>
        </view>
        <text class="status-pill" :class="vehicle.vehicle ? 'status-pill--green' : ''">{{ vehicle.vehicle ? t("bind.bound") : t("bind.unbound") }}</text>
      </view>

      <text class="section-title">{{ t("me.vehicleManagement") }}</text>
      <view class="card list-card">
        <ListRow :label="vehicle.vehicle ? t('me.manageCurrentVehicle') : t('me.bindVehicle')" :detail="vehicle.vehicle ? t('me.vehicleManageDetail') : t('me.vehicleBindDetail')" @click="uni.navigateTo({ url: '/pages/onboarding/bind?from=me' })">
          <template #icon><view class="row-icon"><UiIcon name="Bike" tone="info" :size="19" /></view></template>
        </ListRow>
      </view>

      <text class="section-title">{{ t("me.settings") }}</text>
      <view class="card list-card">
        <ListRow :label="t('me.language')" :detail="languageName" @click="changeLanguage"><template #icon><view class="row-icon"><UiIcon name="Languages" tone="info" :size="19" /></view></template></ListRow>
        <view class="list-divider" />
        <ListRow :label="t('me.appUpdate')" :detail="appUpdateDetail" @click="uni.navigateTo({ url: '/pages/me/app-update' })"><template #icon><view class="row-icon row-icon--green"><UiIcon name="RefreshCw" tone="success" :size="19" /></view></template><template #end><text v-if="app.preferences.appUpdateScenario === 'available'" class="row-value">{{ t("me.new") }}</text></template></ListRow>
        <view class="list-divider" />
        <ListRow :label="t('me.firmwareUpdates')" :detail="firmwareUpdateDetail" @click="uni.navigateTo({ url: '/pages/me/firmware-updates' })"><template #icon><view class="row-icon row-icon--amber"><UiIcon name="CloudDownload" tone="warning" :size="19" /></view></template><template #end><text v-if="ota.updateCount" class="row-value">{{ ota.updateCount }}</text></template></ListRow>
        <view class="list-divider" />
        <ListRow :label="t('me.clearCache')" :detail="cacheSize" @click="clearCache"><template #icon><view class="row-icon row-icon--neutral"><UiIcon name="Trash2" tone="navy" :size="19" /></view></template></ListRow>
      </view>

      <text class="section-title">{{ t("me.legalCompany") }}</text>
      <view class="card list-card">
        <ListRow :label="t('me.userAgreement')" @click="uni.navigateTo({ url: '/pages/me/legal?type=terms' })"><template #icon><view class="row-icon"><UiIcon name="FileText" tone="info" :size="19" /></view></template></ListRow>
        <view class="list-divider" />
        <ListRow :label="t('me.privacy')" @click="uni.navigateTo({ url: '/pages/me/legal?type=privacy' })"><template #icon><view class="row-icon"><UiIcon name="ShieldCheck" tone="info" :size="19" /></view></template></ListRow>
        <view class="list-divider" />
        <ListRow :label="t('me.about')" detail="Version 1.0.0" @click="uni.navigateTo({ url: '/pages/me/about' })"><template #icon><view class="row-icon"><UiIcon name="Info" tone="info" :size="19" /></view></template></ListRow>
        <template v-if="app.preferences.debugUnlocked"><view class="list-divider" /><ListRow :label="t('me.developerTools')" :detail="t('me.developerDetail')" @click="uni.navigateTo({ url: '/pages/me/debug' })"><template #icon><view class="row-icon row-icon--amber"><UiIcon name="Wrench" tone="warning" :size="19" /></view></template></ListRow></template>
      </view>

      <view class="local-note"><UiIcon name="Smartphone" tone="muted" :size="17" /><text>{{ t("me.localDataNote") }}</text></view>
    </view>
    <AppTabBar active="me" />
  </view>
</template>

<style scoped lang="scss">
.me-page { background: var(--app-bg); }
.me-content { padding-top: 16px; }
.device-panel { position: relative; display: flex; min-height: 108px; overflow: hidden; padding: 16px; align-items: center; gap: 12px; background: linear-gradient(135deg, var(--v3-hero-start), var(--v3-surface)); }
.device-panel::after { position: absolute; right: -22px; bottom: -32px; width: 112px; height: 112px; border: 1px solid rgba(158,217,78,.16); border-radius: 50%; content: ""; }
.device-mark { display: flex; width: 48px; height: 48px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 50%; background: var(--v3-accent-soft); color: var(--v3-accent-deep); }
.device-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.device-name { font-size: 18px; font-weight: 700; line-height: 1.25; }
.device-detail { margin-top: 5px; overflow-wrap: anywhere; color: var(--muted); font-size: 12px; }
.device-serial { margin-top: 3px; overflow-wrap: anywhere; color: var(--subtle); font-size: 11px; }
.row-icon { display: flex; width: 40px; height: 40px; align-items: center; justify-content: center; border-radius: 50%; background: var(--bs-vi-sys-color-status-info-background); }
.row-icon--green { background: var(--bs-vi-sys-color-status-success-background); }
.row-icon--neutral { background: var(--surface-muted); }
.row-icon--amber { background: var(--bs-vi-sys-color-status-warning-background); }
.row-value { color: var(--muted); font-size: 12px; }
.local-note { display: flex; min-height: 52px; margin-top: 18px; padding: 10px 12px; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--divider); border-radius: 12px; background: var(--surface-stage-translucent); color: var(--muted); font-size: 12px; line-height: 1.45; text-align: center; }
</style>
