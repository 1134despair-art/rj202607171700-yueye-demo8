import { soundPresets, validateAudio, validateTrim, type SoundKind } from './model';

export async function audioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    const timeout = setTimeout(() => finish(new Error('音频信息读取超时，请重新导入')), 10000);
    function finish(error?: Error) {
      clearTimeout(timeout); audio.onloadedmetadata = null; audio.onerror = null;
      const duration = audio.duration;
      audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url);
      if (error) reject(error); else resolve(duration);
    }
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => finish();
    audio.onerror = () => finish(new Error('此音频无法读取，请检查文件内容或换用 MP3 / WAV'));
    audio.src = url;
  });
}

export async function decodeAudio(blob: Blob): Promise<AudioBuffer> {
  if (typeof AudioContext === 'undefined') throw new Error('当前环境不支持音频处理，请使用支持 Web Audio 的浏览器');
  const context = new AudioContext();
  try { return await context.decodeAudioData(await blob.arrayBuffer()); }
  catch { throw new Error('无法读取此音频，请检查文件是否完整，或转换为 MP3 / WAV 后再试'); }
  finally { await context.close(); }
}

function encodeWav(buffer: AudioBuffer): Blob {
  const samples = buffer.getChannelData(0);
  const result = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(result);
  const writeLabel = (offset: number, value: string) => Array.from(value).forEach((letter, index) => view.setUint8(offset + index, letter.charCodeAt(0)));
  writeLabel(0, 'RIFF'); view.setUint32(4, result.byteLength - 8, true); writeLabel(8, 'WAVE'); writeLabel(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeLabel(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.round(Math.max(-1, Math.min(1, sample)) * (sample < 0 ? 32768 : 32767)), true));
  return new Blob([result], { type: 'audio/wav' });
}

export async function trimAudio(buffer: AudioBuffer, start: number, end: number): Promise<Blob> {
  validateTrim(start, end, buffer.duration);
  const context = new OfflineAudioContext(1, Math.round((end - start) * 24000), 24000);
  const source = context.createBufferSource();
  source.buffer = buffer; source.connect(context.destination); source.start(0, start, end - start);
  const blob = encodeWav(await context.startRendering());
  validateAudio('trimmed.wav', blob.size, end - start);
  return blob;
}

export function presetSound(kind: SoundKind, presetId: string): Blob {
  const presets = soundPresets[kind];
  const presetIndex = presets.findIndex(item => item.id === presetId);
  if (presetIndex < 0) throw new Error('预埋音效不存在，请重新选择');
  const preset = presets[presetIndex];
  const sampleRate = 24000;
  const buffer = new AudioBuffer({ numberOfChannels: 1, length: Math.round(preset.duration * sampleRate), sampleRate });
  const samples = buffer.getChannelData(0);
  samples.forEach((_, index) => {
    const time = index / sampleRate;
    const progress = time / preset.duration;
    const base = kind === 'startup' ? 360 + presetIndex * 55 : kind === 'horn' ? 280 + presetIndex * 35 : 480 + presetIndex * 45;
    const frequency = kind === 'startup' ? base * (1 + Math.floor(progress * (3 + presetIndex)) * .16) : base;
    const beat = kind === 'horn' ? (presetIndex === 0 ? 1 : time % (presetIndex === 1 ? 1.1 : 1.8) < (presetIndex === 1 ? .44 : 1.25) ? 1 : 0) : kind === 'reverse' ? (time % (.82 - presetIndex * .12) < (.34 - presetIndex * .04) ? 1 : 0) : 1;
    const envelope = Math.min(1, time * 24) * Math.min(1, Math.max(0, (preset.duration - time) * 18));
    const harmonic = Math.sin(2 * Math.PI * frequency * time) + .24 * Math.sin(2 * Math.PI * frequency * 1.5 * time);
    samples[index] = harmonic * .085 * beat * envelope;
  });
  return encodeWav(buffer);
}

export function defaultSound(kind: SoundKind): Blob { return presetSound(kind, soundPresets[kind][0].id); }

async function withAudioStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  if (typeof indexedDB === 'undefined') throw new Error('当前环境不支持本地音频存储');
  return new Promise<T>((resolve, reject) => {
    const request = indexedDB.open('binsen-reference-experience-audio-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('clips');
    request.onerror = () => reject(new Error('无法打开本地音频存储，请检查浏览器权限'));
    request.onblocked = () => reject(new Error('音频库被其他页面占用，请关闭重复页面后重试'));
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('clips', mode);
      let operation: IDBRequest<T>;
      try { operation = action(transaction.objectStore('clips')); }
      catch (error) { database.close(); reject(error); return; }
      transaction.oncomplete = () => { database.close(); resolve(operation.result); };
      transaction.onabort = transaction.onerror = () => { database.close(); reject(new Error('本地音频保存失败，可能是存储空间不足，请清理后重试')); };
    };
  });
}
export async function putAudio(key: string, blob: Blob) { await withAudioStore('readwrite', store => store.put(blob, key)); }
export async function getAudio(key: string): Promise<Blob> {
  const blob = await withAudioStore<Blob | undefined>('readonly', store => store.get(key));
  if (!blob) throw new Error('本地音频已被清理，请重新导入');
  return blob;
}
export async function deleteAudio(key: string) { await withAudioStore('readwrite', store => store.delete(key)); }
export async function clearAudio() { await withAudioStore('readwrite', store => store.clear()); }
