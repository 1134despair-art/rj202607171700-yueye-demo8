import type { ControlSettings, FirmwarePackage, OtaManifestEntry, OtaSession, Telemetry, Vehicle, VehicleModule } from "@/types";
import { WHEELIE_ANGLE_DEFAULT } from "@/utils/wheelieAngle";
import { WHEEL_CIRCUMFERENCE_DEFAULT } from "@/utils/wheelCircumference";

export const APP_CURRENT_VERSION = "1.0.0";
export const APP_TARGET_VERSION = "1.1.0";

export const availableVehicles: Vehicle[] = [
  { id: "vehicle-raven", model: "BX-01", name: "RAVEN", displayName: "RAVEN", vin: "LBBX0124070888001", serialNumber: "BX01-24070888", bluetoothName: "BINSEN-BX01", firmware: "1.4.2" },
  { id: "vehicle-trail", model: "BX-02", name: "TRAIL X", displayName: "TRAIL X", vin: "LBBX0524070916001", serialNumber: "BX02-24070916", bluetoothName: "BINSEN-BX02", firmware: "1.3.8" },
];

export const defaultControls: ControlSettings = {
  rideGear: "sport",
  autoPark: true,
  tipOverCutoff: true,
  sideStandSensor: true,
  hillDescent: false,
  regenLevel: 2,
  brakeRegenLevel: 2,
  coastingRegenLevel: 1,
  tcsLevel: 2,
  brakeCutoff: true,
  electronicParking: true,
  creepLevel: 1,
  chargingPower: 1200,
  driftMode: false,
  emergencyCharging: false,
  wheelieEnabled: false,
  wheelieMode: "off",
  wheelieMaxAngle: WHEELIE_ANGLE_DEFAULT,
  speedLimit: 45,
  mPowerPercent: 80,
  mTorquePercent: 75,
  mSpeedLimit: 60,
  mCoastingRegenLevel: 1,
  mBrakeRegenLevel: 2,
  mBrakeCutoff: true,
  mTipOverCutoff: true,
  wheelCircumference: WHEEL_CIRCUMFERENCE_DEFAULT,
  powerCurve: [8, 17, 27, 39, 52, 64, 74, 83, 92, 100],
  mPowerCurve: [8, 17, 27, 39, 52, 64, 74, 83, 92, 100],
};

export const defaultTelemetry: Telemetry = {
  totalMileage: 3151,
  rideGear: "sport",
  soc: 78,
  soh: 96,
  voltage: 72.4,
  batteryCapacity: 40,
  batteryTemp: 31,
  motorTemp: 44,
  controllerTemp: 39,
  current: 18.6,
  cycles: 128,
  range: 86,
};

export const defaultOta: OtaSession = {
  currentVersion: "1.4.2",
  targetVersion: "1.5.0",
  stage: "idle",
  progress: 0,
  releaseNotes: ["ota.notes.throttle", "ota.notes.bms", "ota.notes.startup"],
  selectedModuleId: "controller",
  checkState: "idle",
  verificationState: "idle",
  rollbackState: "idle",
};

export const defaultVehicleModules: VehicleModule[] = [
  { id: "display", name: "DISPLAY", hardwareModel: "BX-DISPLAY-01", currentVersion: "2.3.1", targetVersion: "2.4.0", hasUpdate: true },
  { id: "controller", name: "CONTROLLER", hardwareModel: "BX-CONTROLLER-01", currentVersion: "1.4.2", targetVersion: "1.5.0", hasUpdate: true },
  { id: "bms", name: "BMS", hardwareModel: "BX-BMS-01", currentVersion: "3.8.0", targetVersion: "3.8.0", hasUpdate: false },
];

export const firmwarePackages: FirmwarePackage[] = [
  { moduleId: "display", version: "2.4.0", fileName: "binsen-display-2.4.0.bin", sizeMb: 3.6, checksum: "A17C-92F0-7E31-4B2D", releaseNotes: ["ota.notes.display", "ota.notes.startup"] },
  { moduleId: "controller", version: "1.5.0", fileName: "binsen-controller-1.5.0.bin", sizeMb: 4.8, checksum: "7D94-2C11-A8F3-60BE", releaseNotes: ["ota.notes.throttle", "ota.notes.bms", "ota.notes.startup"] },
  { moduleId: "bms", version: "3.8.0", fileName: "binsen-bms-3.8.0.bin", sizeMb: 2.1, checksum: "0E86-FA12-5C90-77D4", releaseNotes: ["ota.notes.bms"] },
];

const otaModuleModels = {
  display: "BX-DISPLAY-01",
  controller: "BX-CONTROLLER-01",
  bms: "BX-BMS-01",
} as const;

// Replace this local manifest with the official release API when it becomes available.
export const otaManifest: OtaManifestEntry[] = firmwarePackages.map((item) => ({
  ...item,
  enabled: true,
  compatibleVehicleModels: ["BX-01", "BX-02"],
  moduleModel: otaModuleModels[item.moduleId],
}));
