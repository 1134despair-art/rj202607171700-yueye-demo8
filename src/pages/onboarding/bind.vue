<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { PencilLine, Unlink } from "lucide-vue-next";
import AppHeader from "@/components/AppHeader.vue";
import AppBottomSheet from "@/components/AppBottomSheet.vue";
import UiIcon from "@/components/UiIcon.vue";
import vehicleThumbImage from "@/assets/ui/illustrations/binsen-x5-real-thumb@3x.png";
import { useFeedback } from "@/composables/useFeedback";
import { useVehicleStore } from "@/stores/vehicle";
import { getVehicleDisplayName, getVehicleIdentityLine, getVehicleVin } from "@/utils/vehicleDisplay";

const vehicleStore = useVehicleStore();
const feedback = useFeedback();
const { t } = useI18n();
type SearchState = "idle" | "searching" | "results" | "error";
const searchState = ref<SearchState>("idle");
const renameOpen = ref(false);
const displayNameDraft = ref("");
const displayNameError = ref("");
const origin = ref("");
const fallback = computed(() => origin.value === "me" ? "/pages/me/index" : "/pages/home/index");
let searchTimer: ReturnType<typeof setTimeout> | undefined;

onLoad((options) => { origin.value = String(options?.from || ""); });

function startSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchState.value = "searching";
  searchTimer = setTimeout(() => {
    searchTimer = undefined;
    searchState.value = vehicleStore.availableVehicles.length ? "results" : "error";
  }, 900);
}

const searchTitle = computed(() => t({
  idle: "bind.searchNearby",
  searching: "bind.searching",
  results: "bind.searchComplete",
  error: "bind.searchFailed",
}[searchState.value]));

const searchCopy = computed(() => searchState.value === "results"
  ? `${vehicleStore.availableVehicles.length} ${t("bind.searchFoundSuffix")}`
  : t({
    idle: "bind.searchIdleCopy",
    searching: "bind.searchingCopy",
    error: "bind.noResults",
  }[searchState.value]));

const searchAction = computed(() => t({
  idle: "bind.startSearch",
  searching: "bind.scanning",
  results: "bind.searchAgain",
  error: "bind.retrySearch",
}[searchState.value]));

function openRename() {
  if (!vehicleStore.vehicle) return;
  displayNameDraft.value = getVehicleDisplayName(vehicleStore.vehicle);
  displayNameError.value = "";
  renameOpen.value = true;
}

function closeRename() {
  renameOpen.value = false;
  displayNameError.value = "";
}

function saveDisplayName() {
  const displayName = displayNameDraft.value.trim().replace(/\s+/g, " ");
  if (!displayName) {
    displayNameError.value = t("bind.renameRequired");
    return;
  }
  vehicleStore.setVehicleDisplayName(displayName);
  renameOpen.value = false;
  feedback.toast({ message: t("bind.renameSaved"), tone: "success" });
}

async function unbind() {
  const confirmed = await feedback.confirm({ title: t("bind.unbindTitle"), content: t("bind.unbindCopy"), confirmText: t("bind.unbind"), cancelText: t("common.cancel"), tone: "danger" });
  if (!confirmed) return;
  vehicleStore.unbindVehicle();
  searchState.value = "idle";
  feedback.toast({ message: t("bind.unboundToast"), tone: "success" });
}

function bind(id: string) {
  const selected = vehicleStore.availableVehicles.find((item) => item.id === id);
  if (!selected) return;
  vehicleStore.bindVehicle(selected);
  feedback.toast({ message: t("common.vehicleBound"), tone: "success" });
  setTimeout(() => {
    if (origin.value === "me") uni.switchTab({ url: "/pages/me/index" });
    else uni.switchTab({ url: "/pages/home/index" });
  }, 350);
}

onUnload(() => { if (searchTimer) clearTimeout(searchTimer); });
</script>

