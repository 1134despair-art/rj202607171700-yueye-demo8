export type Language = "en" | "zh";
export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemeMode, "system">;
export type BleState = "idle" | "scanning" | "connecting" | "connected" | "failed";
export type OtaStage = "idle" | "checking" | "available" | "downloading" | "verifying" | "transferring" | "paused" | "installing" | "restarting" | "success" | "failed" | "rollback";
export type WheelieMode = "off" | "practice" | "advanced" | "master" | "custom";
export type SpeedLimit = 0 | 25 | 45;
export type TelemetryScenario = "normal" | "overheat" | "overvoltage" | "no-data";
export type ModuleRuntimeStatus = "normal" | "warning" | "no-data";
export type ControlReadState = "idle" | "loading" | "success" | "failed";
export type DiagnosisScenario = "normal" | "motor-sensor" | "bms-overheat" | "unknown";
export type OtaCheckState = "idle" | "checking" | "updates" | "none" | "failed";
export type OtaVerificationState = "idle" | "checking" | "success" | "failed";
export type OtaRollbackState = "idle" | "running" | "success" | "service-required";
export type OtaModuleId = "display" | "controller" | "bms";
export type OtaScenario = "normal" | "no-update" | "check-failed" | "verify-failed" | "transfer-failed" | "rollback-failed";
export type AppUpdateScenario = "available" | "latest" | "failed";
export type UpdateMessageType = "app" | "firmware";

export interface Vehicle {
  id: string;
  model: string;
  name: string;
  displayName?: string;
  vin?: string;
  serialNumber: string;
  bluetoothName: string;
  firmware: string;
}

export interface ControlSettings {
  autoPark: boolean;
  tipOverCutoff: boolean;
  sideStandSensor: boolean;
  hillDescent: boolean;
  regenLevel: number;
  wheelieMode: WheelieMode;
  wheelieMaxAngle: number;
  speedLimit: SpeedLimit;
  wheelCircumference: number;
  powerCurve: number[];
}

export interface Telemetry {
  soc: number;
  soh: number;
  voltage: number;
  batteryCapacity: number;
  batteryTemp: number;
  motorTemp: number;
  controllerTemp: number;
  current: number;
  cycles: number;
  range: number;
}

export interface DiagnosisItem {
  id: string;
  module: "ECU" | "BMS" | "Motor" | "Controller";
  status: "pending" | "checking" | "ok" | "warning";
  code?: string;
  message?: string;
  advice?: string;
}

export interface DiagnosisResult {
  id: string;
  createdAt: string;
  healthy: boolean;
  items: DiagnosisItem[];
}

export interface OtaSession {
  currentVersion: string;
  targetVersion: string;
  stage: OtaStage;
  progress: number;
  releaseNotes: string[];
  selectedModuleId: OtaModuleId;
  checkState: OtaCheckState;
  verificationState: OtaVerificationState;
  rollbackState: OtaRollbackState;
  error?: string;
}

export interface VehicleModule {
  id: OtaModuleId;
  name: string;
  hardwareModel: string;
  currentVersion: string;
  targetVersion: string;
  hasUpdate: boolean;
}

export interface FirmwarePackage {
  moduleId: OtaModuleId;
  version: string;
  fileName: string;
  sizeMb: number;
  checksum: string;
  releaseNotes: string[];
}

export interface OtaManifestEntry extends FirmwarePackage {
  enabled: boolean;
  compatibleVehicleModels: string[];
  moduleModel: string;
}

export interface UpdateMessage {
  type: UpdateMessageType;
  unread: boolean;
  versionKeys: string[];
}

export interface AppPreferences {
  language: Language;
  languageConfigVersion: number;
  themeMode: ThemeMode;
  wheelieDisclaimerVersion: number;
  reduceMotion: boolean;
  debugUnlocked: boolean;
  abnormalScenario: boolean;
  telemetryScenario: TelemetryScenario;
  diagnosisScenario: DiagnosisScenario;
  otaScenario: OtaScenario;
  appUpdateScenario: AppUpdateScenario;
}
