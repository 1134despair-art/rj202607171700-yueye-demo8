<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseToggle from '@/components/BaseToggle.vue';
import ColorPicker from '@/components/ColorPicker.vue';
import UiIcon from '@/components/UiIcon.vue';
import { clone, lightEffects, type LightConfig, type LightZone } from '@/features/experience/model';
const props = withDefaults(defineProps<{ modelValue: LightConfig; disabled?: boolean }>(), { disabled: false });
const emit = defineEmits<{ 'update:modelValue': [value: LightConfig] }>();
const selected = ref(0);
const zone = computed(() => props.modelValue.zones[selected.value]);
function update(values: Partial<LightZone>) {
  if (props.disabled) return;
  const next = clone(props.modelValue);
  Object.assign(next.zones[selected.value], values);
  emit('update:modelValue', next);
}
function number(event: { detail: { value: number } }) { return Number(event.detail.value); }
</script>
<template>
  <view class="light-editor experience-stack">
    <view class="light-preview" aria-label="五灯区预览">
      <view v-for="item in modelValue.zones" :key="item.id" class="light-preview__zone-wrap">
        <view class="light-preview__zone" :style="{ '--zone-color': item.enabled ? item.color : '#D7DDE6', opacity: item.enabled ? Math.max(.25, item.brightness / 100) : .25 }" />
        <text>灯区 {{ item.id }}</text>
      </view>
    </view>
    <view class="light-zones" role="group" aria-label="选择灯光分区">
      <button v-for="(item, index) in modelValue.zones" :key="item.id" class="experience-choice" :class="{ active: selected === index }" :aria-label="'灯区 ' + item.id" :aria-pressed="selected === index" @click="selected = index">{{ item.id }}</button>
    </view>
    <view class="light-control">
      <BaseToggle :model-value="zone.enabled" :disabled="disabled" :label="`氛围灯 ${zone.id}`" description="独立控制当前灯区，不影响其他四个区域" @update:model-value="update({ enabled: $event })">
        <template #icon><view class="light-control__icon" :style="{ '--current-color': zone.color }"><UiIcon name="Sparkles" tone="inverse" :size="19" /></view></template>
      </BaseToggle>
    </view>
    <view class="light-section" :class="{ 'light-section--disabled': !zone.enabled }">
      <view class="light-section__heading"><view><text class="experience-label">灯光颜色</text><text class="experience-copy">拖动色域与色相条，或选择常用颜色</text></view><view class="light-color-chip" :style="{ background: zone.color }" /></view>
      <ColorPicker :model-value="zone.color" :disabled="disabled || !zone.enabled" @update:model-value="update({ color: $event })" />
    </view>
    <view class="light-divider" />
    <view class="light-section" :class="{ 'light-section--disabled': !zone.enabled }">
      <view class="experience-row"><view><text class="experience-label">灯光亮度</text><text class="experience-copy">调节当前灯区的发光强度</text></view><text class="light-value">{{ zone.brightness }}%</text></view>
      <slider aria-label="灯光亮度" :min="0" :max="100" :value="zone.brightness" :disabled="disabled || !zone.enabled" activeColor="#49A857" backgroundColor="#E5EAF0" :block-size="20" @changing="update({ brightness: number($event) })" @change="update({ brightness: number($event) })" />
    </view>
    <view class="light-divider" />
    <view class="light-section" :class="{ 'light-section--disabled': !zone.enabled }">
      <view><text class="experience-label">灯效模式</text><text class="experience-copy">选择当前灯区的动态表现</text></view>
      <view class="light-effects"><button v-for="effect in lightEffects" :key="effect.id" class="experience-choice" :class="{ active: zone.effect === effect.id }" :disabled="disabled || !zone.enabled" :aria-pressed="zone.effect === effect.id" @click="update({ effect: effect.id })">{{ effect.label }}</button></view>
    </view>
    <view class="light-divider" />
    <view class="light-section" :class="{ 'light-section--disabled': !zone.enabled || zone.effect === 'steady' }">
      <view class="experience-row"><view><text class="experience-label">变化速度</text><text class="experience-copy">{{ zone.effect === 'steady' ? '常亮模式无需调速' : '调节灯效变化节奏' }}</text></view><text class="light-value">{{ zone.effect === 'steady' ? '--' : `${zone.speed}%` }}</text></view>
      <slider aria-label="灯效速度" :min="0" :max="100" :value="zone.speed" :disabled="disabled || !zone.enabled || zone.effect === 'steady'" activeColor="#3569C8" backgroundColor="#E5EAF0" :block-size="20" @changing="update({ speed: number($event) })" @change="update({ speed: number($event) })" />
    </view>
    <text class="experience-copy">五个氛围灯区分别保存颜色、亮度、灯效与速度；实际安装位置以车端协议为准。</text>
  </view>
</template>
<style scoped>
.light-editor { gap: 14px; }
.light-preview { display: grid; min-height: 82px; padding: 15px 12px 12px; align-items: center; border: 1px solid var(--divider); border-radius: 12px; background: var(--page-stage-glow); grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.light-preview__zone-wrap { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: 10px; }
.light-preview__zone { width: 100%; height: 12px; border-radius: 8px; background: var(--zone-color); box-shadow: 0 0 12px color-mix(in srgb, var(--zone-color) 35%, transparent); }
.light-preview__zone-wrap text { color: var(--muted); font-size: 9px; white-space: nowrap; }
.light-zones { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.light-zones .experience-choice { min-height: 40px; padding: 4px; font-size: 12px; }
.light-control { overflow: hidden; border: 1px solid var(--divider); border-radius: 12px; background: var(--surface-muted); }
.light-control__icon { display: flex; width: 40px; height: 40px; align-items: center; justify-content: center; border-radius: 11px; background: var(--current-color); box-shadow: 0 3px 10px color-mix(in srgb, var(--current-color) 25%, transparent); }
.light-section { display: flex; min-width: 0; flex-direction: column; gap: 10px; transition: opacity .18s ease; }
.light-section--disabled { opacity: .45; }
.light-section__heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.light-section__heading > view:first-child, .light-section .experience-row > view { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.light-color-chip { width: 30px; height: 30px; flex: 0 0 auto; border: 2px solid var(--surface); border-radius: 9px; box-shadow: 0 0 0 1px var(--divider); }
.light-effects { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.light-divider { height: 1px; background: var(--divider); }
.light-value { min-width: 48px; padding: 4px 8px; border-radius: 8px; background: var(--bs-vi-sys-color-status-info-background); color: var(--bs-vi-sys-color-text-info); font-size: 12px; font-weight: 700; text-align: center; }
.light-section slider { margin: 0; }
@media (max-width: 340px) {
  .light-preview { gap: 5px; }
  .light-zones { gap: 4px; }
  .light-effects { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
