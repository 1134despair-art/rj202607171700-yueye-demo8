<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppEmptyState from "@/components/AppEmptyState.vue";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useDiagnosisStore } from "@/stores/diagnosis";

const diagnosis = useDiagnosisStore();
const { t } = useI18n();
const moduleName = (module: string) => t(`service.moduleNames.${module.toLowerCase()}`);
</script>

<template>
  <view class="page-shell safe-bottom">
    <AppHeader :title="t('diagnosis.resultTitle')" back />
    <view v-if="diagnosis.latest" class="result-hero" :class="{ warning: !diagnosis.latest.healthy }"><UiIcon v-if="diagnosis.latest.healthy" name="CheckCircle2" tone="success" :size="42" /><UiIcon v-else name="TriangleAlert" tone="warning" :size="42" /><text class="brand-font">{{ diagnosis.latest.healthy ? t("diagnosis.allNormal") : t("diagnosis.attention") }}</text><text>{{ new Date(diagnosis.latest.createdAt).toLocaleString() }}</text></view>
    <view class="content">
      <template v-if="diagnosis.latest">
        <view class="card result-list"><view v-for="item in diagnosis.latest.items" :key="item.id" class="result-row"><view class="result-icon" :class="item.status === 'ok' ? 'result-icon--ok' : 'result-icon--warning'"><UiIcon :name="item.id === 'bms' ? 'BatteryMedium' : item.id === 'mcu' ? 'Cpu' : 'Gauge'" :tone="item.status === 'ok' ? 'success' : 'danger'" :size="19" /></view><view class="result-copy"><text>{{ moduleName(item.module) }}</text><text>{{ item.message ? t(item.message) : "" }}</text><text v-if="item.code" class="fault-code">{{ item.code }}</text></view><text class="status-pill" :class="item.status === 'ok' ? 'status-pill--green' : 'status-pill--red'">{{ item.status === 'ok' ? t("diagnosis.pass") : t("diagnosis.fault") }}</text></view></view>
        <view v-if="!diagnosis.latest.healthy" class="advice card"><text>{{ t("diagnosis.guidance") }}</text><text v-for="item in diagnosis.latest.items.filter((entry) => entry.status === 'warning')" :key="item.id">{{ item.advice ? t(item.advice) : t("diagnosis.advice.unknown") }}</text></view>
        <button class="primary-button rerun" @click="uni.redirectTo({ url: '/pages/service/diagnosis' })">{{ t("diagnosis.rerun") }}</button>
      </template>
      <AppEmptyState v-else class="diagnosis-empty card" :title="t('diagnosis.noResult')" :copy="t('diagnosis.noResultCopy')">
        <template #icon><UiIcon name="Stethoscope" tone="info" :size="26" /></template>
        <button class="primary-button rerun" @click="uni.redirectTo({ url: '/pages/service/diagnosis' })">{{ t("diagnosis.startDiagnosis") }}</button>
      </AppEmptyState>
    </view>
  </view>
</template>

<style scoped lang="scss">
.result-hero { display: flex; min-height: 168px; padding: 22px; flex-direction: column; align-items: center; justify-content: center; gap: 9px; background: var(--stage-bg); color: var(--ride-green); text-align: center; }
.result-hero.warning { color: var(--signal-red); }
.result-hero .brand-font { color: var(--ink); font-size: 22px; }
.result-hero > text:last-child { color: var(--muted); font-size: 12px; }
.result-list { padding: 0 14px; }
.result-row { display: flex; min-height: 78px; padding: 12px 0; align-items: center; gap: 12px; border-bottom: 1px solid var(--divider); }
.result-row:last-child { border: 0; }
.result-icon { display: flex; width: 38px; height: 38px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 50%; background: var(--v3-success-soft); }
.result-icon--warning { background: var(--bs-vi-sys-color-status-danger-background); }
.result-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.result-copy text:first-child { font-weight: 700; }
.result-copy text:nth-child(2) { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.fault-code { margin-top: 5px; color: var(--bs-vi-sys-color-text-danger); font-family: monospace; font-size: 12px; }
.advice { margin-top: 12px; padding: 15px; border-color: var(--bs-vi-sys-color-text-danger); background: var(--bs-vi-sys-color-status-danger-background); }
.advice text { display: block; }
.advice text:first-child { font-weight: 700; }
.advice text:not(:first-child) { margin-top: 6px; color: var(--muted); font-size: 12px; line-height: 1.5; }
.rerun { margin-top: 20px; }
.diagnosis-empty { min-height: 260px; }
.diagnosis-empty .rerun { width: 100%; margin-top: 24px; }
</style>
