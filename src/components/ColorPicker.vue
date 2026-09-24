<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch } from 'vue';

interface Hsv { h: number; s: number; v: number }
const props = withDefaults(defineProps<{ modelValue: string; disabled?: boolean }>(), { disabled: false });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const pickerId = `color-picker-${getCurrentInstance()?.uid || Date.now()}`;

const presets = [
  '#F04438', '#E91E63', '#A72AB8', '#6F42C1', '#4258B8',
  '#2B91D9', '#10A6DB', '#13B8C4', '#11998E', '#49A857',
  '#8BC53F', '#C9DA2E', '#FFE23E', '#FFB719', '#FF9400',
  '#FF5428', '#7C5C4E', '#9EA3AA', '#FFFFFF', '#111318',
  '#3569C8', '#B66B23', '#C84D43', '#8B64C8',
];
const fieldDragging = ref(false);
const hueDragging = ref(false);
const hexDraft = ref(normalizeHex(props.modelValue) || '#49A857');

function clamp(value: number, min = 0, max = 1) { return Math.max(min, Math.min(max, value)); }
function normalizeHex(value: string) {
  const candidate = String(value || '').trim();
  const expanded = /^#[0-9a-f]{3}$/i.test(candidate) ? `#${candidate.slice(1).split('').map(item => item + item).join('')}` : candidate;
  return /^#[0-9a-f]{6}$/i.test(expanded) ? expanded.toUpperCase() : '';
}
function hexToHsv(value: string): Hsv {
  const hex = normalizeHex(value) || '#49A857';
  const red = parseInt(hex.slice(1, 3), 16) / 255;
  const green = parseInt(hex.slice(3, 5), 16) / 255;
  const blue = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  return { h: hue < 0 ? hue + 360 : hue, s: max ? delta / max : 0, v: max };
}
function hsvToHex({ h, s, v }: Hsv) {
  const chroma = v * s;
  const part = (h / 60) % 6;
  const x = chroma * (1 - Math.abs(part % 2 - 1));
  const [red, green, blue] = part < 1 ? [chroma, x, 0] : part < 2 ? [x, chroma, 0] : part < 3 ? [0, chroma, x] : part < 4 ? [0, x, chroma] : part < 5 ? [x, 0, chroma] : [chroma, 0, x];
  const match = v - chroma;
  return `#${[red, green, blue].map(channel => Math.round((channel + match) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

const hsv = computed(() => hexToHsv(props.modelValue));
const hueColor = computed(() => `hsl(${hsv.value.h} 100% 50%)`);
const currentColor = computed(() => normalizeHex(props.modelValue) || '#49A857');

watch(() => props.modelValue, value => { hexDraft.value = normalizeHex(value) || hexDraft.value; });

function choose(next: Hsv) {
  if (props.disabled) return;
  emit('update:modelValue', hsvToHex({ h: ((next.h % 360) + 360) % 360, s: clamp(next.s), v: clamp(next.v) }));
}
function pointerRatio(event: MouseEvent | TouchEvent, axis: 'x' | 'y', elementId: string) {
  const target = document.getElementById(elementId);
  if (!target) return 0;
  const bounds = target.getBoundingClientRect();
  const source = event as any;
  const point = source.touches?.[0] || source.changedTouches?.[0] || source.detail || source;
  const clientX = Number(point.clientX ?? point.x ?? point.pageX);
  const clientY = Number(point.clientY ?? point.y ?? point.pageY);
  return axis === 'x' ? clamp((clientX - bounds.left) / bounds.width) : clamp((clientY - bounds.top) / bounds.height);
}
function pickField(event: MouseEvent | TouchEvent) {
  const fieldId = `${pickerId}-field`;
  choose({ ...hsv.value, s: pointerRatio(event, 'x', fieldId), v: 1 - pointerRatio(event, 'y', fieldId) });
}
function startField(event: MouseEvent | TouchEvent) {
  if (props.disabled) return;
  fieldDragging.value = true;
  pickField(event);
}
function moveField(event: MouseEvent | TouchEvent) {
  if (!fieldDragging.value || props.disabled) return;
  const fieldId = `${pickerId}-field`;
  choose({ ...hsv.value, s: pointerRatio(event, 'x', fieldId), v: 1 - pointerRatio(event, 'y', fieldId) });
}
function pickHue(event: MouseEvent | TouchEvent) {
  choose({ ...hsv.value, h: pointerRatio(event, 'x', `${pickerId}-hue`) * 359.999 });
}
function startHue(event: MouseEvent | TouchEvent) {
  if (props.disabled) return;
  hueDragging.value = true;
  pickHue(event);
}
function moveHue(event: MouseEvent | TouchEvent) {
  if (!hueDragging.value || props.disabled) return;
  choose({ ...hsv.value, h: pointerRatio(event, 'x', `${pickerId}-hue`) * 359.999 });
}
function adjustField(event: KeyboardEvent) {
  if (props.disabled) return;
  const step = event.shiftKey ? .1 : .02;
  if (event.key === 'ArrowLeft') choose({ ...hsv.value, s: hsv.value.s - step });
  else if (event.key === 'ArrowRight') choose({ ...hsv.value, s: hsv.value.s + step });
  else if (event.key === 'ArrowUp') choose({ ...hsv.value, v: hsv.value.v + step });
  else if (event.key === 'ArrowDown') choose({ ...hsv.value, v: hsv.value.v - step });
  else return;
  event.preventDefault();
}
function adjustHue(event: KeyboardEvent) {
  if (props.disabled || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  choose({ ...hsv.value, h: hsv.value.h + (event.key === 'ArrowRight' ? 3 : -3) });
  event.preventDefault();
}
function inputValue(event: Event) { hexDraft.value = String((event as any).detail?.value ?? (event.target as HTMLInputElement)?.value ?? ''); }
function commitHex() {
  const normalized = normalizeHex(hexDraft.value);
  if (normalized) emit('update:modelValue', normalized);
  else hexDraft.value = currentColor.value;
}
</script>

<template>
  <view class="color-picker" :class="{ 'color-picker--disabled': disabled }">
    <button
      :id="`${pickerId}-field`"
      class="color-field"
      data-testid="color-field"
      role="slider"
      tabindex="0"
      :disabled="disabled"
      :aria-disabled="disabled"
      aria-label="颜色饱和度与明度"
      :aria-valuetext="`饱和度 ${Math.round(hsv.s * 100)}%，明度 ${Math.round(hsv.v * 100)}%`"
      :style="{ '--hue-color': hueColor }"
      @click="pickField"
      @mousedown.prevent="startField"
      @mousemove.prevent="moveField"
      @mouseup="fieldDragging = false"
      @mouseleave="fieldDragging = false"
      @touchstart.prevent="startField"
      @touchmove.prevent="moveField"
      @touchend="fieldDragging = false"
      @touchcancel="fieldDragging = false"
      @keydown="adjustField"
    >
      <view class="color-field__pointer" :style="{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: currentColor }" />
    </button>

    <view class="color-hue-row">
      <view class="current-color" :style="{ background: currentColor }" aria-label="当前颜色" />
      <button
        :id="`${pickerId}-hue`"
        class="color-hue"
        data-testid="hue-slider"
        role="slider"
        tabindex="0"
        :disabled="disabled"
        :aria-disabled="disabled"
        aria-label="色相"
        aria-valuemin="0"
        aria-valuemax="360"
        :aria-valuenow="Math.round(hsv.h)"
        @click="pickHue"
        @mousedown.prevent="startHue"
        @mousemove.prevent="moveHue"
        @mouseup="hueDragging = false"
        @mouseleave="hueDragging = false"
        @touchstart.prevent="startHue"
        @touchmove.prevent="moveHue"
        @touchend="hueDragging = false"
        @touchcancel="hueDragging = false"
        @keydown="adjustHue"
      ><view class="color-hue__pointer" :style="{ left: `${hsv.h / 360 * 100}%`, background: hueColor }" /></button>
    </view>

    <view class="color-presets" role="group" aria-label="常用颜色">
      <button v-for="color in presets" :key="color" class="color-preset" :class="{ active: currentColor === color }" :aria-label="`颜色 ${color}`" :aria-pressed="currentColor === color" :disabled="disabled" @click="emit('update:modelValue', color)"><view :style="{ background: color }" /></button>
    </view>

    <view class="color-value">
      <view class="color-value__preview" :style="{ background: currentColor }" />
      <view class="color-value__copy"><text>当前颜色</text><text>可输入六位 HEX 色值</text></view>
      <input data-testid="color-hex" class="color-value__input" aria-label="自定义颜色值" :value="hexDraft" :disabled="disabled" maxlength="7" @input="inputValue" @blur="commitHex" @confirm="commitHex" />
    </view>
  </view>
</template>

<style scoped>
.color-picker { display: flex; min-width: 0; flex-direction: column; gap: 12px; }
.color-picker--disabled { opacity: .45; }
.color-field { position: relative; display: block; width: 100%; aspect-ratio: 1.7; min-height: 156px; max-height: 210px; padding: 0; overflow: hidden; border: 1px solid var(--divider); border-radius: 12px; outline: none; cursor: crosshair; touch-action: none; background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, var(--hue-color)); }
.color-field::after, .color-hue::after { display: none; }
.color-field:focus-visible, .color-hue:focus-visible { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--bs-vi-sys-color-action-info); }
.color-field__pointer { position: absolute; width: 22px; height: 22px; border: 2px solid white; border-radius: 50%; box-shadow: 0 1px 5px rgba(0,0,0,.48); transform: translate(-50%, -50%); pointer-events: none; }
.color-hue-row { display: grid; min-height: 44px; align-items: center; grid-template-columns: 44px minmax(0, 1fr); gap: 12px; }
.current-color { width: 38px; height: 38px; border: 2px solid var(--surface); border-radius: 50%; box-shadow: 0 0 0 1px var(--divider), 0 2px 8px rgba(42,57,78,.18); }
.color-hue { position: relative; display: block; width: 100%; height: 44px; padding: 0; border: 0; border-radius: 22px; outline: none; cursor: pointer; touch-action: none; background: transparent; }
.color-hue::before { position: absolute; inset: 15px 0; border-radius: 7px; content: ''; background: linear-gradient(90deg, #f00 0%, #ff0 16.66%, #0f0 33.33%, #0ff 50%, #00f 66.66%, #f0f 83.33%, #f00 100%); box-shadow: inset 0 0 0 1px rgba(18,21,33,.08); }
.color-hue__pointer { position: absolute; z-index: 1; top: 50%; width: 26px; height: 26px; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 7px rgba(18,21,33,.28); transform: translate(-50%, -50%); pointer-events: none; }
.color-presets { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.color-preset { display: grid; min-width: 0; height: 44px; padding: 5px; place-items: center; border: 1px solid transparent; border-radius: 10px; background: transparent; }
.color-preset > view { width: 100%; height: 100%; border: 1px solid rgba(18,21,33,.1); border-radius: 8px; }
.color-preset.active { border-color: var(--bs-vi-sys-color-action-info); background: var(--bs-vi-sys-color-status-info-background); }
.color-value { display: flex; min-height: 54px; padding: 8px 10px; align-items: center; gap: 10px; border: 1px solid var(--divider); border-radius: 12px; background: var(--surface-muted); }
.color-value__preview { width: 28px; height: 28px; flex: 0 0 auto; border: 1px solid var(--divider); border-radius: 8px; }
.color-value__copy { display: flex; min-width: 0; flex: 1; flex-direction: column; color: var(--ink); font-size: 12px; font-weight: 600; line-height: 1.4; }
.color-value__copy text:last-child { color: var(--muted); font-size: 10px; font-weight: 400; }
.color-value__input { box-sizing: border-box; width: 86px; height: 38px; padding: 0 8px; border: 1px solid var(--divider); border-radius: 8px; outline: none; background: var(--surface); color: var(--ink); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; text-transform: uppercase; }
@media (max-width: 340px) {
  .color-field { min-height: 146px; }
  .color-presets { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .color-value__copy text:last-child { display: none; }
}
</style>
