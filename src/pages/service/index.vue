<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import AppTabBar from "@/components/AppTabBar.vue";
import ServiceResourceList from "@/components/ServiceResourceList.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useFeedback } from "@/composables/useFeedback";
import { serviceResources } from "@/mock/serviceResources";

const SERVICE_PHONE = "+86 400 000 2026";
const SERVICE_PHONE_NUMBER = "4000002026";
const SERVICE_EMAIL = "service@binsen.com";
const { t } = useI18n();
const feedback = useFeedback();
const resourceCount = serviceResources.length;

async function callService() {
  const confirmed = await feedback.confirm({
    title: t("service.callConfirmTitle"),
    content: t("service.callConfirmCopy", { phone: SERVICE_PHONE }),
    icon: "Phone",
    tone: "info",
    confirmText: t("service.callNow"),
    cancelText: t("common.cancel"),
  });
  if (!confirmed) return;

  if (typeof uni.makePhoneCall !== "function") {
    feedback.toast({ message: t("service.phoneUnavailable", { phone: SERVICE_PHONE }), tone: "info" });
    return;
  }
  uni.makePhoneCall({
    phoneNumber: SERVICE_PHONE_NUMBER,
    fail: () => feedback.toast({ message: t("service.phoneUnavailable", { phone: SERVICE_PHONE }), tone: "info" }),
  });
}

function copyEmail() {
  uni.setClipboardData({
    data: SERVICE_EMAIL,
    success: () => feedback.toast({ message: t("service.emailCopied"), tone: "success" }),
    fail: () => feedback.toast({ message: SERVICE_EMAIL, tone: "info" }),
  });
}
</script>

<template>
  <view class="page-shell tab-page service-page">
    <AppHeader :title="t('service.title')" />
    <view class="service-hero">
      <view class="service-hero__icon"><UiIcon name="Phone" tone="info" :size="28" /></view>
      <view><text>{{ t("service.supportTitle") }}</text><text>{{ t("service.supportCopy") }}</text></view>
    </view>

    <view class="content--tight service-content">
      <view class="resource-heading">
        <view><text>{{ t("resources.heading") }}</text><text>{{ t("resources.copy") }}</text></view>
        <text>{{ resourceCount }} {{ t("resources.itemUnit") }}</text>
      </view>
      <ServiceResourceList />

      <text class="section-title contact-title">{{ t("service.contactTitle") }}</text>
      <view class="contact-list">
        <button class="contact-row" data-testid="service-phone" @click="callService">
          <view class="contact-icon contact-icon--phone"><UiIcon name="Phone" tone="success" :size="20" /></view>
          <view><text>{{ t("service.contactHotline") }}</text><text>{{ SERVICE_PHONE }}</text></view>
          <UiIcon name="ChevronRight" tone="muted" :size="18" />
        </button>
        <button class="contact-row" data-testid="service-email" @click="copyEmail">
          <view class="contact-icon"><UiIcon name="Mail" tone="info" :size="20" /></view>
          <view><text>{{ t("service.contactEmail") }}</text><text>{{ SERVICE_EMAIL }}</text></view>
          <UiIcon name="ChevronRight" tone="muted" :size="18" />
        </button>
        <view class="contact-row contact-row--static">
          <view class="contact-icon contact-icon--hours"><UiIcon name="CalendarDays" tone="warning" :size="20" /></view>
          <view><text>{{ t("service.contactHours") }}</text><text>{{ t("service.workHours") }}</text></view>
        </view>
      </view>
    </view>
    <AppTabBar active="service" />
  </view>
</template>

<style scoped lang="scss">
.service-page { background: var(--app-bg); }
.service-hero { position: relative; display: flex; width: calc(100% - 40px); min-height: 108px; overflow: hidden; margin: 16px 20px 0; padding: 16px; align-items: center; gap: 14px; border: 1px solid rgba(223,228,219,.82); border-radius: 16px; background: linear-gradient(135deg, var(--v3-hero-start), var(--v3-surface)); box-shadow: var(--v3-shadow-card); }
.service-hero::after { position: absolute; right: -22px; bottom: -32px; width: 112px; height: 112px; border: 1px solid rgba(74,125,255,.12); border-radius: 50%; content: ""; }
.service-hero__icon { display: flex; width: 48px; height: 48px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 50%; background: var(--bs-vi-sys-color-status-info-background); }
.service-hero > view:last-child { display: flex; min-width: 0; flex-direction: column; }
.service-hero > view:last-child text:first-child { font-size: 18px; font-weight: 700; line-height: 1.25; }
.service-hero > view:last-child text:last-child { margin-top: 6px; color: var(--muted); font-size: 12px; line-height: 1.45; }
.service-content { padding-top: 20px; }
.resource-heading { display: flex; min-height: 52px; margin-bottom: 12px; align-items: flex-start; gap: 12px; }
.resource-heading > view { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.resource-heading > view text:first-child { font-size: 17px; font-weight: 700; line-height: 1.25; }
.resource-heading > view text:last-child { margin-top: 5px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.resource-heading > text { flex: 0 0 auto; color: var(--muted); font-size: 12px; font-weight: 700; }
.contact-title { margin-top: 24px; }
.contact-list { overflow: hidden; margin-bottom: 8px; border: 1px solid var(--divider); border-radius: 16px; background: var(--surface); box-shadow: var(--v3-shadow-card); }
.contact-row { display: flex; width: 100%; min-height: 68px; padding: 10px 12px; align-items: center; gap: 11px; border-bottom: 1px solid var(--divider); background: transparent; text-align: left; }
.contact-row:last-child { border-bottom: 0; }
.contact-row > view:nth-child(2) { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.contact-row > view:nth-child(2) text:first-child { color: var(--ink); font-size: 14px; font-weight: 700; }
.contact-row > view:nth-child(2) text:last-child { margin-top: 4px; color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
.contact-icon { display: flex; width: 40px; height: 40px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 50%; background: var(--bs-vi-sys-color-status-info-background); }
.contact-icon--phone { background: var(--bs-vi-sys-color-status-success-background); }
.contact-icon--hours { background: var(--bs-vi-sys-color-status-warning-background); }
.contact-row--static { width: auto; }
</style>
