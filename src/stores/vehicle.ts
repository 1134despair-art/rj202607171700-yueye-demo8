import { defineStore } from "pinia";
import { tr } from "@/i18n";
import type { BleState, ChargingPower, ControlReadState, ControlSettings, ModuleRuntimeStatus, RideGear, SpeedLimit, Telemetry, TelemetryScenario, Vehicle, WheelieMode } from "@/types";
import { availableVehicles, defaultControls, defaultTelemetry } from "@/mock/seed";
import { createMockVehicleFrame, parseMockVehicleFrame } from "@/mock/vehicleProtocol";
import { readStorage, storageKeys, writeStorage } from "@/utils/storage";
import { normalizeWheelieAngle, WHEELIE_ANGLE_DEFAULT } from "@/utils/wheelieAngle";
import { migrateWheelCircumference, normalizeWheelCircumference, WHEEL_CIRCUMFERENCE_CONFIG_VERSION } from "@/utils/wheelCircumference";

let connectionTimer: ReturnType<typeof setTimeout> | undefined;
let controlTimer: ReturnType<typeof setTimeout> | undefined;
let readTimer: ReturnType<typeof setTimeout> | undefined;

type LegacyVehicle = Vehicle & { vehicleNumber?: string };

type LegacyControls = Omit<Partial<ControlSettings>, "wheelieMode" | "speedLimit"> & {
  wheelieMode?: WheelieMode | boolean;
  wheelieCustomLevel?: number;
  speedLimit?: number;
};

function restoredControls(): ControlSettings {
  const stored = readStorage<LegacyControls>(storageKeys.controls, {});
  const wheelCircumferenceConfigVersion = readStorage<number>(storageKeys.wheelCircumferenceConfigVersion, 0);
  const { wheelieCustomLevel: _legacyWheelieCustomLevel, ...storedControls } = stored;
  const wheelieMode: WheelieMode = typeof stored.wheelieMode === "boolean"
    ? (stored.wheelieMode ? "practice" : "off")
    : (["off", "practice", "advanced", "master", "custom"].includes(String(stored.wheelieMode)) ? stored.wheelieMode as WheelieMode : defaultControls.wheelieMode);
  const speedLimit: SpeedLimit = [0, 25, 45].includes(Number(stored.speedLimit)) ? Number(stored.speedLimit) as SpeedLimit : 45;
  const rideGear: RideGear = ["eco", "sport", "m", "creep"].includes(String(stored.rideGear))
    ? stored.rideGear as RideGear
    : defaultControls.rideGear;
  const powerCurve = Array.isArray(stored.powerCurve) && stored.powerCurve.length === 10 ? [...stored.powerCurve] : [...defaultControls.powerCurve];
  const mPowerCurve = Array.isArray(stored.mPowerCurve) && stored.mPowerCurve.length === 10 ? [...stored.mPowerCurve] : [...defaultControls.mPowerCurve];
  const chargingPowerOptions: ChargingPower[] = [400, 600, 800, 1000, 1200, 1400, 1600, 1800, "max"];
  const controls: ControlSettings = {
    ...defaultControls,
    ...storedControls,
    rideGear,
    wheelieMode,
    wheelieMaxAngle: stored.wheelieMaxAngle === undefined
      ? WHEELIE_ANGLE_DEFAULT
      : normalizeWheelieAngle(stored.wheelieMaxAngle),
    speedLimit,
    chargingPower: chargingPowerOptions.includes(stored.chargingPower as ChargingPower) ? stored.chargingPower as ChargingPower : defaultControls.chargingPower,
    wheelCircumference: migrateWheelCircumference(stored.wheelCircumference, wheelCircumferenceConfigVersion),
    powerCurve,
    mPowerCurve,
  };
  writeStorage(storageKeys.wheelCircumferenceConfigVersion, WHEEL_CIRCUMFERENCE_CONFIG_VERSION);
  writeStorage(storageKeys.controls, controls);
  return controls;
}

function restoredVehicle(): Vehicle | null {
  const stored = readStorage<LegacyVehicle | null>(storageKeys.vehicle, null);
  if (!stored) return null;
  const seedVehicle = availableVehicles.find((vehicle) => vehicle.id === stored.id);
  const { vehicleNumber: _legacyVehicleNumber, ...currentVehicle } = stored;
  const restored = {
    ...seedVehicle,
    ...currentVehicle,
    displayName: currentVehicle.displayName || seedVehicle?.displayName,
    vin: currentVehicle.vin || seedVehicle?.vin || currentVehicle.serialNumber,
  } as Vehicle;
  writeStorage(storageKeys.vehicle, restored);
  return restored;
}

function waitWithTimer(duration: number, kind: "connection" | "control" | "read") {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      if (kind === "connection") connectionTimer = undefined;
      if (kind === "control") controlTimer = undefined;
      if (kind === "read") readTimer = undefined;
      resolve();
    }, duration);
    if (kind === "connection") connectionTimer = timer;
    if (kind === "control") controlTimer = timer;
    if (kind === "read") readTimer = timer;
  });
}