<template>
  <view class="page-shell safe-bottom bind-page">
    <AppHeader :title="t('bind.title')" back :fallback="fallback" />
    <scroll-view scroll-y class="page-scroll">
      <view class="content bind-content">
        <text class="eyebrow">{{ t("bind.manager") }}</text>
        <text class="screen-title">{{ t("bind.heading") }}</text>
        <text class="screen-subtitle">{{ t("bind.copy") }}</text>
        <view class="vehicle-mini card">
          <view class="vehicle-overview">
            <image :src="vehicleThumbImage" mode="aspectFit" />
            <view class="vehicle-copy">
              <text class="vehicle-name">{{ vehicleStore.vehicle ? getVehicleDisplayName(vehicleStore.vehicle) : "--" }}</text>
              <text class="vehicle-detail">{{ vehicleStore.vehicle ? getVehicleIdentityLine(vehicleStore.vehicle) : t("bind.waiting") }}</text>
              <text v-if="vehicleStore.vehicle" class="vehicle-detail">{{ t("bind.vin") }} {{ getVehicleVin(vehicleStore.vehicle) }}</text>
              <text v-else class="status-pill vehicle-empty-status">{{ t("bind.unbound") }}</text>
            </view>
          </view>
          <view v-if="vehicleStore.vehicle" class="vehicle-actions">
            <button class="rename-link" data-testid="rename-vehicle" @click="openRename"><PencilLine :size="17" :stroke-width="1.8" /><text>{{ t("bind.rename") }}</text></button>
            <button class="unbind-link" data-testid="unbind-vehicle" @click="unbind"><Unlink :size="17" :stroke-width="1.8" /><text>{{ t("bind.unbind") }}</text></button>
          </view>
        </view>

        <view class="search-card card">
          <view class="scan-ring" :class="{ active: searchState === 'searching', error: searchState === 'error' }"><UiIcon :name="searchState === 'searching' ? 'BluetoothSearching' : searchState === 'error' ? 'WifiOff' : searchState === 'results' ? 'CheckCircle2' : 'Bluetooth'" :tone="searchState === 'error' ? 'danger' : searchState === 'results' ? 'success' : 'info'" :size="28" /></view>
          <text class="search-title">{{ searchTitle }}</text>
          <text class="search-copy">{{ searchCopy }}</text>
          <button class="primary-button" :disabled="searchState === 'searching'" @click="startSearch"><UiIcon :name="searchState === 'searching' ? 'LoaderCircle' : 'Search'" tone="inverse" :size="20" :spinning="searchState === 'searching'" />{{ searchAction }}</button>
        </view>

        <AppBottomSheet :open="searchState === 'results'" @dismiss="searchState = 'idle'">
          <view class="result-sheet">
          <view class="sheet-heading"><text>{{ t("bind.nearby") }}</text><text>{{ vehicleStore.availableVehicles.length }} {{ t("bind.vehicleUnit") }}</text></view>
          <view v-if="!vehicleStore.availableVehicles.length" class="no-results"><UiIcon name="Search" tone="muted" :size="22" /><text>{{ t("bind.noResults") }}</text></view>
          <button v-for="item in vehicleStore.availableVehicles" :key="item.id" class="vehicle-row" @click="bind(item.id)">
            <view class="signal-icon"><UiIcon name="Signal" tone="success" :size="20" /></view>
            <view><text>{{ getVehicleDisplayName(item) }}</text><text>{{ t("bind.vin") }} {{ getVehicleVin(item) }}</text></view>
            <text class="bind-link">{{ t("bind.bind") }}</text>
          </button>
          </view>
        </AppBottomSheet>

        <AppBottomSheet :open="renameOpen" @dismiss="closeRename">
          <view class="rename-sheet" data-testid="rename-vehicle-sheet">
            <view class="rename-heading"><view><UiIcon name="UserPen" tone="info" :size="23" /></view><text>{{ t("bind.renameTitle") }}</text></view>
            <text class="rename-copy">{{ t("bind.renameCopy") }}</text>
            <view class="rename-field" :class="{ invalid: displayNameError }">
              <input v-model="displayNameDraft" data-testid="vehicle-display-name-input" :maxlength="12" :placeholder="t('bind.renamePlaceholder')" :focus="renameOpen" confirm-type="done" @input="displayNameError = ''" @confirm="saveDisplayName" />
              <text>{{ displayNameDraft.length }}/12</text>
            </view>
            <text v-if="displayNameError" class="field-error">{{ displayNameError }}</text>
            <view class="rename-actions"><button class="secondary-button" @click="closeRename">{{ t("common.cancel") }}</button><button class="primary-button" data-testid="save-vehicle-display-name" @click="saveDisplayName"><UiIcon name="Save" tone="inverse" :size="18" />{{ t("common.save") }}</button></view>
          </view>
        </AppBottomSheet>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.bind-page { background: var(--bs-vi-sys-color-background-canvas); }
