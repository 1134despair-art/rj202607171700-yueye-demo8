export const WHEEL_CIRCUMFERENCE_MIN = 1500;
export const WHEEL_CIRCUMFERENCE_MAX = 2400;
export const WHEEL_CIRCUMFERENCE_DEFAULT = 2001;
export const WHEEL_CIRCUMFERENCE_CONFIG_VERSION = 1;

export const WHEEL_CIRCUMFERENCE_PRESETS = [
  { size: 14, circumference: 1684, label: "controls.wheelPreset14" },
  { size: 18, circumference: 2001, label: "controls.wheelPreset18" },
] as const;

export const LEGACY_WHEEL_CIRCUMFERENCES = [1880, 1940, 2015] as const;

export function normalizeWheelCircumference(value: unknown): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return WHEEL_CIRCUMFERENCE_DEFAULT;
  if (numericValue < WHEEL_CIRCUMFERENCE_MIN || numericValue > WHEEL_CIRCUMFERENCE_MAX) return WHEEL_CIRCUMFERENCE_DEFAULT;
  return Math.round(numericValue);
}

export function migrateWheelCircumference(value: unknown, configVersion: number): number {
  const numericValue = Number(value);
  if (configVersion < WHEEL_CIRCUMFERENCE_CONFIG_VERSION && LEGACY_WHEEL_CIRCUMFERENCES.includes(numericValue as 1880 | 1940 | 2015)) {
    return WHEEL_CIRCUMFERENCE_DEFAULT;
  }
  return normalizeWheelCircumference(value);
}
