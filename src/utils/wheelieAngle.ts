export const WHEELIE_ANGLE_MIN = 20;
export const WHEELIE_ANGLE_MAX = 70;
export const WHEELIE_ANGLE_STEP = 5;
export const WHEELIE_ANGLE_DEFAULT = 55;
export const WHEELIE_ANGLE_TICKS = [20, 30, 40, 50, 60, 70] as const;

export function normalizeWheelieAngle(value: unknown): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return WHEELIE_ANGLE_DEFAULT;

  const clampedValue = Math.max(WHEELIE_ANGLE_MIN, Math.min(WHEELIE_ANGLE_MAX, numericValue));
  return Math.round(clampedValue / WHEELIE_ANGLE_STEP) * WHEELIE_ANGLE_STEP;
}
