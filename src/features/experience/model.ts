export type SoundKind = 'startup' | 'horn' | 'reverse';
export const soundKinds: Array<{ id: SoundKind; label: string; copy: string }> = [
  { id: 'startup', label: '开机音效', copy: '车辆上电时，响起专属欢迎音' },
  { id: 'horn', label: '鸣笛音效', copy: '保留默认鸣笛，也可以换成自己的声音' },
  { id: 'reverse', label: '倒车音效', copy: '倒车时播放本车提示音' },
];
export interface SoundPreset { id: string; label: string; copy: string; duration: number }
export const soundPresets: Record<SoundKind, SoundPreset[]> = {
  startup: [
    { id: 'trail-awake', label: '林道唤醒', copy: '三段渐进提示，适合日常启动', duration: 5.2 },
    { id: 'energy-rise', label: '能量上升', copy: '短促上扬，反馈更利落', duration: 3.8 },
    { id: 'calm-start', label: '沉稳启程', copy: '低频渐入，氛围更克制', duration: 6.4 },
  ],
  horn: [
    { id: 'trail-alert', label: '林道提醒', copy: '清晰单段提示，辨识度高', duration: 2.8 },
    { id: 'double-alert', label: '双段提醒', copy: '双段节奏，适合近距离提示', duration: 3.6 },
    { id: 'long-alert', label: '穿透长鸣', copy: '持续时间更长，适合开阔路段', duration: 4.8 },
  ],
  reverse: [
    { id: 'steady-reverse', label: '匀速倒车', copy: '均匀间隔，状态容易识别', duration: 6.0 },
    { id: 'fast-reverse', label: '快速倒车', copy: '提示更紧凑，响应更直接', duration: 4.6 },
    { id: 'soft-reverse', label: '柔和倒车', copy: '音色更轻，降低持续干扰', duration: 7.2 },
  ],
};
export interface SoundAsset { id: string; name: string; duration: number; bytes: number; createdAt: number }
export interface SoundSlot { custom: SoundAsset | null; active: 'default' | 'custom' }
export interface SoundSettings {
  speakerEnabled: boolean;
  throttleWaveEnabled: boolean;
  startupEnabled: boolean;
  volume: number;
}
export function defaultSoundSettings(): SoundSettings {
  return { speakerEnabled: true, throttleWaveEnabled: false, startupEnabled: true, volume: 60 };
}
export function validateSoundSettings(settings: SoundSettings) {
  if (!settings || typeof settings.speakerEnabled !== 'boolean' || typeof settings.throttleWaveEnabled !== 'boolean' || typeof settings.startupEnabled !== 'boolean') throw new Error('音频开关配置无效');
  if (!Number.isInteger(settings.volume) || settings.volume < 0 || settings.volume > 100) throw new Error('音量需要为 0–100 的整数');
}
export const lightEffects = [
  { id: 'steady', label: '常亮' }, { id: 'breathe', label: '呼吸' }, { id: 'blink', label: '闪烁' },
  { id: 'flow', label: '流水' }, { id: 'gradient', label: '渐变' },
] as const;
export type LightEffect = typeof lightEffects[number]['id'];
export interface LightZone { id: number; enabled: boolean; color: string; brightness: number; speed: number; effect: LightEffect }
export interface LightConfig { zones: LightZone[] }
export function defaultLights(): LightConfig {
  return { zones: Array.from({ length: 5 }, (_, index) => ({ id: index + 1, enabled: true, color: '#49A857', brightness: 60, speed: 40, effect: 'breathe' })) };
}
export function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
export interface SignalDefinition {
  id: string; label: string; unit: string; min: number; max: number;
  stateLabels?: readonly [off: string, on: string];
}
const defineSignal = <Id extends string>(definition: SignalDefinition & { id: Id }) => definition;
export const signals = [
  defineSignal({ id: 'rpm', label: '电机转速', unit: 'rpm', min: 0, max: 30000 }),
  defineSignal({ id: 'throttle', label: '油门转把开度', unit: '%', min: 0, max: 100 }),
  defineSignal({ id: 'frontBrake', label: '前刹车压力', unit: '%', min: 0, max: 100 }),
  defineSignal({ id: 'rearBrake', label: '后刹车压力', unit: '%', min: 0, max: 100 }),
  defineSignal({ id: 'power', label: '输出功率', unit: 'kW', min: 0, max: 200 }),
  defineSignal({ id: 'wheelie', label: '翘头角度', unit: '°', min: 0, max: 90 }),
  defineSignal({ id: 'ignition', label: '电锁状态', unit: '开关', min: 0, max: 1, stateLabels: ['车辆下电', '车辆上电'] }),
  defineSignal({ id: 'highBeam', label: '远光灯开关', unit: '开关', min: 0, max: 1, stateLabels: ['远光关闭', '远光开启'] }),
  defineSignal({ id: 'leftTurn', label: '左转向开关', unit: '开关', min: 0, max: 1, stateLabels: ['左转向关闭', '左转向开启'] }),
  defineSignal({ id: 'rightTurn', label: '右转向开关', unit: '开关', min: 0, max: 1, stateLabels: ['右转向关闭', '右转向开启'] }),
  defineSignal({ id: 'hazard', label: '双闪开关', unit: '开关', min: 0, max: 1, stateLabels: ['双闪关闭', '双闪开启'] }),
  defineSignal({ id: 'hornSwitch', label: '鸣笛开关', unit: '开关', min: 0, max: 1, stateLabels: ['鸣笛松开', '鸣笛按下'] }),
  defineSignal({ id: 'modeSwitch', label: '模式切换开关', unit: '开关', min: 0, max: 1, stateLabels: ['未切换', '触发切换'] }),
  defineSignal({ id: 'combinationSwitch', label: '组合开关原始状态', unit: '状态码', min: 0, max: 255 }),
  defineSignal({ id: 'current', label: '电池电流', unit: 'A', min: -500, max: 500 }),
  defineSignal({ id: 'temperature', label: '电机控制器温度', unit: '°C', min: -40, max: 180 }),
  defineSignal({ id: 'motorTemperature', label: '电机温度', unit: '°C', min: -40, max: 220 }),
  defineSignal({ id: 'batteryTemperature', label: '电池温度', unit: '°C', min: -40, max: 100 }),
  defineSignal({ id: 'voltage', label: '电池电压', unit: 'V', min: 0, max: 200 }),
  defineSignal({ id: 'pitch', label: '车身 X 轴角度', unit: '°', min: -180, max: 180 }),
  defineSignal({ id: 'roll', label: '车身 Y 轴角度', unit: '°', min: -180, max: 180 }),
  defineSignal({ id: 'acceleration', label: '车身加速度', unit: 'm/s²', min: -100, max: 100 }),
  defineSignal({ id: 'sideStand', label: '边撑状态', unit: '开关', min: 0, max: 1, stateLabels: ['边撑收起', '边撑放下'] }),
  defineSignal({ id: 'speed', label: '车速', unit: 'km/h', min: 0, max: 200 }),
] as const;
export type SignalId = typeof signals[number]['id'];
export type Compare = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
export const comparisons: Array<{ id: Compare; label: string }> = [
  { id: 'gt', label: '大于' }, { id: 'gte', label: '大于等于' }, { id: 'lt', label: '小于' },
  { id: 'lte', label: '小于等于' }, { id: 'eq', label: '等于' },
];
export interface LightRule {
  id: string; name: string; enabled: boolean; priority: number; createdAt: number;
  condition: { signal: SignalId; compare: Compare; value: number };
  lights: LightConfig; sound: SoundKind | 'none';
}
export interface ExperienceProfile { sounds: Record<SoundKind, SoundSlot>; soundSettings: SoundSettings; lights: LightConfig; rules: LightRule[] }
export function defaultProfile(): ExperienceProfile {
  return { sounds: { startup: { custom: null, active: 'default' }, horn: { custom: null, active: 'default' }, reverse: { custom: null, active: 'default' } }, soundSettings: defaultSoundSettings(), lights: defaultLights(), rules: [] };
}
export function normalizeProfile(value: unknown): ExperienceProfile {
  const fallback = defaultProfile();
  if (!value || typeof value !== 'object') return fallback;
  const source = value as Partial<ExperienceProfile>;
  const settings = source.soundSettings;
  return {
    sounds: {
      startup: { ...fallback.sounds.startup, ...(source.sounds?.startup || {}) },
      horn: { ...fallback.sounds.horn, ...(source.sounds?.horn || {}) },
      reverse: { ...fallback.sounds.reverse, ...(source.sounds?.reverse || {}) },
    },
    soundSettings: {
      speakerEnabled: typeof settings?.speakerEnabled === 'boolean' ? settings.speakerEnabled : fallback.soundSettings.speakerEnabled,
      throttleWaveEnabled: typeof settings?.throttleWaveEnabled === 'boolean' ? settings.throttleWaveEnabled : fallback.soundSettings.throttleWaveEnabled,
      startupEnabled: typeof settings?.startupEnabled === 'boolean' ? settings.startupEnabled : fallback.soundSettings.startupEnabled,
      volume: Number.isInteger(settings?.volume) && Number(settings?.volume) >= 0 && Number(settings?.volume) <= 100 ? Number(settings?.volume) : fallback.soundSettings.volume,
    },
    lights: source.lights?.zones?.length === 5 ? clone(source.lights) : fallback.lights,
    rules: Array.isArray(source.rules) ? clone(source.rules) : [],
  };
}
export function validateLights(config: LightConfig) {
  if (!config || config.zones.length !== 5 || new Set(config.zones.map(zone => zone.id)).size !== 5) throw new Error('必须配置五个不同的灯光分区');
  for (const zone of config.zones) {
    if (!Number.isInteger(zone.id) || zone.id < 1 || zone.id > 5 || typeof zone.enabled !== 'boolean') throw new Error('灯区配置无效');
    if (!/^#[0-9a-f]{6}$/i.test(zone.color)) throw new Error('请输入有效的六位颜色值，例如 #49A857');
    if (![zone.brightness, zone.speed].every(value => Number.isFinite(value) && value >= 0 && value <= 100)) throw new Error('亮度和速度需要在 0–100 之间');
    if (!lightEffects.some(effect => effect.id === zone.effect)) throw new Error('请选择有效灯效');
  }
}
export function validateRule(rule: LightRule) {
  if (!rule.name.trim() || rule.name.length > 24) throw new Error('规则名称需要 1–24 个字符');
  if (!Number.isInteger(rule.priority) || rule.priority < 1 || rule.priority > 99) throw new Error('优先级需要为 1–99 的整数');
  const signal = signals.find(item => item.id === rule.condition.signal);
  if (!signal || !Number.isFinite(rule.condition.value) || rule.condition.value < signal.min || rule.condition.value > signal.max) throw new Error('触发数值超出当前信号范围');
  if (!comparisons.some(item => item.id === rule.condition.compare)) throw new Error('请选择有效比较条件');
  if (signal.unit === '开关' && (rule.condition.compare !== 'eq' || ![0, 1].includes(rule.condition.value))) throw new Error('开关条件只能为开启或关闭');
  if (!['none', 'startup', 'horn', 'reverse'].includes(rule.sound)) throw new Error('请选择本车音效');
  validateLights(rule.lights);
}
export function matchingRule(rules: LightRule[], frame: Partial<Record<SignalId, number>>) {
  return rules.filter(rule => {
    const actual = frame[rule.condition.signal];
    if (!rule.enabled || actual === undefined || !Number.isFinite(actual)) return false;
    const { value, compare } = rule.condition;
    return compare === 'gt' ? actual > value : compare === 'gte' ? actual >= value : compare === 'lt' ? actual < value : compare === 'lte' ? actual <= value : actual === value;
  }).sort((first, second) => first.priority - second.priority || first.createdAt - second.createdAt)[0] || null;
}
export function describeRule(rule: LightRule) {
  const signal = signals.find(item => item.id === rule.condition.signal)!;
  if (signal.unit === '开关') return `${signal.label} · ${(signal.stateLabels || ['关闭', '开启'])[rule.condition.value ? 1 : 0]}`;
  return `${signal.label} ${comparisons.find(item => item.id === rule.condition.compare)?.label} ${rule.condition.value} ${signal.unit}`;
}
export const MAX_AUDIO_BYTES = 30 * 1024 * 1024;
export function validateAudio(name: string, bytes: number, duration?: number) {
  if (!/\.(mp3|m4a|wav)$/i.test(name)) throw new Error('仅支持 MP3、M4A、WAV 格式');
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_AUDIO_BYTES) throw new Error('音频文件不能为空，且不能超过 30 MB');
  if (duration !== undefined && (!Number.isFinite(duration) || duration <= 1 || duration > 240)) throw new Error('音频时长必须大于 1 秒且不超过 240 秒');
}
export function validateTrim(start: number, end: number, duration: number) {
  if (![start, end, duration].every(Number.isFinite) || start < 0 || end > duration || end <= start) throw new Error('请检查裁剪起止时间');
  if (end - start <= 1 || end - start > 240) throw new Error('裁剪后时长必须大于 1 秒且不超过 240 秒');
}
export interface NearbyVehicle { id: string; name: string; model: string; response: 'accepted' | 'rejected' }
export interface TeamPlan { lights: LightConfig; sound: SoundKind | 'none' }
export interface Invitation { id: string; vehicle: NearbyVehicle; plan: TeamPlan; status: 'pending' | 'accepted' | 'rejected'; expiresAt: number }
export interface TeamSession { id: string; role: 'captain' | 'member'; captain: NearbyVehicle; members: NearbyVehicle[]; plan: TeamPlan; liveLights: LightConfig; invitations: Invitation[]; locked: boolean }
