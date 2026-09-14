<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";
import UiIcon from "@/components/UiIcon.vue";
import { useFeedback } from "@/composables/useFeedback";
import appMarkImage from "@/assets/ui/branding/binsen-app-mark@3x.png";
import ListRow from "@/components/ListRow.vue";
import { useAppStore } from "@/stores/app";

const app = useAppStore();
const { t } = useI18n();
const feedback = useFeedback();

function tapVersion() {
  const remaining = app.tapVersion();
  if (remaining === 0) feedback.toast({ message: t("about.unlockedToast"), tone: "success" });
  else if (remaining <= 4) feedback.toast({ message: t("about.tapsRemaining", { count: remaining }), tone: "info" });
}

function simulateContact(kind: "website" | "email" | "phone") {
  feedback.toast({ message: t(`about.feedback.${kind}`), tone: "info" });
}
</script>

<template>
  <view class="page-shell safe-bottom about-page"><AppHeader :title="t('about.title')" back /><view class="content about-content"><view class="about-hero"><image class="about-mark" :src="appMarkImage" mode="aspectFit" /><text class="about-brand brand-font">BINSEN</text><text>{{ t("about.tagline") }}</text></view><view class="company"><text>{{ t("about.company") }}</text><text>{{ t("about.description") }}</text></view><text class="section-title">{{ t("about.contact") }}</text><view class="contact-list"><ListRow label="www.binsen.com" :detail="t('about.demoWebsite')" @click="simulateContact('website')"><template #icon><UiIcon name="Globe2" tone="info" :size="19" /></template></ListRow><ListRow label="service@binsen.com" :detail="t('about.demoEmail')" @click="simulateContact('email')"><template #icon><UiIcon name="Mail" tone="info" :size="19" /></template></ListRow><ListRow label="+86 400 000 2026" :detail="t('about.demoPhone')" @click="simulateContact('phone')"><template #icon><UiIcon name="Phone" tone="info" :size="19" /></template></ListRow></view><button class="version-card" @click="tapVersion"><view><UiIcon name="ShieldCheck" tone="success" :size="20" /><text>{{ t("about.version") }}</text></view><text class="brand-font">1.0.0</text></button><text class="version-hint">{{ app.preferences.debugUnlocked ? t("about.unlocked") : t("about.copyright") }}</text><button v-if="app.preferences.debugUnlocked" class="secondary-button debug-button" @click="uni.navigateTo({ url: '/pages/me/debug' })">{{ t("about.openDeveloper") }}</button></view></view>
</template>

<style scoped lang="scss">
.about-content { padding-top: 0 !important; }
.about-hero { display: flex; width: 100% !important; min-height: 190px; margin: 0 !important; flex-direction: column; align-items: center; justify-content: center; border: 0 !important; border-bottom: 1px solid var(--divider) !important; background: transparent !important; color: var(--ink); }
.about-mark { display: block; width: 56px; height: 56px; border-radius: 12px; }
.about-brand { margin-top: 11px; font-size: 26px; }
.about-hero > text:last-child { margin-top: 3px; color: var(--muted); font-size: 12px; font-weight: 700; }
.company { display: flex; min-height: 88px; flex-direction: column; justify-content: center; border-bottom: 1px solid var(--divider); }
.company text { display: block; }
.company text:first-child { font-weight: 700; line-height: 1.4; }
.company text:last-child { margin-top: 6px; color: var(--muted); font-size: 11px; line-height: 1.5; }
.contact-list { border-top: 1px solid var(--divider) !important; border-bottom: 1px solid var(--divider) !important; background: transparent !important; }
.contact-list :deep(.list-row) { min-height: 68px; padding-right: 0; padding-left: 0; border-bottom: 1px solid var(--divider); background: transparent; }
.contact-list :deep(.list-row:last-child) { border-bottom: 0; }
.contact-list :deep(.list-row > .ui-icon) { margin: 0 8px; color: #5bc5c1; }
.version-card { display: flex; width: 100%; min-height: 66px; margin-top: 18px; padding: 10px 14px; align-items: center; justify-content: space-between; border: 1px solid var(--divider); background: #101310; color: #f1f4ef !important; text-align: left; }
.version-card > view { display: flex; align-items: center; gap: 10px; }
.version-card > view text { color: #f1f4ef; font-size: 12px; font-weight: 700; }
.version-card > text { color: #f1f4ef; font-size: 20px; }
.version-hint { display: block; margin-top: 10px; color: var(--muted); font-size: 12px; text-align: center; }
.debug-button { margin-top: 15px; }
</style>
