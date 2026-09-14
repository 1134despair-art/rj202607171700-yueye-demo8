<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useFeedback } from "@/composables/useFeedback";
import { APP_TARGET_VERSION } from "@/mock/seed";
import { useOtaStore } from "@/stores/ota";
import { useUpdateMessageStore } from "@/stores/updateMessages";
import type { UpdateMessageType } from "@/types";

const ota = useOtaStore();
const updateMessages = useUpdateMessageStore();
const feedback = useFeedback();
const { t } = useI18n();
const summary = computed(() => updateMessages.unreadCount
  ? t("updates.unreadSummary", { count: updateMessages.unreadCount })
  : t("updates.allReadSummary"));

function messageTitle(type: UpdateMessageType) {
  return t(type === "app" ? "updates.appTitle" : "updates.firmwareTitle");
}

function messageCopy(type: UpdateMessageType) {
  return type === "app"
    ? t("updates.appCopy", { version: APP_TARGET_VERSION })
    : t("updates.firmwareCopy", { count: ota.updateCount });
}

function openMessage(type: UpdateMessageType) {
  updateMessages.markRead(type);
  uni.navigateTo({ url: type === "app" ? "/pages/me/app-update" : "/pages/me/firmware-updates" });
}

function markAllRead() {
  updateMessages.markAllRead();
  feedback.toast({ message: t("updates.markedAllRead"), tone: "success" });
}
</script>

<template>
  <view class="page-shell safe-bottom updates-page">
    <AppHeader :title="t('updates.title')" back />
    <view class="updates-summary">
      <view><text>{{ t("updates.heading") }}</text><text>{{ summary }}</text></view>
      <button v-if="updateMessages.unreadCount" class="mark-all" data-testid="mark-all-updates" @click="markAllRead">{{ t("updates.markAllRead") }}</button>
    </view>
    <view class="content">
      <view v-if="updateMessages.messages.length" class="message-list">
        <button
          v-for="message in updateMessages.messages"
          :key="message.type"
          class="message-card card"
          :class="{ 'message-card--unread': message.unread }"
          :data-testid="`update-message-${message.type}`"
          @click="openMessage(message.type)"
        >
          <view class="message-icon" :class="`message-icon--${message.type}`"><UiIcon :name="message.type === 'app' ? 'Smartphone' : 'CloudDownload'" :tone="message.type === 'app' ? 'info' : 'warning'" :size="23" /></view>
          <view class="message-copy"><view><text>{{ messageTitle(message.type) }}</text><text v-if="message.unread" class="unread-dot" /></view><text>{{ messageCopy(message.type) }}</text><text>{{ t(message.type === "app" ? "updates.appSource" : "updates.firmwareSource") }}</text></view>
          <view class="message-end"><text class="status-pill" :class="message.unread ? 'status-pill--red' : ''">{{ t(message.unread ? "updates.unread" : "updates.read") }}</text><UiIcon name="ChevronRight" tone="muted" :size="18" /></view>
        </button>
      </view>
      <view v-else class="empty-state card" data-testid="updates-empty"><UiIcon name="CheckCircle2" tone="success" :size="32" /><text>{{ t("updates.emptyTitle") }}</text><text>{{ t("updates.emptyCopy") }}</text></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.updates-page { background: var(--app-bg); }
.updates-summary { display: flex; min-height: 80px; padding: 14px 20px; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--divider); background: var(--stage-bg); }
.updates-summary > view { display: flex; min-width: 0; flex-direction: column; }
.updates-summary > view text:first-child { font-size: 14px; font-weight: 750; }
.updates-summary > view text:last-child { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.mark-all { min-width: 72px; min-height: 40px; padding: 0 8px; color: var(--ride-green); font-size: 12px; font-weight: 700; }
.message-list { display: grid; gap: 10px; }
.message-card { display: flex; width: 100%; min-height: 100px; padding: 14px 16px; align-items: center; gap: 12px; text-align: left; }
.message-card--unread { border-left: 3px solid var(--bs-vi-ref-color-semantic-danger); }
.message-icon { display: flex; width: 44px; height: 44px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 12px; background: var(--bs-vi-sys-color-status-info-background); }
.message-icon--firmware { background: var(--bs-vi-sys-color-status-warning-background); }
.message-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.message-copy > view { display: flex; align-items: center; gap: 7px; }
.message-copy > view > text:first-child { min-width: 0; font-size: 15px; font-weight: 700; line-height: 1.35; }
.message-copy > text:nth-child(2) { margin-top: 5px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.message-copy > text:last-child { margin-top: 6px; color: var(--ride-green); font-size: 11px; font-weight: 700; }
.unread-dot { width: 6px; height: 6px; flex: 0 0 auto; border-radius: 50%; background: var(--bs-vi-ref-color-semantic-danger); }
.message-end { display: flex; flex: 0 0 auto; align-items: center; gap: 4px; }
.empty-state { display: flex; min-height: 220px; padding: 24px; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.empty-state text:nth-child(2) { margin-top: 12px; font-size: 16px; font-weight: 700; }
.empty-state text:last-child { max-width: 260px; margin-top: 6px; color: var(--muted); font-size: 12px; line-height: 1.5; }
</style>
