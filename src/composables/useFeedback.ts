import { reactive } from "vue";
import type { UiIconName, UiIconTone } from "@/assets/ui/icon-registry";

export type FeedbackTone = "info" | "success" | "warning" | "danger";

export interface ToastOptions {
  message: string;
  tone?: FeedbackTone;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  content: string;
  icon?: UiIconName;
  tone?: FeedbackTone;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export interface ChoiceItem {
  label: string;
  detail?: string;
  icon?: UiIconName;
  tone?: UiIconTone;
}

export interface ChoiceOptions {
  title: string;
  content?: string;
  icon?: UiIconName;
  tone?: FeedbackTone;
  items: ChoiceItem[];
  cancelText?: string;
}

const state = reactive<{
  toast: (ToastOptions & { id: number }) | null;
  modal: ConfirmOptions | null;
  sheet: ChoiceOptions | null;
}>({ toast: null, modal: null, sheet: null });

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let modalResolve: ((value: boolean) => void) | undefined;
let sheetResolve: ((value: number | null) => void) | undefined;

function clearToast() {
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = undefined;
  state.toast = null;
}

function toast(options: ToastOptions | string) {
  if (toastTimer) clearTimeout(toastTimer);
  const normalized = typeof options === "string" ? { message: options } : options;
  state.toast = { id: Date.now(), tone: "info", duration: 2200, ...normalized };
  toastTimer = setTimeout(() => { state.toast = null; toastTimer = undefined; }, state.toast.duration);
}

function confirm(options: ConfirmOptions) {
  clearToast();
  if (modalResolve) modalResolve(false);
  state.modal = { tone: "info", showCancel: true, ...options };
  return new Promise<boolean>((resolve) => { modalResolve = resolve; });
}

function choose(options: ChoiceOptions) {
  clearToast();
  if (sheetResolve) sheetResolve(null);
  state.sheet = { tone: "info", ...options };
  return new Promise<number | null>((resolve) => { sheetResolve = resolve; });
}

function settleModal(value: boolean) {
  state.modal = null;
  const resolve = modalResolve;
  modalResolve = undefined;
  resolve?.(value);
}

function settleSheet(value: number | null) {
  state.sheet = null;
  const resolve = sheetResolve;
  sheetResolve = undefined;
  resolve?.(value);
}

export function useFeedback() {
  return { state, toast, confirm, choose, settleModal, settleSheet };
}
