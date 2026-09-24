<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import AppHeader from '@/components/AppHeader.vue';
import PageIntro from '@/components/PageIntro.vue';
import UiIcon from '@/components/UiIcon.vue';
import ExperienceNotice from '@/components/ExperienceNotice.vue';
import ExperienceIcon from '@/components/ExperienceIcon.vue';
import ExperienceDebug from '@/components/ExperienceDebug.vue';
import LightEditor from '@/components/LightEditor.vue';
import LightSummary from '@/components/LightSummary.vue';
import { useVehicleStore } from '@/stores/vehicle';
import { useExperienceStore } from '@/stores/experience';
import { useFeedback } from '@/composables/useFeedback';
import { clone, defaultLights, describeRule, matchingRule, signals, type LightRule, type SignalId } from '@/features/experience/model';

const vehicle = useVehicleStore();
const experience = useExperienceStore();
const feedback = useFeedback();
const scope = ref<'solo' | 'team'>('solo');
const applied = computed(() => scope.value === 'team' ? experience.team?.liveLights || defaultLights() : experience.profile.lights);
const draft = ref(clone(applied.value));
const error = ref('');
const canEdit = computed(() => vehicle.isBound && (scope.value === 'solo' || experience.team?.role === 'captain'));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(applied.value));
const demoSignal = ref<SignalId>('rpm');
const demoValue = ref('2000');
const demoRan = ref(false);
const result = ref<LightRule | null>(null);
const demoDefinition = computed(() => signals.find(item => item.id === demoSignal.value)!);
const rules = computed(() => [...experience.profile.rules].sort((first, second) => first.priority - second.priority || first.createdAt - second.createdAt));

onLoad(params => { scope.value = params?.scope === 'team' ? 'team' : 'solo'; draft.value = clone(applied.value); });
watch(() => experience.vehicleId, () => { draft.value = clone(applied.value); error.value = ''; demoRan.value = false; });
watch(() => experience.team?.id, () => { if (scope.value === 'team') draft.value = clone(applied.value); });
watch(demoSignal, () => { demoValue.value = demoDefinition.value.unit === '开关' ? '1' : String(Math.max(demoDefinition.value.min, Math.min(demoDefinition.value.max, 0))); demoRan.value = false; });

async function save() {
  error.value = '';
  try { await experience.saveLights(draft.value, scope.value); feedback.toast({ message: scope.value === 'solo' ? '单骑灯光已保存（模拟回执）' : '车队灯光已同步（模拟回执）', tone: 'success' }); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : '保存失败'; }
}

async function toggle(rule: LightRule) {
  error.value = '';
  try { await experience.saveRule({ ...clone(rule), enabled: !rule.enabled }); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : '设置失败'; }
}