.bind-content { padding-top: 24px; padding-bottom: 28px; }
.eyebrow { display: block; color: var(--bs-vi-sys-color-action-brand); font-size: 12px; font-weight: 700; }
.screen-title { margin-top: 5px; }
.screen-subtitle { margin-top: 8px; }
.vehicle-mini { margin-top: 18px; padding: 0; overflow: hidden; }
.vehicle-overview { display: flex; min-height: 112px; padding: 18px 16px; align-items: center; gap: 14px; }
.vehicle-overview image { width: 92px; height: 72px; flex: 0 0 auto; }
.vehicle-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.vehicle-name { font-family: var(--bs-vi-sys-typography-family); font-size: 20px; font-weight: 700; line-height: 1.3; overflow-wrap: anywhere; }
.vehicle-detail { margin-top: 5px; color: var(--muted); font-size: 12px; line-height: 1.45; overflow-wrap: anywhere; }
.vehicle-empty-status { margin-top: 8px; align-self: flex-start; }
.search-card { margin-top: 16px; padding: 18px 16px 16px; text-align: center; }
.vehicle-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 5px 0; border-top: 1px solid var(--divider); }
.vehicle-actions button { display: flex; min-width: 0; min-height: 44px; padding: 10px 8px; align-items: center; justify-content: center; gap: 8px; border-radius: 0; background: transparent; font-size: 13px; font-weight: 500; line-height: 1.3; white-space: nowrap; }
.vehicle-actions button + button { border-left: 1px solid var(--divider); }
.vehicle-actions button :deep(svg) { flex-shrink: 0; }
.vehicle-actions button:active { background: rgba(196,225,249,.06); }
.vehicle-actions button:focus-visible { outline: 2px solid var(--accent); outline-offset: -3px; }
.rename-link { color: #e1effb; }
.unbind-link { color: #ffa99e; }
.scan-ring { display: flex; width: 58px; height: 58px; margin: 0 auto 12px; align-items: center; justify-content: center; border-radius: 50%; background: var(--bs-vi-sys-color-status-info-background); }
.scan-ring.active { animation: pulse 1.1s infinite; }
.scan-ring.error { background: var(--bs-vi-sys-color-status-danger-background); }
.search-title { display: block; font-size: 17px; font-weight: 700; }
.search-copy { display: block; margin: 7px auto 16px; color: var(--muted); font-size: 13px; line-height: 1.5; }
.result-sheet { overflow: hidden; border: 1px solid var(--divider); border-radius: var(--bs-vi-sys-radius-card); background: var(--surface); box-shadow: var(--shadow-card); }
.sheet-heading { display: flex; min-height: 44px; padding: 0 14px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--divider); }
.sheet-heading text:first-child { font-size: 15px; font-weight: 700; }
.sheet-heading text:last-child { color: var(--muted); font-size: 12px; }
.vehicle-row { display: flex; width: 100%; min-height: 72px; padding: 10px 14px; align-items: center; gap: 12px; border-bottom: 1px solid var(--divider); background: var(--surface); color: var(--ink); text-align: left; }
.vehicle-row:last-child { border-bottom: 0; }
.signal-icon { display: flex; width: 44px; height: 44px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: var(--bs-vi-sys-radius-control); background: var(--bs-vi-sys-color-status-success-background); }
.vehicle-row > view:nth-child(2) { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.vehicle-row > view:nth-child(2) text:first-child { font-size: 15px; font-weight: 700; }
.vehicle-row > view:nth-child(2) text:last-child { margin-top: 4px; color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
.bind-link { color: var(--accent); font-size: 13px; font-weight: 700; }
.no-results { display: flex; min-height: 96px; padding: 18px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--muted); font-size: 13px; }
.rename-sheet { padding: 0 4px; }
.rename-heading { display: flex; align-items: center; gap: 12px; }
.rename-heading > view { display: flex; width: 44px; height: 44px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 50%; background: var(--bs-vi-sys-color-status-info-background); }
.rename-heading > text { font-size: 20px; font-weight: 700; }
.rename-copy { display: block; margin-top: 12px; color: var(--muted); font-size: 13px; line-height: 1.5; }
.rename-field { display: flex; height: 50px; margin-top: 18px; padding: 0 12px; align-items: center; gap: 8px; border: 1px solid var(--divider); border-radius: var(--bs-vi-sys-radius-control); background: var(--surface-muted); }
.rename-field.invalid { border-color: var(--bs-vi-sys-color-text-danger); }
.rename-field input { min-width: 0; height: 48px; flex: 1; color: var(--ink); font-size: 16px; font-weight: 600; }
.rename-field > text { flex: 0 0 auto; color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.rename-actions { display: grid; margin-top: 20px; grid-template-columns: 1fr 1fr; gap: 12px; }
@keyframes pulse { 50% { transform: scale(.92); opacity: .66; } }
</style>
