<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import AppHeader from '@/components/AppHeader.vue';
import ExperienceNotice from '@/components/ExperienceNotice.vue';
import ExperienceDebug from '@/components/ExperienceDebug.vue';
import ExperienceIcon from '@/components/ExperienceIcon.vue';
import UiIcon from '@/components/UiIcon.vue';
import { useVehicleStore } from '@/stores/vehicle';
import { useExperienceStore } from '@/stores/experience';
import { useFeedback } from '@/composables/useFeedback';
import { audioDuration, decodeAudio, defaultSound, getAudio, presetSound, trimAudio } from '@/features/experience/audio';
import { soundKinds, soundPresets, validateAudio, validateTrim, type SoundKind } from '@/features/experience/model';

const vehicle = useVehicleStore();
const experience = useExperienceStore();
const feedback = useFeedback();
const kind = ref<SoundKind | null>(null);
const selected = computed(() => soundKinds.find(item => item.id === kind.value));
const slot = computed(() => kind.value ? experience.profile.sounds[kind.value] : null);
const buffer = shallowRef<AudioBuffer | null>(null);
const candidateName = ref('');
const selectedPresetId = ref('');
const sourceBytes = ref(0);
const trimStart = ref('0');
const trimEnd = ref('0');
const processing = ref(false);
const recording = ref(false);
const recordedSeconds = ref(0);
const playing = ref('');
const error = ref('');
let recorder: MediaRecorder | undefined;
let stream: MediaStream | undefined;
let recordTimer: ReturnType<typeof setInterval> | undefined;
let audio: HTMLAudioElement | undefined;
let audioUrl = '';
let disposed = false;
let revision = 0;
let fileInput: HTMLInputElement | undefined;

const locked = computed(() => processing.value || Boolean(experience.busy) || recording.value);
const trimError = computed(() => {
  if (!buffer.value) return '';
  try { validateTrim(Number(trimStart.value), Number(trimEnd.value), buffer.value.duration); return ''; }
  catch (reason) { return reason instanceof Error ? reason.message : '裁剪范围无效'; }
});
const duration = computed(() => Math.max(0, Number(trimEnd.value) - Number(trimStart.value)));
const presets = computed(() => kind.value ? soundPresets[kind.value] : []);
const vehicleLabel = computed(() => vehicle.vehicle?.displayName || vehicle.vehicle?.name || '当前车辆');

onLoad(params => { const value = params?.kind; kind.value = soundKinds.some(item => item.id === value) ? value as SoundKind : null; });
function message(reason: unknown) { error.value = reason instanceof Error ? reason.message : '操作失败，请重试'; }
function stopPlayback() { audio?.pause(); audio = undefined; if (audioUrl) URL.revokeObjectURL(audioUrl); audioUrl = ''; playing.value = ''; }

async function play(target: 'default' | 'custom' | 'candidate') {
  if (!kind.value) return;
  if (playing.value === target) { stopPlayback(); return; }
  stopPlayback(); processing.value = true; error.value = '';
  const currentRevision = revision;
  try {
    const blob = target === 'default' ? defaultSound(kind.value) : target === 'custom' && slot.value?.custom ? await getAudio(slot.value.custom.id) : buffer.value ? await trimAudio(buffer.value, Number(trimStart.value), Number(trimEnd.value)) : null;
    if (!blob || disposed || currentRevision !== revision) return;
    audioUrl = URL.createObjectURL(blob); audio = new Audio(audioUrl); audio.volume = .6;
    audio.onended = stopPlayback;
    audio.onerror = () => { error.value = '音频播放失败，请重新导入或更换格式'; stopPlayback(); };
    await audio.play(); playing.value = target;
  } catch (reason) { stopPlayback(); message(reason); }
  finally { processing.value = false; }
}

async function prepare(blob: Blob, name: string, imported = true, presetId = '') {
  stopPlayback(); error.value = ''; processing.value = true;
  const currentRevision = revision;
  try {
    if (imported) validateAudio(name, blob.size);
    if (imported) validateAudio(name, blob.size, await audioDuration(blob));
    const decoded = await decodeAudio(blob);
    if (imported) validateAudio(name, blob.size, decoded.duration);
    else if (decoded.duration <= 1) throw new Error('录音需要超过 1 秒，请重新录制');
    if (disposed || currentRevision !== revision) return;
    buffer.value = decoded; candidateName.value = name.replace(/\.[^.]+$/, '') + '.wav'; sourceBytes.value = blob.size; selectedPresetId.value = presetId;
    trimStart.value = '0'; trimEnd.value = String(Math.floor(Math.min(decoded.duration, 240) * 100) / 100);
  } catch (reason) { message(reason); }
  finally { processing.value = false; }
}

