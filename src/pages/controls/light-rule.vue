<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import AppHeader from '@/components/AppHeader.vue';
import ExperienceNotice from '@/components/ExperienceNotice.vue';
import LightEditor from '@/components/LightEditor.vue';
import { useVehicleStore } from '@/stores/vehicle';
import { useExperienceStore } from '@/stores/experience';
import { useFeedback } from '@/composables/useFeedback';
import { clone, comparisons, defaultLights, signals, soundKinds, type LightRule, type SignalId } from '@/features/experience/model';
const experience = useExperienceStore();
const vehicle = useVehicleStore();
const feedback = useFeedback();
const editing = ref(false);
const invalid = ref(false);
const error = ref('');
const draft = ref<LightRule>({ id: `rule-${Date.now()}`, name: '', enabled: true, priority: Math.min(99, experience.profile.rules.length + 1), createdAt: Date.now(), condition: { signal: 'rpm', compare: 'gte', value: 2000 }, lights: defaultLights(), sound: 'none' });
const signal = computed(() => signals.find(item => item.id === draft.value.condition.signal)!);
const sourceVehicleId = experience.vehicleId;
onLoad(params => {
  if (!params?.id) return;
  const existing = experience.profile.rules.find(item => item.id === params.id);
  if (!existing) { invalid.value = true; return; }
  draft.value = clone(existing); editing.value = true;
});
function selectSignal(event: Event) {
  const id = (event.target as HTMLSelectElement).value as SignalId;
  const item = signals.find(candidate => candidate.id === id)!;
  draft.value.condition = { signal: id, compare: item.unit === '开关' ? 'eq' : 'gte', value: item.unit === '开关' ? 1 : Math.max(item.min, Math.min(item.max, draft.value.condition.value)) };
}
async function save() {
  error.value = '';
  try {
    if (sourceVehicleId !== experience.vehicleId) throw new Error('车辆已变化，请返回后重新编辑');
    await experience.saveRule({ ...clone(draft.value), name: draft.value.name.trim(), priority: Number(draft.value.priority), condition: { ...draft.value.condition, value: Number(draft.value.condition.value) } });
    feedback.toast({ message: '规则已保存（模拟回执）', tone: 'success' }); uni.navigateBack();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '保存失败'; }
}
async function remove() {
  if (!await feedback.confirm({ title: '删除联动规则？', content: '此规则将停止执行，其他规则和单骑灯光不受影响。', confirmText: '删除', cancelText: '取消', tone: 'danger' })) return;
  try {
    if (sourceVehicleId !== experience.vehicleId) throw new Error('车辆已变化，请返回后重新编辑');
    await experience.removeRule(draft.value.id); feedback.toast({ message: '联动规则已删除（演示）', tone: 'success' }); uni.navigateBack();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '删除失败'; }
}
</script>
<template>
  <view class="page-shell experience-page">
    <AppHeader :title="editing ? '编辑联动规则' : '新增联动规则'" back />
    <view class="experience-content">
      <ExperienceNotice />
      <text v-if="invalid" class="experience-error">规则不存在或已被删除，请返回重新选择。</text>
      <template v-else>
        <view class="experience-card experience-stack">
          <text class="experience-title">规则信息</text>
          <view class="experience-field"><text class="experience-label">规则名称</text><input v-model="draft.name" class="experience-input" maxlength="24" placeholder="例如：转速节奏灯" aria-label="规则名称" /></view>
          <view class="experience-field"><text class="experience-label">响应优先级（1–99）</text><input v-model.number="draft.priority" class="experience-input" type="number" aria-label="规则优先级" /></view>
          <text class="experience-copy">数值越小越优先；同级按创建顺序。仅对本车单骑规则生效。</text>
        </view>
        <view class="experience-card experience-stack">
          <text class="experience-title">当以下条件满足</text>
          <select class="experience-select" :value="draft.condition.signal" aria-label="触发信号" @change="selectSignal"><option v-for="item in signals" :key="item.id" :value="item.id">{{ item.label }}</option></select>
          <select v-if="signal.unit === '开关'" v-model.number="draft.condition.value" class="experience-select" aria-label="开关状态"><option :value="1">{{ signal.stateLabels?.[1] || '开启' }}</option><option :value="0">{{ signal.stateLabels?.[0] || '关闭' }}</option></select>
          <template v-else><select v-model="draft.condition.compare" class="experience-select" aria-label="比较条件"><option v-for="item in comparisons" :key="item.id" :value="item.id">{{ item.label }}</option></select><input v-model.number="draft.condition.value" class="experience-input" type="text" aria-label="触发阈值" /><text class="experience-copy">{{ signal.unit }} · 输入范围 {{ signal.min }}～{{ signal.max }}</text></template>
          <text class="experience-copy">每条规则仅一个条件。前后刹车、转把、电锁、组合开关、电流、转速、温度、电压、车身角度、加速度、边撑与车速均可独立触发；实际信号映射待协议冻结。</text>
        </view>
        <view class="experience-card experience-stack"><text class="experience-title">执行这组灯光</text><LightEditor v-model="draft.lights" :disabled="Boolean(experience.busy)" /></view>
        <view class="experience-card experience-stack"><text class="experience-title">同时播放本车音效</text><select v-model="draft.sound" class="experience-select" aria-label="联动音效"><option value="none">不播放音效</option><option v-for="item in soundKinds" :key="item.id" :value="item.id">{{ item.label }}（{{ experience.profile.sounds[item.id].active === 'custom' ? '自定义' : '系统默认' }}）</option></select><text class="experience-copy">使用本车已启用的对应音效，不向队员传输音频文件。</text></view>
        <text v-if="error" class="experience-error" data-testid="rule-error" role="alert">{{ error }}</text>
        <button class="experience-button experience-button--primary" data-testid="rule-save" :disabled="!vehicle.isConnected || Boolean(experience.busy)" @click="save">{{ experience.busy ? '正在保存…' : '保存联动规则' }}</button>
        <button v-if="editing" class="experience-button experience-button--danger" data-testid="rule-delete" :disabled="!vehicle.isConnected || Boolean(experience.busy)" @click="remove">删除规则</button>
      </template>
    </view>
  </view>
</template>
