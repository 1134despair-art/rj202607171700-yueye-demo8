import type { ControlSettings, Telemetry, TelemetryScenario } from "@/types";

export interface MockVehicleFrame {
  kind: "vehicle-snapshot";
  payload: {
    controls: ControlSettings;
    telemetry: Telemetry | null;
  };
}

function cloneControls(controls: ControlSettings): ControlSettings {
  return { ...controls, powerCurve: [...controls.powerCurve], mPowerCurve: [...controls.mPowerCurve] };
}

export function createMockVehicleFrame(controls: ControlSettings, telemetry: Telemetry, scenario: TelemetryScenario): MockVehicleFrame {
  if (scenario === "no-data") return { kind: "vehicle-snapshot", payload: { controls: cloneControls(controls), telemetry: null } };
  const next = { ...telemetry, rideGear: controls.rideGear };
  if (scenario === "overheat") {
    next.batteryTemp = 68;
    next.controllerTemp = 82;
  }
  if (scenario === "overvoltage") next.voltage = 86.8;
  return { kind: "vehicle-snapshot", payload: { controls: cloneControls(controls), telemetry: next } };
}

export function parseMockVehicleFrame(frame: MockVehicleFrame) {
  if (frame.kind !== "vehicle-snapshot") throw new Error("Unsupported mock vehicle frame");
  return {
    controls: cloneControls(frame.payload.controls),
    telemetry: frame.payload.telemetry ? { ...frame.payload.telemetry } : null,
  };
}
