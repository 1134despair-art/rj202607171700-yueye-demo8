import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { APP_TARGET_VERSION } from "@/mock/seed";
import { useAppStore } from "@/stores/app";
import { useOtaStore } from "@/stores/ota";
import type { UpdateMessage, UpdateMessageType } from "@/types";
import { readStorage, storageKeys, writeStorage } from "@/utils/storage";

function restoredReadKeys() {
  const stored = readStorage<unknown>(storageKeys.updateMessages, []);
  if (!Array.isArray(stored)) return [];
  return [...new Set(stored.filter((value): value is string => typeof value === "string"))];
}

export const useUpdateMessageStore = defineStore("updateMessages", () => {
  const app = useAppStore();
  const ota = useOtaStore();
  const readKeys = ref<string[]>(restoredReadKeys());

  const appVersionKey = computed(() => `app:${APP_TARGET_VERSION}`);
  const firmwareVersionKeys = computed(() => ota.modules
    .filter((module) => module.hasUpdate)
    .map((module) => `firmware:${module.id}:${module.targetVersion}`));
  const messages = computed<UpdateMessage[]>(() => {
    const read = new Set(readKeys.value);
    const items: UpdateMessage[] = [];
    if (app.preferences.appUpdateScenario === "available") {
      const versionKeys = [appVersionKey.value];
      items.push({ type: "app", versionKeys, unread: versionKeys.some((key) => !read.has(key)) });
    }
    if (firmwareVersionKeys.value.length) {
      const versionKeys = firmwareVersionKeys.value;
      items.push({ type: "firmware", versionKeys, unread: versionKeys.some((key) => !read.has(key)) });
    }
    return items;
  });
  const unreadCount = computed(() => messages.value.filter((message) => message.unread).length);
  const hasUnread = computed(() => unreadCount.value > 0);

  function versionKeysFor(type: UpdateMessageType) {
    return messages.value.find((message) => message.type === type)?.versionKeys || [];
  }

  function persist() {
    writeStorage(storageKeys.updateMessages, readKeys.value);
  }

  function addReadKeys(keys: string[]) {
    if (!keys.length) return;
    readKeys.value = [...new Set([...readKeys.value, ...keys])];
    persist();
  }

  function markRead(type: UpdateMessageType) {
    addReadKeys(versionKeysFor(type));
  }

  function markAllRead() {
    addReadKeys(messages.value.flatMap((message) => message.versionKeys));
  }

  function reset() {
    readKeys.value = [];
    persist();
  }

  return { readKeys, messages, unreadCount, hasUnread, markRead, markAllRead, reset };
});
