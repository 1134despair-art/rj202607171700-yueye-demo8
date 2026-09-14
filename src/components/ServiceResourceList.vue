<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import UiIcon from "@/components/UiIcon.vue";
import { useFeedback } from "@/composables/useFeedback";
import { serviceResources, type ServiceResource, type ServiceResourceGroup } from "@/mock/serviceResources";

const { t } = useI18n();
const feedback = useFeedback();
const downloadingId = ref<ServiceResource["id"] | null>(null);
const downloadedIds = ref<ServiceResource["id"][]>([]);
const groupedResources = computed(() => ({
  technical: serviceResources.filter((resource) => resource.group === "technical"),
  brand: serviceResources.filter((resource) => resource.group === "brand"),
}));

async function downloadResource(resource: ServiceResource) {
  if (downloadingId.value) return;

  const resourceName = t(resource.titleKey);
  const confirmed = await feedback.confirm({
    title: t("resources.confirmTitle", { name: resourceName }),
    content: t("resources.confirmCopy", { format: resource.format, fileName: resource.fileName }),
    icon: "Download",
    tone: "info",
    confirmText: t("resources.startDownload"),
    cancelText: t("common.cancel"),
  });
  if (!confirmed) return;

  downloadingId.value = resource.id;
  await new Promise((resolve) => setTimeout(resolve, 1200));
  if (!downloadedIds.value.includes(resource.id)) downloadedIds.value = [...downloadedIds.value, resource.id];
  downloadingId.value = null;

  await feedback.confirm({
    title: t("resources.downloadComplete"),
    content: t("resources.downloadCompleteCopy", { name: resourceName, fileName: resource.fileName }),
    icon: "CheckCircle2",
    tone: "success",
    showCancel: false,
    confirmText: t("common.done"),
  });
}
</script>

<template>
  <template v-for="group in (['technical', 'brand'] as ServiceResourceGroup[])" :key="group">
    <text class="resource-group-title">{{ t("resources.groups." + group) }}</text>
    <view class="resource-list">
      <view v-for="resource in groupedResources[group]" :key="resource.id" class="resource-row" :data-testid="'resource-' + resource.id">
        <view class="resource-icon"><UiIcon :name="resource.icon" :tone="resource.tone" :size="21" /></view>
        <view class="resource-copy">
          <text class="resource-title">{{ t(resource.titleKey) }}</text>
          <text class="resource-detail">{{ t(resource.detailKey) }}</text>
          <view class="resource-meta"><text>{{ resource.format }}</text><text>{{ resource.fileName }}</text></view>
        </view>
        <button class="resource-download" :disabled="Boolean(downloadingId)" :aria-label="t('resources.downloadLabel', { name: t(resource.titleKey) })" :data-testid="'download-' + resource.id" @click="downloadResource(resource)">
          <UiIcon v-if="downloadingId === resource.id" name="LoaderCircle" tone="info" :size="19" spinning />
          <UiIcon v-else-if="downloadedIds.includes(resource.id)" name="CheckCircle2" tone="success" :size="19" />
          <UiIcon v-else name="Download" tone="navy" :size="19" />
        </button>
      </view>
    </view>
  </template>
</template>

<style scoped lang="scss">
.resource-group-title { display: block; margin: 20px 2px 9px; color: var(--muted); font-size: 12px; font-weight: 700; }
.resource-group-title:first-child { margin-top: 0; }
.resource-list { overflow: hidden; border: 1px solid var(--divider); border-radius: 16px; background: var(--surface); box-shadow: var(--v3-shadow-card); }
.resource-row { display: flex; min-height: 98px; padding: 13px 12px; align-items: center; gap: 11px; border-bottom: 1px solid var(--divider); }
.resource-row:last-child { border-bottom: 0; }
.resource-icon { display: flex; width: 40px; height: 40px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 12px; background: var(--surface-muted); }
.resource-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.resource-title { color: var(--ink); font-size: 15px; font-weight: 700; line-height: 1.3; }
.resource-detail { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.4; }
.resource-meta { display: flex; min-width: 0; margin-top: 7px; align-items: center; gap: 7px; color: var(--subtle); font-size: 11px; }
.resource-meta text:first-child { flex: 0 0 auto; padding: 2px 6px; border-radius: 6px; background: var(--surface-muted); color: var(--muted); font-weight: 800; }
.resource-meta text:last-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.resource-download { display: flex; width: 44px; height: 44px; min-height: 44px; flex: 0 0 44px; padding: 0; align-items: center; justify-content: center; border: 1px solid var(--divider); border-radius: 12px; background: var(--surface); }
.resource-download[disabled] { opacity: .55; }
</style>