async function choosePreset(presetId: string) {
  if (!kind.value || locked.value || !vehicle.isBound) return;
  const preset = soundPresets[kind.value].find(item => item.id === presetId);
  if (!preset) { error.value = '预埋音效不存在，请重新选择'; return; }
  await prepare(presetSound(kind.value, preset.id), `${preset.label}.wav`, false, preset.id);
}

function chooseFile() {
  if (locked.value || !vehicle.isBound) return;
  if (typeof document === 'undefined') { error.value = '此演示的文件导入需要在 H5 浏览器中使用'; return; }
  fileInput?.remove();
  fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = '.mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav';
  fileInput.setAttribute('data-testid', 'audio-file-input'); fileInput.style.display = 'none';
  fileInput.onchange = () => { const file = fileInput?.files?.[0]; fileInput?.remove(); fileInput = undefined; if (file) void prepare(file, file.name); };
  fileInput.addEventListener('cancel', () => { fileInput?.remove(); fileInput = undefined; }, { once: true });
  document.body.appendChild(fileInput); fileInput.click();
}

function stopRecording() {
  if (recordTimer) clearInterval(recordTimer); recordTimer = undefined;
  if (recorder?.state === 'recording') recorder.stop();
  stream?.getTracks().forEach(track => track.stop()); stream = undefined; recording.value = false;
}

async function startRecording() {
  if (locked.value || !vehicle.isBound) return;
  error.value = ''; processing.value = true; stopPlayback();
  const currentRevision = revision;
  try {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('当前环境无法录音，请在 HTTPS 或 localhost 中授权麦克风，或使用文件导入');
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (disposed || currentRevision !== revision) { stream.getTracks().forEach(track => track.stop()); return; }
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => { error.value = '录音被中断，请检查麦克风后重试'; stopRecording(); };
    recorder.onstop = () => {
      if (!disposed && currentRevision === revision) void prepare(new Blob(chunks, { type: mimeType || recorder?.mimeType }), `录音-${Date.now()}.wav`, false);
    };
    recorder.start(); recording.value = true; recordedSeconds.value = 0;
    const startedAt = Date.now();
    recordTimer = setInterval(() => { recordedSeconds.value = Math.floor((Date.now() - startedAt) / 1000); if (recordedSeconds.value >= 239) stopRecording(); }, 200);
  } catch (reason) {
    stream?.getTracks().forEach(track => track.stop());
    error.value = reason instanceof DOMException && reason.name === 'NotAllowedError' ? '麦克风权限未开启，请允许访问后重试，也可以直接导入文件' : reason instanceof Error ? reason.message : '无法启动录音';
  } finally { processing.value = false; }
}

async function upload() {
  if (!kind.value || !buffer.value || trimError.value || locked.value) return;
  const replaces = Boolean(slot.value?.custom);
  const confirmed = await feedback.confirm({ title: replaces ? '替换这条自定义音效？' : '上传到本车？', content: replaces ? '每种功能仅保留一条自定义音效。上传成功后替换旧音频；需再次点击“使用自定义”启用。失败保留原配置。' : '音频仅保存到本车。当前为模拟传输，真实车端上传等待协议接入。', confirmText: '确认上传', cancelText: '取消' });
  if (!confirmed) return;
  error.value = ''; processing.value = true; stopPlayback();
  const currentRevision = revision;
  try {
    const blob = await trimAudio(buffer.value, Number(trimStart.value), Number(trimEnd.value));
    if (disposed || currentRevision !== revision) return;
    await experience.uploadSound(kind.value, { id: `${experience.vehicleId}/${kind.value}/${Date.now()}`, name: candidateName.value, bytes: blob.size, duration: duration.value, createdAt: Date.now() }, blob);
    buffer.value = null; selectedPresetId.value = ''; feedback.toast({ message: '模拟上传成功，可试听并使用自定义音效', tone: 'success' });
  } catch (reason) { message(reason); }
  finally { processing.value = false; }
}

