<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { onHide, onUnload } from '@dcloudio/uni-app';
import AppHeader from '@/components/AppHeader.vue';
import PageIntro from '@/components/PageIntro.vue';
import ExperienceNotice from '@/components/ExperienceNotice.vue';
import ExperienceDebug from '@/components/ExperienceDebug.vue';
import ExperienceIcon from '@/components/ExperienceIcon.vue';
import UiIcon from '@/components/UiIcon.vue';
import LightEditor from '@/components/LightEditor.vue';
import LightSummary from '@/components/LightSummary.vue';
import { useExperienceStore } from '@/stores/experience';
import { useVehicleStore } from '@/stores/vehicle';
import { useFeedback } from '@/composables/useFeedback';
import { clone, defaultLights, soundKinds, type NearbyVehicle, type SoundKind, type TeamPlan } from '@/features/experience/model';

const experience = useExperienceStore();
const vehicle = useVehicleStore();
const feedback = useFeedback();
const plan = ref<TeamPlan>({ lights: clone(experience.profile.lights || defaultLights()), sound: 'none' });
const editingPlan = ref(false);
const searched = ref(false);
const error = ref('');
const inviting = ref('');
const teamSound = ref<SoundKind>('horn');
const visiblePlan = computed(() => experience.team?.plan || plan.value);
const candidates = computed(() => experience.nearby.filter(candidate => !experience.team?.members.some(member => member.id === candidate.id)));
const isMember = computed(() => experience.team?.role === 'member');
const disabled = computed(() => !vehicle.isConnected || Boolean(experience.busy));
const teamSoundSource = computed(() => experience.profile.sounds[teamSound.value].active === 'custom' ? '本车自定义音效' : '系统预埋音效');

watch(() => experience.vehicleId, () => {
  plan.value = { lights: clone(experience.profile.lights), sound: 'none' };
  teamSound.value = 'horn'; editingPlan.value = false; searched.value = false; error.value = '';
});

