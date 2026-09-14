<script setup lang="ts">
import { computed } from "vue";
import UiIcon from "@/components/UiIcon.vue";
import AppModalShell from "@/components/AppModalShell.vue";
import AppBottomSheet from "@/components/AppBottomSheet.vue";
import { useFeedback, type FeedbackTone } from "@/composables/useFeedback";

const feedback = useFeedback();
const toneIcons = { info: "Info", success: "CheckCircle2", warning: "TriangleAlert", danger: "CircleX" } as const;
const iconTone = computed(() => (feedback.state.modal?.tone || feedback.state.sheet?.tone || "info") as FeedbackTone);
</script>

<template>
  <AppModalShell v-if="feedback.state.modal" :open="true" :title="feedback.state.modal.title" :content="feedback.state.modal.content" :tone="feedback.state.modal.tone" :icon="feedback.state.modal.icon || toneIcons[iconTone]" :dismissible="feedback.state.modal.showCancel !== false" data-testid="app-modal" @dismiss="feedback.settleModal(false)">
      <template #actions><view class="feedback-actions" :class="{ single: feedback.state.modal.showCancel === false }">
        <button v-if="feedback.state.modal.showCancel !== false" class="secondary-button" @click="feedback.settleModal(false)">{{ feedback.state.modal.cancelText || '取消' }}</button>
        <button class="primary-button" :class="{ 'primary-button--red': feedback.state.modal.tone === 'danger' }" data-testid="modal-confirm" @click="feedback.settleModal(true)">{{ feedback.state.modal.confirmText || '确定' }}</button>
      </view></template>
  </AppModalShell>

  <AppBottomSheet v-if="feedback.state.sheet" :open="true" data-testid="app-action-sheet" @dismiss="feedback.settleSheet(null)">
      <view class="feedback-icon" :class="`feedback-icon--${feedback.state.sheet.tone}`"><UiIcon :name="feedback.state.sheet.icon || toneIcons[iconTone]" :tone="iconTone" :size="25" /></view>
      <text class="feedback-title">{{ feedback.state.sheet.title }}</text>
      <text v-if="feedback.state.sheet.content" class="feedback-copy">{{ feedback.state.sheet.content }}</text>
      <view class="choice-list">
        <button v-for="(item, index) in feedback.state.sheet.items" :key="`${item.label}-${index}`" class="choice-row" @click="feedback.settleSheet(index)">
          <UiIcon v-if="item.icon" class="choice-row__icon" :name="item.icon" :tone="item.tone || 'navy'" :size="20" />
          <view class="choice-row__copy"><text>{{ item.label }}</text><text v-if="item.detail">{{ item.detail }}</text></view>
          <UiIcon class="choice-row__arrow" name="ChevronRight" tone="muted" :size="18" />
        </button>
      </view>
      <button class="secondary-button sheet-cancel" @click="feedback.settleSheet(null)">{{ feedback.state.sheet.cancelText || '取消' }}</button>
  </AppBottomSheet>

  <transition name="toast-fade">
    <view v-if="feedback.state.toast" class="app-toast" :class="`app-toast--${feedback.state.toast.tone}`" data-testid="app-toast">
      <UiIcon :name="toneIcons[feedback.state.toast.tone || 'info']" :tone="feedback.state.toast.tone || 'info'" :size="20" />
      <text>{{ feedback.state.toast.message }}</text>
    </view>
  </transition>
</template>

<style scoped lang="scss">
.feedback-icon { display: flex; width: 48px; height: 48px; margin: 0 auto 14px; align-items: center; justify-content: center; border-radius: 12px; background: var(--bs-vi-sys-color-status-info-background); }
.feedback-icon--success { background: var(--bs-vi-sys-color-status-success-background); }
.feedback-icon--warning { background: var(--bs-vi-sys-color-status-warning-background); }
.feedback-icon--danger { background: var(--bs-vi-sys-color-status-danger-background); }
.feedback-title { display: block; color: var(--ink); font-size: 18px; font-weight: 600; line-height: 1.25; }
.feedback-copy { display: block; margin: 9px auto 0; color: var(--muted); font-size: 13px; line-height: 1.55; }
.feedback-actions { display: grid; width: 100%; grid-template-columns: 1fr 1fr; gap: 12px; }
.feedback-actions.single { grid-template-columns: 1fr; }
.choice-list { margin-top: 18px; overflow: hidden; border: 1px solid var(--divider); border-radius: 16px; box-shadow: var(--v3-shadow-card); }
.choice-row { display: flex; width: 100%; min-height: 60px; padding: 10px 14px; align-items: center; justify-content: flex-start; gap: 12px; border-bottom: 1px solid var(--divider); background: var(--surface); color: var(--ink); text-align: left; }
.choice-row:last-child { border-bottom: 0; }
.choice-row__icon { flex: 0 0 20px; }
.choice-row__copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.choice-row__arrow { flex: 0 0 18px; margin-left: auto; }
.choice-row__copy text:first-child { font-size: 15px; font-weight: 600; }
.choice-row__copy text:last-child { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.35; }
.sheet-cancel { margin-top: 12px; }
.app-toast { position: fixed; z-index: 100; right: 20px; bottom: calc(92px + env(safe-area-inset-bottom)); left: 20px; display: flex; min-height: 48px; padding: 10px 14px; align-items: center; justify-content: center; gap: 9px; border: 1px solid var(--divider); border-radius: 12px; background: var(--surface); color: var(--ink); box-shadow: var(--v3-shadow-raised); font-size: 13px; font-weight: 600; line-height: 1.4; pointer-events: none; text-align: center; }
.app-toast--success { border-color: var(--bs-vi-sys-color-text-success); }.app-toast--warning { border-color: var(--bs-vi-sys-color-text-warning); }.app-toast--danger { border-color: var(--bs-vi-sys-color-text-danger); }
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity var(--bs-vi-sys-motion-state), transform var(--bs-vi-sys-motion-state); }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