export const useVehicleStore = defineStore("vehicle", {
  state: () => ({
    availableVehicles: availableVehicles.map((vehicle) => ({ ...vehicle })),
    vehicle: restoredVehicle(),
    bleState: "idle" as BleState,
    controls: restoredControls(),
    telemetry: { ...defaultTelemetry } as Telemetry,
    telemetryAvailable: true,
    telemetryScenario: readStorage<TelemetryScenario>(storageKeys.telemetryScenario, "normal"),
    controlReadState: "idle" as ControlReadState,
    lastSync: "home.noLiveData",
    lastTelemetryAt: null as number | null,
    autoConnectVehicleId: readStorage<string | null>(storageKeys.autoConnectVehicle, null),
    autoConnectAttempted: false,
    autoConnectSuppressed: false,
    failNextConnection: false,
    failNextRead: false,
    failNextWrite: false,
    saving: false,
  }),
  getters: {
    isBound: (state) => Boolean(state.vehicle),
    isConnected: (state) => state.bleState === "connected",
    hasTelemetry: (state) => state.bleState === "connected" && state.telemetryAvailable,
    isBatteryLow: (state) => state.bleState === "connected" && state.telemetryAvailable && Number.isFinite(state.telemetry.soc) && state.telemetry.soc >= 0 && state.telemetry.soc <= 20,
    connectionLabel: (state) => tr(`home.ignition.${state.bleState}`),
    shouldAutoConnect: (state) => Boolean(
      state.vehicle
      && (!state.autoConnectVehicleId || state.autoConnectVehicleId === state.vehicle.id)
      && !state.autoConnectAttempted
      && !state.autoConnectSuppressed
      && state.bleState === "idle",
    ),
    activeAlert: (state): "overheat" | "overvoltage" | null => {
      if (state.bleState !== "connected" || !state.telemetryAvailable) return null;
      return state.telemetryScenario === "overheat" || state.telemetryScenario === "overvoltage" ? state.telemetryScenario : null;
    },
    moduleStatuses: (state): Record<"ecu" | "bms" | "motor" | "controller", ModuleRuntimeStatus> => {
      if (state.bleState !== "connected" || !state.telemetryAvailable || state.telemetryScenario === "no-data") {
        return { ecu: "no-data", bms: "no-data", motor: "no-data", controller: "no-data" };
      }
      return {
        ecu: "normal",
        bms: state.telemetryScenario === "overheat" || state.telemetryScenario === "overvoltage" ? "warning" : "normal",
        motor: "normal",
        controller: state.telemetryScenario === "overheat" ? "warning" : "normal",
      };
    },
  },
  actions: {
    bindVehicle(vehicle: Vehicle) {
      this.lastTelemetryAt = null;
      this.vehicle = { ...vehicle };
      this.bleState = "idle";
      this.telemetryAvailable = false;
      this.autoConnectVehicleId = vehicle.id;
      this.autoConnectAttempted = false;
      this.autoConnectSuppressed = false;
      writeStorage(storageKeys.vehicle, this.vehicle);
      writeStorage(storageKeys.autoConnectVehicle, this.autoConnectVehicleId);
    },
    setVehicleDisplayName(displayName: string) {
      if (!this.vehicle) return;
      const normalized = displayName.trim().replace(/\s+/g, " ").slice(0, 12);
      if (!normalized) return;
      this.vehicle = { ...this.vehicle, displayName: normalized };
      writeStorage(storageKeys.vehicle, this.vehicle);
    },
    unbindVehicle() {
      this.lastTelemetryAt = null;
      this.clearTimers();
      this.vehicle = null;
      this.bleState = "idle";
      this.telemetryAvailable = false;
      this.autoConnectVehicleId = null;
      this.autoConnectAttempted = false;
      this.autoConnectSuppressed = false;
      uni.removeStorageSync(storageKeys.vehicle);
      uni.removeStorageSync(storageKeys.autoConnectVehicle);
    },
    async connect(automatic = false) {
      if (!this.vehicle) throw new Error(tr("controls.bindRequired"));
      this.clearConnectionTimer();
      this.autoConnectAttempted = true;
      this.bleState = "scanning";
      await waitWithTimer(550, "connection");
      this.bleState = "connecting";
      await waitWithTimer(750, "connection");
      if (this.failNextConnection) {
        this.failNextConnection = false;
        this.bleState = "failed";
        throw new Error(tr("controls.reachFailed"));
      }
      this.bleState = "connected";
      this.telemetryAvailable = this.telemetryScenario !== "no-data";
      this.lastSync = automatic ? "home.autoConnected" : "home.justNow";
      this.autoConnectVehicleId = this.vehicle.id;
      writeStorage(storageKeys.autoConnectVehicle, this.autoConnectVehicleId);
      await this.loadVehicleData();
    },
    disconnect(manual = true) {
      this.clearConnectionTimer();
      this.bleState = "idle";
      this.telemetryAvailable = false;
      if (manual) this.autoConnectSuppressed = true;
      else this.autoConnectAttempted = false;
    },
    async loadVehicleData() {
      if (!this.isConnected) throw new Error(tr("controls.connectRequired"));
      if (readTimer) clearTimeout(readTimer);
      this.controlReadState = "loading";
      await waitWithTimer(280, "read");
      if (this.failNextRead) {
        this.failNextRead = false;
        this.controlReadState = "failed";
        throw new Error(tr("controls.readFailed"));
      }
      const parsed = parseMockVehicleFrame(createMockVehicleFrame(this.controls, defaultTelemetry, this.telemetryScenario));
      this.controls = parsed.controls;
      this.telemetryAvailable = Boolean(parsed.telemetry);
      if (parsed.telemetry) {
        this.telemetry = parsed.telemetry;
        this.lastTelemetryAt = Date.now();
      }
      this.controlReadState = "success";
      this.lastSync = "home.justNow";
    },
    async setTelemetryScenario(scenario: TelemetryScenario) {
      this.telemetryScenario = scenario;
      writeStorage(storageKeys.telemetryScenario, scenario);
      if (this.isConnected) await this.loadVehicleData();
      else this.telemetryAvailable = false;
    },
    async writeControl<K extends keyof ControlSettings>(key: K, value: ControlSettings[K]) {
      await this.writeControls({ [key]: value } as Partial<ControlSettings>);
    },
    async writeControls(values: Partial<ControlSettings>) {
      if (!this.isConnected) throw new Error(tr("controls.connectRequired"));
      if (controlTimer) clearTimeout(controlTimer);
      this.saving = true;
      await waitWithTimer(300, "control");
      if (this.failNextWrite) {
        this.failNextWrite = false;
        this.saving = false;
        throw new Error(tr("controls.writeFailed"));
      }
      const normalizedValues: Partial<ControlSettings> = { ...values };
      if (values.wheelieMaxAngle !== undefined) {
        normalizedValues.wheelieMaxAngle = normalizeWheelieAngle(values.wheelieMaxAngle);
      }
      if (values.wheelCircumference !== undefined) {
        normalizedValues.wheelCircumference = normalizeWheelCircumference(values.wheelCircumference);
      }
      this.controls = {
        ...this.controls,
        ...normalizedValues,
        powerCurve: values.powerCurve ? [...values.powerCurve] : this.controls.powerCurve,
        mPowerCurve: values.mPowerCurve ? [...values.mPowerCurve] : this.controls.mPowerCurve,
      };
      if (normalizedValues.rideGear !== undefined && this.telemetryAvailable) {
        this.telemetry = { ...this.telemetry, rideGear: normalizedValues.rideGear };
        this.lastTelemetryAt = Date.now();
      }
      this.persistControls();
      this.saving = false;
    },
    async writePowerCurve(values: number[]) {
      const clamped = values.map((value, index) => {
        const minimum = index === 0 ? 0 : values[index - 1];
        return Math.max(minimum, Math.min(100, Math.round(value)));
      });
      await this.writeControls({ powerCurve: clamped });
    },
    async writeMPowerCurve(values: number[]) {
      const clamped = values.map((value, index) => {
        const minimum = index === 0 ? 0 : values[index - 1];
        return Math.max(minimum, Math.min(100, Math.round(value)));
      });
      await this.writeControls({ mPowerCurve: clamped });
    },
    persistControls() {
      writeStorage(storageKeys.controls, this.controls);
    },
    clearConnectionTimer() {
      if (connectionTimer) clearTimeout(connectionTimer);
      connectionTimer = undefined;
    },
    clearTimers() {
      this.clearConnectionTimer();
      if (controlTimer) clearTimeout(controlTimer);
      if (readTimer) clearTimeout(readTimer);
      controlTimer = undefined;
      readTimer = undefined;
    },
    reset() {
      this.lastTelemetryAt = null;
      this.clearTimers();
      this.vehicle = null;
      this.bleState = "idle";
      this.controls = { ...defaultControls, powerCurve: [...defaultControls.powerCurve], mPowerCurve: [...defaultControls.mPowerCurve] };
      this.telemetry = { ...defaultTelemetry };
      this.telemetryAvailable = false;
      this.telemetryScenario = "normal";
      this.controlReadState = "idle";
      this.autoConnectVehicleId = null;
      this.autoConnectAttempted = false;
      this.autoConnectSuppressed = false;
      this.failNextConnection = false;
      this.failNextRead = false;
      this.failNextWrite = false;
      this.saving = false;
    },
  },
});