async function search() {
  error.value = ''; searched.value = true;
  try { await experience.startSearch(); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : '搜索失败，请重试'; }
}
async function invite(candidate: NearbyVehicle) {
  if (inviting.value) return;
  const confirmed = await feedback.confirm({ title: `邀请${candidate.name}？`, content: '邀请包含下方默认灯光与本车音效方案。发出后方案锁定，对方同意后才会加入。当前对端响应为模拟数据。', confirmText: '发送邀请', cancelText: '取消' });
  if (!confirmed) return;
  error.value = ''; inviting.value = candidate.id; editingPlan.value = false;
  try { await experience.invite(candidate, visiblePlan.value); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : '邀请失败，请重试'; }
  finally { inviting.value = ''; }
}
async function remove(candidate: NearbyVehicle) {
  if (!await feedback.confirm({ title: '移除这位队员？', content: `${candidate.name}将退出本次车队，恢复其单骑灯光设置。`, confirmText: '移除', cancelText: '取消', tone: 'warning' })) return;
  try { await experience.removeMember(candidate.id); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : '移除失败'; }
}
async function leave() {
  const captain = experience.team?.role === 'captain';
  if (!await feedback.confirm({ title: captain ? '解散车队？' : '离开车队？', content: captain ? '本次组队结束，所有队员退出同步并恢复各自单骑设置。' : '你将退出灯光同步，本车恢复单骑设置，其他队员不受影响。', confirmText: captain ? '解散车队' : '离开车队', cancelText: '取消', tone: 'warning' })) return;
  try { await experience.exitTeam(); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : '操作失败'; }
}
async function runTeamAction(action: 'hazard' | 'horn') {
  error.value = '';
  try { await experience.sendTeamAction(action); feedback.toast({ message: action === 'hazard' ? '全队双闪指令已下发' : '全队鸣笛指令已下发', tone: 'success' }); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : '车队指令下发失败'; }
}
async function syncAudio() {
  error.value = '';
  try { await experience.syncTeamAudio(teamSound.value); feedback.toast({ message: '车队音效同步完成（模拟回执）', tone: 'success' }); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : '车队音效同步失败'; }
}
onHide(() => experience.stopSearch());
onUnload(() => experience.stopSearch());
onUnmounted(() => experience.stopSearch());
</script>
<template>
  <view class="page-shell experience-page">
    <AppHeader title="车主组队" back />
    <PageIntro title="一起出发，一起亮起" copy="通过本车寻找附近车辆，邀请同行，共享本次车队的灯光节奏。" eyebrow="RIDE TOGETHER" icon="UsersRound" tone="success" compact><template #emblem><ExperienceIcon kind="team" /></template></PageIntro>
    <view class="experience-content">
      <ExperienceNotice />
      <button v-if="experience.incoming" class="experience-card experience-entry" data-testid="team-incoming-entry" @click="uni.navigateTo({ url: '/pages/controls/team-invitation' })"><view class="experience-emblem experience-emblem--green"><ExperienceIcon kind="team" /></view><view class="experience-stack"><text class="experience-title">收到组队邀请</text><text class="experience-copy">{{ experience.incoming.vehicle.name }}邀请你查看方案</text></view><UiIcon name="ChevronRight" tone="muted" :size="18" /></button>
      <view v-if="experience.teamNotice" class="experience-note" data-testid="team-notice" role="status"><text>{{ experience.teamNotice }}</text></view>
      <view v-if="experience.team" class="experience-card experience-stack" data-testid="team-session">
        <view class="experience-row"><view class="experience-stack"><text class="experience-eyebrow">{{ isMember ? 'MEMBER' : 'CAPTAIN' }}</text><text class="experience-title">{{ isMember ? '你已加入车队' : '我的车队' }}</text><text class="experience-copy">{{ experience.team.members.length }} 辆车 · 队长 {{ experience.team.captain.name }}</text></view><view class="experience-emblem experience-emblem--green"><ExperienceIcon kind="team" /></view></view>
        <view v-for="member in experience.team.members" :key="member.id" class="experience-row team-member" data-testid="team-member"><UiIcon name="Bike" tone="muted" :size="24" /><view class="experience-stack"><text class="experience-title">{{ member.name }}{{ member.id === experience.vehicleId ? '（我）' : '' }}</text><text class="experience-copy">{{ member.model }} · {{ member.id === experience.team.captain.id ? '队长' : '队员' }}</text></view><button v-if="!isMember && member.id !== experience.vehicleId" class="experience-button experience-button--quiet" :disabled="disabled" @click="remove(member)">移除</button></view>
        <view v-if="!isMember" class="team-controls experience-stack">
          <view class="experience-row"><view class="experience-stack"><text class="experience-title">车队实时控制</text><text class="experience-copy">仅作用于本次车队，不修改任何车辆的单骑配置</text></view><text class="experience-tag experience-tag--green">车队模式</text></view>
          <view class="team-command-grid">
            <button class="experience-button" data-testid="team-hazard" :disabled="disabled" @click="runTeamAction('hazard')"><UiIcon name="AlertTriangle" tone="warning" :size="17" />全队双闪</button>
            <button class="experience-button" data-testid="team-horn" :disabled="disabled" @click="runTeamAction('horn')"><UiIcon name="Bell" tone="info" :size="17" />全队鸣笛</button>
          </view>
          <button class="experience-button" data-testid="team-lights" :disabled="disabled" @click="uni.navigateTo({ url: '/pages/controls/lights?scope=team' })"><ExperienceIcon kind="light" />调整并同步车队灯光</button>
          <view class="experience-field"><text class="experience-label">实时同步音效</text><select v-model="teamSound" class="experience-select" aria-label="车队实时音效"><option v-for="item in soundKinds" :key="item.id" :value="item.id">{{ item.label }} · {{ experience.profile.sounds[item.id].active === 'custom' ? '本车自定义' : '系统预埋' }}</option></select></view>
          <button class="experience-button experience-button--primary" data-testid="team-audio" :disabled="disabled" @click="syncAudio"><ExperienceIcon kind="sound" />{{ experience.busy === 'team.audio' ? `正在同步 ${experience.progress}%` : '实时同步至车队' }}</button>
          <view v-if="experience.busy === 'team.audio'" class="experience-progress" role="status" aria-label="车队音效同步进度"><view :style="{ width: `${experience.progress}%` }" /></view>
          <text class="experience-copy">当前发送：{{ teamSoundSource }}。音效只在本次车队临时播放，退出或解散后不保留，也不覆盖队员本车音效。</text>
        </view>
        <view v-else class="experience-note"><text>你正在执行队长灯光方案。可随时离开车队；队员不能更改整队配置。</text></view>
        <button class="experience-button experience-button--danger" data-testid="team-exit" :disabled="disabled" @click="leave">{{ isMember ? '离开车队' : '解散车队' }}</button>
      </view>
      <view class="experience-card experience-stack">
        <view class="experience-row"><text class="experience-title">{{ experience.team ? '已确认的邀请方案' : '邀请默认方案' }}</text><text v-if="experience.team?.locked" class="experience-tag"><UiIcon name="LockKeyhole" tone="info" :size="12" /> 已锁定</text></view>
        <LightSummary :config="visiblePlan.lights" :sound="visiblePlan.sound" />
        <button v-if="!experience.team" class="experience-button" :disabled="disabled || Boolean(inviting)" @click="editingPlan = !editingPlan">{{ editingPlan ? '收起方案设置' : '编辑邀请方案' }}</button>
        <template v-if="editingPlan && !experience.team"><LightEditor v-model="plan.lights" :disabled="Boolean(experience.busy) || Boolean(inviting)" /><text class="experience-label">本车音频方案</text><select v-model="plan.sound" class="experience-select" aria-label="邀请音频方案"><option value="none">不联动音效</option><option v-for="item in soundKinds" :key="item.id" :value="item.id">{{ item.label }} · 各车本地播放</option></select></template>
        <text class="experience-copy">邀请发出后默认方案锁定。默认音效按各车本地音源播放；组队成功后，队长可在“车队实时控制”中临时同步本车音效。</text>
      </view>
      <template v-if="!isMember">
        <view class="experience-row"><view class="experience-stack"><text class="experience-heading">附近车辆</text><text class="experience-copy">由本车蓝牙模块搜索 · 最长 10 秒</text></view><button class="experience-button" data-testid="team-search" :disabled="disabled || Boolean(inviting)" @click="search">{{ experience.searching ? '刷新搜索' : searched ? '重新搜索' : '开始搜索' }}</button></view>
        <view v-if="experience.searching" class="experience-card experience-row" role="status"><UiIcon name="LoaderCircle" tone="info" :size="22" spinning /><view class="experience-stack"><text class="experience-title">正在搜索 · {{ experience.remaining }} 秒</text><text class="experience-copy">请保持车辆处于连接状态</text></view><button class="experience-button" data-testid="team-stop" @click="experience.stopSearch()">停止</button></view>
        <view v-if="!candidates.length && !experience.searching" class="experience-card experience-empty"><UiIcon name="ScanSearch" tone="info" :size="28" /><text class="experience-title">{{ searched ? '暂未发现可邀请的车辆' : '找到附近的同行者' }}</text><text class="experience-copy">{{ searched ? '请确认对方车辆在线且位于附近，再尝试刷新搜索。' : '先确认默认方案，再发出邀请；对方接受后才会加入。' }}</text></view>
        <view v-for="candidate in candidates" :key="candidate.id" class="experience-card experience-row" data-testid="team-candidate"><UiIcon name="Bike" tone="muted" :size="24" /><view class="experience-stack"><text class="experience-title">{{ candidate.name }}</text><text class="experience-copy">{{ candidate.model }} · 演示车辆</text></view><button class="experience-button" :disabled="disabled || Boolean(inviting)" @click="invite(candidate)">{{ inviting === candidate.id ? '等待回复…' : '邀请' }}</button></view>
      </template>
      <view v-if="experience.team?.invitations.length" class="experience-card experience-stack"><text class="experience-title">邀请记录</text><view v-for="invitation in experience.team.invitations" :key="invitation.id" class="experience-row"><text class="experience-copy">{{ invitation.vehicle.name }}</text><text class="experience-tag" data-testid="team-invite-status">{{ invitation.status === 'pending' ? '等待接受' : invitation.status === 'accepted' ? '已接受（模拟）' : '已拒绝（模拟）' }}</text></view></view>
      <text v-if="error" class="experience-error" data-testid="team-error" role="alert">{{ error }}</text>
      <text class="experience-copy">队长车辆下电或主动解散，将结束本次车队。APP 断连、刷新或切换车辆后需重新确认组队状态。车队配置不会覆盖各车单骑设置。</text>
      <ExperienceDebug team />
    </view>
  </view>
</template>
<style scoped>
.team-member { min-height: 64px; padding: 12px 0; border-top: 1px solid var(--divider); }
.team-member .experience-title { font-size: 13px; }
.team-controls { padding-top: 14px; border-top: 1px solid var(--divider); }
.team-command-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
</style>
