<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/AppHeader.vue";

const type = ref<"terms" | "privacy">("privacy");
const { t } = useI18n();
onLoad((options) => { type.value = options?.type === "terms" ? "terms" : "privacy"; });
</script>

<template>
  <view class="page-shell safe-bottom"><AppHeader :title="type === 'terms' ? t('legal.terms') : t('legal.privacy')" back /><view class="legal-meta"><text>{{ t("legal.version") }}</text><text>{{ t("legal.effective") }}</text></view><view class="content legal-content"><template v-if="type === 'terms'"><text class="legal-title">{{ t("legal.termsTitle") }}</text><text class="legal-copy">{{ t("legal.termsIntro") }}</text><text class="legal-heading">{{ t("legal.scope") }}</text><text class="legal-copy">{{ t("legal.scopeCopy") }}</text><text class="legal-heading">{{ t("legal.safeUse") }}</text><text class="legal-copy">{{ t("legal.safeUseCopy") }}</text><text class="legal-heading">{{ t("legal.storage") }}</text><text class="legal-copy">{{ t("legal.storageCopy") }}</text></template><template v-else><text class="legal-title">{{ t("legal.privacyTitle") }}</text><text class="legal-copy">{{ t("legal.privacyIntro") }}</text><text class="legal-heading">{{ t("legal.stored") }}</text><text class="legal-copy">{{ t("legal.storedCopy") }}</text><text class="legal-heading">{{ t("legal.notCollected") }}</text><text class="legal-copy">{{ t("legal.notCollectedCopy") }}</text><text class="legal-heading">{{ t("legal.removing") }}</text><text class="legal-copy">{{ t("legal.removingCopy") }}</text></template><text class="legal-heading">{{ t("legal.contact") }}</text><text class="legal-copy">{{ t("legal.support") }}</text></view></view>
</template>

<style scoped lang="scss">
.legal-meta { display: flex; min-height: 48px; padding: 0 20px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--divider); background: var(--stage-bg); color: var(--muted); font-size: 12px; }
.legal-content { margin: 20px; padding: 20px; border: 1px solid var(--divider); border-radius: 16px; background: var(--surface); box-shadow: var(--v3-shadow-card); }
.legal-title { display: block; margin: 2px 0 18px; font-size: 23px; font-weight: 700; line-height: 1.2; }
.legal-heading { display: block; margin: 23px 0 7px; font-size: 13px; font-weight: 700; }
.legal-copy { display: block; color: var(--muted); font-size: 12px; line-height: 1.75; overflow-wrap: anywhere; }
</style>