async function activate(active: 'default' | 'custom') {
  if (!kind.value) return;
  error.value = '';
  try { await experience.activateSound(kind.value, active); feedback.toast({ message: active === 'default' ? '已恢复系统默认（演示）' : '已使用自定义音效（演示）', tone: 'success' }); }
  catch (reason) { message(reason); }
}

async function remove() {
  if (!kind.value) return;
  const confirmed = await feedback.confirm({ title: '删除自定义音效？', content: '删除后恢复系统默认音效，此音频需要重新导入才能恢复。', confirmText: '删除', cancelText: '取消', tone: 'danger' });
  if (!confirmed) return;
  try { stopPlayback(); await experience.removeSound(kind.value); feedback.toast({ message: '自定义音频已删除，恢复默认（演示）', tone: 'success' }); }
  catch (reason) { message(reason); }
}

function cleanup() { disposed = true; revision += 1; stopRecording(); stopPlayback(); fileInput?.remove(); buffer.value = null; selectedPresetId.value = ''; }
watch(() => experience.vehicleId, () => { revision += 1; stopRecording(); stopPlayback(); buffer.value = null; selectedPresetId.value = ''; error.value = '车辆已变化，请重新选择本车音频'; });
onUnload(cleanup); onUnmounted(cleanup);
</script>
<template>
  <view class="page-shell experience-page">
    <AppHeader :title="selected?.label || '音效设置'" back />
    <view class="experience-content">
      <ExperienceNotice />
      <template v-if="selected && slot">
        <view class="experience-card experience-stack">
          <view class="experience-row"><view class="experience-emblem"><ExperienceIcon kind="sound" /></view><view class="experience-stack"><text class="experience-title">{{ selected.label }}</text><text class="experience-copy">{{ selected.copy }}</text></view></view>
          <text class="experience-tag experience-tag--green" data-testid="sound-active">{{ slot.active === 'custom' ? '当前使用：自定义音效' : '当前使用：系统默认' }}</text>
          <text class="experience-copy">配置仅保存到 {{ vehicleLabel }}，切换车辆不会共用或覆盖音效。</text>
          <view class="experience-actions"><button class="experience-button" :disabled="locked" @click="play('default')"><UiIcon :name="playing === 'default' ? 'Pause' : 'Play'" tone="info" :size="16" />{{ playing === 'default' ? '停止试听' : '试听默认' }}</button><button class="experience-button" data-testid="sound-default" :disabled="locked || !vehicle.isConnected || slot.active === 'default'" @click="activate('default')">使用系统默认</button></view>
          <text class="experience-copy">默认试听为演示提示音，实际车辆预置音效由硬件提供。</text>
        </view>
        <view v-if="slot.custom" class="experience-card experience-stack" data-testid="sound-custom">
          <text class="experience-title">自定义音频 · 1 / 1</text><text class="experience-copy">{{ slot.custom.name }}<br />{{ slot.custom.duration.toFixed(2) }} 秒 · {{ (slot.custom.bytes / 1024 / 1024).toFixed(2) }} MB</text>
          <view class="experience-actions"><button class="experience-button" :disabled="locked" @click="play('custom')">{{ playing === 'custom' ? '停止试听' : '试听自定义' }}</button><button class="experience-button experience-button--primary" data-testid="sound-use" :disabled="locked || !vehicle.isConnected || slot.active === 'custom'" @click="activate('custom')">使用自定义</button></view>
          <button class="experience-button experience-button--danger" data-testid="sound-delete" :disabled="locked || !vehicle.isConnected" @click="remove">删除自定义音效</button>
        </view>
        <view class="experience-card experience-stack" data-testid="sound-presets">
          <view class="experience-row"><view class="experience-stack"><text class="experience-title">预埋音效库</text><text class="experience-copy">选择一条预埋音效，再截取需要的片段</text></view><text class="experience-tag">{{ presets.length }} 条</text></view>
          <view class="sound-preset-list" role="list">
            <button v-for="preset in presets" :key="preset.id" class="sound-preset" :class="{ active: selectedPresetId === preset.id }" :disabled="locked || !vehicle.isBound" data-testid="sound-preset" @click="choosePreset(preset.id)">
              <view class="sound-preset__icon"><UiIcon name="Play" tone="info" :size="18" /></view><view class="experience-stack"><text class="experience-title">{{ preset.label }}</text><text class="experience-copy">{{ preset.copy }} · {{ preset.duration.toFixed(1) }} 秒</text></view><UiIcon name="ChevronRight" tone="muted" :size="16" />
            </button>
          </view>
        </view>
        <view class="experience-card experience-stack">
          <text class="experience-title">{{ slot.custom ? '替换音频' : '添加自己的声音' }}</text><text class="experience-copy">MP3 / M4A / WAV，1–240 秒（不含 1 秒），不超过 30 MB。录音会转为 WAV。</text>
          <view class="experience-actions"><button class="experience-button" data-testid="audio-import" :disabled="locked || !vehicle.isBound" @click="chooseFile"><UiIcon name="ArrowUpFromLine" tone="info" :size="18" />手机导入</button><button class="experience-button" data-testid="audio-record" :disabled="(locked && !recording) || !vehicle.isBound" @click="recording ? stopRecording() : startRecording()"><ExperienceIcon kind="mic" />{{ recording ? `停止 · ${recordedSeconds}s` : '录制音频' }}</button></view>
          <text v-if="processing && !experience.busy" class="experience-copy" role="status">正在处理音频，请稍候…</text>
        </view>
        <view v-if="buffer" class="experience-card experience-stack" data-testid="audio-trim">
          <view class="experience-row"><text class="experience-title">裁剪与试听</text><text v-if="selectedPresetId" class="experience-tag experience-tag--green">来自预埋音效</text></view><text class="experience-copy">{{ candidateName }}<br />原始 {{ buffer.duration.toFixed(2) }} 秒 · {{ (sourceBytes / 1024 / 1024).toFixed(2) }} MB</text>
          <view class="experience-actions"><view class="experience-field"><text class="experience-label">开始（秒）</text><input v-model="trimStart" class="experience-input" type="digit" aria-label="裁剪开始秒数" :disabled="locked" /></view><view class="experience-field"><text class="experience-label">结束（秒）</text><input v-model="trimEnd" class="experience-input" type="digit" aria-label="裁剪结束秒数" :disabled="locked" /></view></view>
          <text class="experience-copy">选中 {{ duration.toFixed(2) }} 秒。传输前转为单声道 WAV；实际容量在上传后显示。</text>
          <text v-if="trimError" class="experience-error" role="alert">{{ trimError }}</text>
          <view class="experience-actions"><button class="experience-button" :disabled="locked || Boolean(trimError)" @click="play('candidate')">{{ playing === 'candidate' ? '停止试听' : '试听裁剪片段' }}</button><button class="experience-button experience-button--primary" data-testid="audio-upload" :disabled="locked || !vehicle.isConnected || Boolean(trimError)" @click="upload">{{ error ? '手动重试上传' : '确认并上传' }}</button></view>
          <text class="experience-copy">未上传的音频仅在此页暂存，离开页面将丢弃。</text>
        </view>
        <view v-if="experience.busy === 'sound.upload'" class="experience-card experience-stack" role="status"><text class="experience-title">模拟上传 {{ experience.progress }}%</text><view class="experience-progress"><view :style="{ width: `${experience.progress}%` }" /></view><text class="experience-copy">请保持页面与连接，不会自动重传。</text></view>
        <text v-if="error" class="experience-error" data-testid="sound-error" role="alert">{{ error }}</text>
        <ExperienceDebug />
      </template>
      <text v-else class="experience-error">音效类型无效，请返回后重新选择。</text>
    </view>
  </view>
</template>
<style scoped>
.sound-preset-list { display: grid; gap: 8px; }
.sound-preset { display: flex; min-height: 64px; padding: 10px 12px; align-items: center; gap: 10px; border: 1px solid var(--divider); border-radius: 12px; background: var(--surface-muted); color: var(--ink); text-align: left; }
.sound-preset.active { border-color: var(--bs-vi-sys-color-action-info); background: var(--bs-vi-sys-color-status-info-background); }
.sound-preset:disabled { opacity: .45; }
.sound-preset .experience-stack { min-width: 0; flex: 1; }
.sound-preset .experience-title { font-size: 13px; }
.sound-preset__icon { display: flex; width: 36px; height: 36px; flex: 0 0 36px; align-items: center; justify-content: center; border-radius: 10px; background: var(--surface); }
</style>
