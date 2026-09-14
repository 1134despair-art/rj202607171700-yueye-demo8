const PREFIX = "binsen.raven.v7.";

export const storageKeys = {
  vehicle: `${PREFIX}vehicle`,
  controls: `${PREFIX}controls`,
  preferences: `${PREFIX}preferences`,
  ota: `${PREFIX}ota`,
  diagnosis: `${PREFIX}diagnosis`,
  updateMessages: `${PREFIX}updateMessages`,
  autoConnectVehicle: `${PREFIX}autoConnectVehicle`,
  telemetryScenario: `${PREFIX}telemetryScenario`,
  wheelCircumferenceConfigVersion: `${PREFIX}wheelCircumferenceConfigVersion`,
  cacheBytes: `${PREFIX}cacheBytes`,
};

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = uni.getStorageSync(key);
    return value === "" || value === undefined || value === null ? fallback : (value as T);
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  uni.setStorageSync(key, value);
}

export function clearDemoStorage() {
  Object.values(storageKeys).forEach((key) => uni.removeStorageSync(key));
}
