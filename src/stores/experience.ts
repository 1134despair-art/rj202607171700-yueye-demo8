import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useVehicleStore } from '@/stores/vehicle';
import { readStorage, writeStorage } from '@/utils/storage';
import { clearAudio, defaultSound, deleteAudio, getAudio, putAudio } from '@/features/experience/audio';
import { clone, defaultLights, normalizeProfile, validateAudio, validateLights, validateRule, validateSoundSettings, type ExperienceProfile, type SoundKind, type SoundAsset, type SoundSettings, type LightConfig, type LightRule, type NearbyVehicle, type TeamPlan, type TeamSession, type Invitation } from '@/features/experience/model';
import { mockNearbyVehicles, sendExperienceCommand, type ExperienceCommand } from '@/features/experience/transport';

const storageKey = 'binsen.raven.v2.lights.experience.profiles';

export const useExperienceStore = defineStore('experience', () => {
  const vehicle = useVehicleStore();
  const profiles = ref(readStorage<Record<string, ExperienceProfile>>(storageKey, {}));
  const vehicleId = computed(() => vehicle.vehicle?.id || '');
  const profile = computed(() => normalizeProfile(profiles.value[vehicleId.value]));
  const busy = ref('');
  const progress = ref(0);
  const lastError = ref('');
  const failNextCommand = ref(false);
  const team = ref<TeamSession | null>(null);
  const incoming = ref<Invitation | null>(null);
  const searching = ref(false);
  const remaining = ref(0);
  const nearby = ref<NearbyVehicle[]>([]);
  const teamNotice = ref('');
  const searchEmpty = ref(false);
  const history = ref<Array<{ command: ExperienceCommand; scope: string; state: string }>>([]);
  let connectionVersion = 0;
  let searchVersion = 0;
  let searchTimer: ReturnType<typeof setInterval> | undefined;

  function assertConnected(expectedId = vehicleId.value, expectedVersion = connectionVersion) {
    if (!vehicleId.value) throw new Error('请先绑定车辆');
    if (!vehicle.isConnected) throw new Error('请先连接本车蓝牙');
    if (vehicleId.value !== expectedId || connectionVersion !== expectedVersion) throw new Error('车辆连接已变化，本次操作已取消');
  }

  function persist(change: (next: ExperienceProfile) => void) {
    const next = clone(profile.value);
    change(next);
    const nextProfiles = { ...profiles.value, [vehicleId.value]: next };
    writeStorage(storageKey, nextProfiles);
    profiles.value = nextProfiles;
  }

  async function send(command: ExperienceCommand, payload: unknown, scope: 'solo' | 'team' = 'solo') {
    assertConnected();
    if (busy.value) throw new Error('上一项操作尚未完成，请稍后再试');
    const expectedId = vehicleId.value;
    const expectedVersion = connectionVersion;
    const failed = failNextCommand.value;
    failNextCommand.value = false;
    busy.value = command; progress.value = 0; lastError.value = '';
    try {
      const receipt = await sendExperienceCommand({ vehicleId: expectedId, command, scope, payload }, { failed, assertConnected: () => assertConnected(expectedId, expectedVersion), progress: value => { progress.value = value; } });
      history.value = [{ command, scope, state: '模拟回执成功' }, ...history.value].slice(0, 10);
      return receipt;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '操作失败，请重试';
      history.value = [{ command, scope, state: lastError.value }, ...history.value].slice(0, 10);
      throw error;
    } finally { busy.value = ''; }
  }

  async function uploadSound(kind: SoundKind, asset: SoundAsset, blob: Blob) {
    assertConnected();
    validateAudio(asset.name, blob.size, asset.duration);
    const expectedId = vehicleId.value;
    const expectedVersion = connectionVersion;
    const old = profile.value.sounds[kind].custom;
    await putAudio(asset.id, blob);
    try {
      assertConnected(expectedId, expectedVersion);
      await send('sound.upload', { kind, asset, bytes: blob.size, nextActive: 'default' });
      persist(next => { next.sounds[kind] = { custom: asset, active: 'default' }; });
    } catch (error) { await deleteAudio(asset.id).catch(() => undefined); throw error; }
    if (old && old.id !== asset.id) await deleteAudio(old.id).catch(() => undefined);
  }

  async function activateSound(kind: SoundKind, active: 'default' | 'custom') {
    if (active === 'custom' && !profile.value.sounds[kind].custom) throw new Error('请先上传自定义音频');
    await send('sound.activate', { kind, active });
    persist(next => { next.sounds[kind].active = active; });
  }

  async function removeSound(kind: SoundKind) {
    const asset = profile.value.sounds[kind].custom;
    if (!asset) return;
    await send('sound.delete', { kind, restore: 'default' });
    persist(next => { next.sounds[kind] = { custom: null, active: 'default' }; });
    await deleteAudio(asset.id).catch(() => undefined);
  }

  async function saveSoundSettings(settings: SoundSettings) {
    validateSoundSettings(settings);
    const snapshot = clone(settings);
    await send('sound.settings', { settings: snapshot });
    persist(next => { next.soundSettings = snapshot; });
  }

  async function saveLights(lights: LightConfig, scope: 'solo' | 'team' = 'solo') {
    validateLights(lights);
    const snapshot = clone(lights);
    if (scope === 'team') {
      if (team.value?.role !== 'captain') throw new Error('只有队长可以同步车队灯光');
      const sessionId = team.value.id;
      await send('team.lights', { sessionId, lights: snapshot }, 'team');
      if (team.value?.id !== sessionId) throw new Error('车队已结束，同步取消');
      team.value.liveLights = snapshot;
    } else {
      await send('light.solo', { lights: snapshot, mode: team.value ? 'preset-only' : 'active' });
      persist(next => { next.lights = snapshot; });
    }
  }

  function captainSession() {
    if (!team.value) throw new Error('请先创建或加入车队');
    if (team.value.role !== 'captain') throw new Error('只有队长可以下发车队指令');
    return team.value;
  }

  async function sendTeamAction(action: 'hazard' | 'horn') {
    const session = captainSession();
    const sessionId = session.id;
    await send(action === 'hazard' ? 'team.hazard' : 'team.horn', { sessionId, action }, 'team');
    if (team.value?.id !== sessionId) throw new Error('车队已结束，指令已取消');
    teamNotice.value = action === 'hazard' ? '已向本次车队下发双闪指令（模拟回执）' : '已向本次车队下发鸣笛指令（模拟回执）';
  }

  async function syncTeamAudio(kind: SoundKind) {
    const session = captainSession();
    const sessionId = session.id;
    const slot = profile.value.sounds[kind];
    const source = slot.active === 'custom' && slot.custom ? slot.custom : null;
    const blob = source ? await getAudio(source.id) : defaultSound(kind);
    await send('team.audio', { sessionId, kind, source: source ? 'custom' : 'default', name: source?.name || '系统预埋音效', bytes: blob.size }, 'team');
    if (team.value?.id !== sessionId) throw new Error('车队已结束，音效同步已取消');
    teamNotice.value = `已向本次车队实时同步${source ? '本车自定义' : '系统预埋'}音效（模拟回执）`;
  }

  async function saveRule(rule: LightRule) {
    validateRule(rule);
    const snapshot = clone(rule);
    await send('rule.save', { rule: snapshot, mode: team.value ? 'preset-only' : 'active' });
    persist(next => {
      const index = next.rules.findIndex(item => item.id === snapshot.id);
      if (index < 0) next.rules.push(snapshot); else next.rules[index] = snapshot;
    });
  }

  async function removeRule(id: string) {
    await send('rule.delete', { id });
    persist(next => { next.rules = next.rules.filter(item => item.id !== id); });
  }

  function stopSearch(notifyController = true) {
    const wasSearching = searching.value;
    searchVersion += 1;
    if (searchTimer) clearInterval(searchTimer);
    searchTimer = undefined; searching.value = false; remaining.value = 0;
    if (wasSearching && notifyController && vehicle.isConnected) {
      const expectedId = vehicleId.value;
      const expectedVersion = connectionVersion;
      void sendExperienceCommand({ vehicleId: expectedId, command: 'team.stop-search', scope: 'team', payload: {} }, { assertConnected: () => assertConnected(expectedId, expectedVersion) }).catch(() => undefined);
    }
  }

  async function startSearch() {
    assertConnected(); stopSearch(); nearby.value = []; teamNotice.value = '';
    const version = ++searchVersion;
    await send('team.search', { timeoutMs: 10000 }, 'team');
    if (version !== searchVersion) return;
    const deadline = Date.now() + 10000;
    searching.value = true; remaining.value = 10;
    searchTimer = setInterval(() => {
      if (version !== searchVersion) return;
      remaining.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (remaining.value <= 8 && !searchEmpty.value) nearby.value = clone(mockNearbyVehicles);
      if (!remaining.value) stopSearch();
    }, 200);
  }

  async function invite(candidate: NearbyVehicle, plan: TeamPlan) {
    if (team.value?.role === 'member') throw new Error('队员不能邀请其他车辆');
    if (team.value?.members.some(member => member.id === candidate.id)) throw new Error('此车辆已经在队伍中');
    if (team.value?.invitations.some(invitation => invitation.vehicle.id === candidate.id && invitation.status === 'pending')) throw new Error('已发出邀请，请等待对方回复');
    validateLights(plan.lights);
    if (!['none', 'startup', 'horn', 'reverse'].includes(plan.sound)) throw new Error('邀请音效方案无效');
    stopSearch();
    const snapshot = clone(team.value?.locked ? team.value.plan : plan);
    await send('team.invite', { recipient: candidate.id, plan: snapshot }, 'team');
    if (!team.value) {
      const self: NearbyVehicle = { id: vehicleId.value, name: vehicle.vehicle?.displayName || vehicle.vehicle?.name || '我的车辆', model: vehicle.vehicle?.model || 'X5', response: 'accepted' };
      team.value = { id: `team-${Date.now()}`, role: 'captain', captain: self, members: [self], plan: snapshot, liveLights: clone(snapshot.lights), invitations: [], locked: true };
    }
    team.value.locked = true;
    const invitation: Invitation = { id: `invite-${Date.now()}`, vehicle: clone(candidate), plan: snapshot, status: 'pending', expiresAt: Date.now() + 30000 };
    team.value.invitations.push(invitation);
    const sessionId = team.value.id;
    const version = connectionVersion;
    await new Promise(resolve => setTimeout(resolve, 1400));
    if (team.value?.id !== sessionId || version !== connectionVersion) return;
    const current = team.value.invitations.find(item => item.id === invitation.id);
    if (!current) return;
    current.status = candidate.response;
    if (candidate.response === 'accepted') team.value.members.push(clone(candidate));
    teamNotice.value = `${candidate.name}${candidate.response === 'accepted' ? '已接受邀请并同步灯光' : '已拒绝邀请'}（模拟回执）`;
  }

  function mockIncomingInvite() {
    assertConnected();
    if (team.value) throw new Error('请先退出当前车队再接收新的邀请');
    incoming.value = { id: `incoming-${Date.now()}`, vehicle: clone(mockNearbyVehicles[0]), plan: { lights: defaultLights(), sound: 'startup' }, status: 'pending', expiresAt: Date.now() + 60000 };
  }

  async function answerInvitation(accepted: boolean) {
    const invitation = incoming.value;
    if (!invitation || invitation.expiresAt <= Date.now()) throw new Error('邀请已过期，请让队长重新邀请');
    if (accepted && team.value) throw new Error('请先退出当前车队');
    await send(accepted ? 'team.accept' : 'team.reject', { invitationId: invitation.id, plan: invitation.plan }, 'team');
    if (incoming.value?.id !== invitation.id) throw new Error('邀请状态已变化');
    if (invitation.expiresAt <= Date.now()) throw new Error('邀请已过期，请让队长重新邀请');
    stopSearch();
    if (accepted) {
      const self: NearbyVehicle = { id: vehicleId.value, name: vehicle.vehicle?.name || '我的车辆', model: vehicle.vehicle?.model || 'X5', response: 'accepted' };
      team.value = { id: invitation.id, role: 'member', captain: invitation.vehicle, members: [invitation.vehicle, self], plan: clone(invitation.plan), liveLights: clone(invitation.plan.lights), invitations: [], locked: true };
    }
    incoming.value = null;
    teamNotice.value = accepted ? '已加入车队，按邀请方案执行灯光（演示）' : '已拒绝邀请，单骑设置未改变';
  }

  async function removeMember(id: string) {
    if (team.value?.role !== 'captain' || id === vehicleId.value) throw new Error('只有队长可以移除其他队员');
    await send('team.remove', { teamId: team.value.id, memberId: id }, 'team');
    if (team.value) team.value.members = team.value.members.filter(member => member.id !== id);
  }

  async function exitTeam() {
    if (!team.value) return;
    const captain = team.value.role === 'captain';
    await send(captain ? 'team.disband' : 'team.leave', { teamId: team.value.id }, 'team');
    team.value = null; stopSearch();
    teamNotice.value = captain ? '车队已解散，恢复各自单骑配置（演示）' : '已离开车队，恢复本车单骑配置（演示）';
  }

  function mockCaptainPowerOff() {
    team.value = null; incoming.value = null; stopSearch();
    teamNotice.value = '收到队长车辆下电事件，本次组队已结束（演示）';
  }

  watch(() => [vehicleId.value, vehicle.isConnected] as const, ([id, connected], [previousId]) => {
    connectionVersion += 1;
    if (id !== previousId || !connected) {
      if (team.value) teamNotice.value = '连接或车辆已变化，请重新确认组队状态';
      team.value = null; incoming.value = null; stopSearch(false); nearby.value = [];
    }
  }, { flush: 'sync' });

  async function reset() {
    stopSearch(); connectionVersion += 1; team.value = null; incoming.value = null;
    profiles.value = {}; writeStorage(storageKey, {}); await clearAudio();
  }

  return { vehicleId, profile, busy, progress, lastError, failNextCommand, team, incoming, searching, remaining, nearby, teamNotice, searchEmpty, history, uploadSound, activateSound, removeSound, saveSoundSettings, saveLights, sendTeamAction, syncTeamAudio, saveRule, removeRule, startSearch, stopSearch, invite, mockIncomingInvite, answerInvitation, removeMember, exitTeam, mockCaptainPowerOff, reset };
});