function testRule() {
  const value = Number(demoValue.value);
  if (!demoValue.value.trim() || !Number.isFinite(value)) { error.value = '请输入有效的模拟信号数值'; return; }
  error.value = ''; result.value = matchingRule(experience.profile.rules, { [demoSignal.value]: value }); demoRan.value = true;
}
</script>
<template>
  <view class="page-shell experience-page">
    <AppHeader :title="scope === 'solo' ? '氛围灯联动' : '车队灯光同步'" back />
    <PageIntro :title="scope === 'solo' ? '用光，表达你的节奏' : '同行，也同频'" :copy="scope === 'solo' ? '五区灯光独立设置；按车辆信号触发灯光与本车音效。' : '队长统一控制本次车队灯光，不覆盖成员的单骑设置。'" eyebrow="AMBIENT LIGHT" icon="Sparkles" tone="warning" compact><template #emblem><ExperienceIcon kind="light" /></template></PageIntro>
    <view class="experience-content">
      <ExperienceNotice />
      <view v-if="scope === 'team'" class="experience-note"><text>{{ experience.team ? `当前身份：${experience.team.role === 'captain' ? '队长' : '队员'}。只有队长可下发配置。` : '当前没有有效车队，请先组队。' }}此处仅调整本次车队运行灯光，不覆盖单骑灯光与规则。</text></view>
      <view v-else-if="experience.team" class="experience-note"><text>当前处于车队中。这里编辑单骑预设，车队运行灯光优先；退出车队后恢复单骑配置。</text></view>
      <view class="experience-card experience-stack">
        <view class="experience-row"><text class="experience-title">{{ scope === 'solo' ? '单骑灯光方案' : '车队运行方案' }}</text><text class="experience-tag">{{ dirty ? '未保存' : '已保存配置' }}</text></view>
        <LightEditor v-model="draft" :disabled="!canEdit || Boolean(experience.busy)" />
        <button class="experience-button experience-button--primary" data-testid="lights-save" :disabled="!canEdit || !vehicle.isConnected || Boolean(experience.busy)" @click="save">{{ experience.busy ? '正在下发…' : scope === 'solo' ? '保存单骑灯光' : '同步至车队' }}</button>
      </view>
      <text v-if="error" class="experience-error" role="alert">{{ error }}</text>
      <template v-if="scope === 'solo'">
        <view class="experience-row"><view class="experience-stack"><text class="experience-heading">联动规则</text><text class="experience-copy">{{ rules.length }} 条规则 · 每条一个触发条件</text></view><button class="experience-button" data-testid="rule-add" :disabled="!vehicle.isBound" @click="uni.navigateTo({ url: '/pages/controls/light-rule' })"><UiIcon name="UserPlus" tone="info" :size="16" />新增</button></view>
        <view v-if="!rules.length" class="experience-card experience-empty"><UiIcon name="Sparkles" tone="warning" :size="28" /><text class="experience-title">让灯光响应骑行状态</text><text class="experience-copy">例如转速达到条件时，执行指定灯效并播放本车音效。先新建一条规则。</text></view>
        <view v-for="rule in rules" :key="rule.id" class="experience-card experience-stack" data-testid="light-rule-item">
          <view class="experience-row"><view class="experience-stack"><text class="experience-title">{{ rule.name }}</text><text class="experience-copy">{{ describeRule(rule) }}</text></view><button class="experience-button" role="switch" :aria-checked="rule.enabled" :disabled="!vehicle.isConnected || Boolean(experience.busy)" @click="toggle(rule)">{{ rule.enabled ? '已开启' : '已关闭' }}</button></view>
          <view class="experience-row"><text class="experience-tag">优先级 {{ rule.priority }}</text><button class="experience-button experience-button--quiet" @click="uni.navigateTo({ url: `/pages/controls/light-rule?id=${encodeURIComponent(rule.id)}` })">编辑规则 <UiIcon name="ChevronRight" tone="info" :size="16" /></button></view>
        </view>
        <text class="experience-copy">数值越小优先级越高；同时满足时执行最高优先级的一条规则。同优先级按创建顺序响应。实际信号及执行优先级待车端协议确认。</text>
        <view v-if="rules.length" class="experience-card experience-stack">
          <text class="experience-title">规则预览</text><text class="experience-copy">输入一个模拟信号，检查命中的规则。仅预览，不操作车辆。</text>
          <select v-model="demoSignal" class="experience-select" aria-label="模拟信号"><option v-for="signal in signals" :key="signal.id" :value="signal.id">{{ signal.label }}（{{ signal.unit }}）</option></select>
          <select v-if="demoDefinition.unit === '开关'" v-model="demoValue" class="experience-select" aria-label="模拟信号数值"><option value="1">{{ demoDefinition.stateLabels?.[1] || '开启' }}</option><option value="0">{{ demoDefinition.stateLabels?.[0] || '关闭' }}</option></select>
          <template v-else><input v-model="demoValue" class="experience-input" type="text" aria-label="模拟信号数值" /><text class="experience-copy">范围 {{ demoDefinition.min }}～{{ demoDefinition.max }} {{ demoDefinition.unit }}</text></template>
          <button class="experience-button" data-testid="rule-preview" @click="testRule">预览触发结果</button>
          <template v-if="demoRan"><text class="experience-tag" data-testid="rule-preview-result">{{ result ? `命中：${result.name} · 优先级 ${result.priority}` : '没有命中规则，沿用单骑灯光方案' }}</text><LightSummary :config="result?.lights || experience.profile.lights" :sound="result?.sound || 'none'" /></template>
        </view>
      </template>
      <ExperienceDebug />
    </view>
  </view>
</template>
