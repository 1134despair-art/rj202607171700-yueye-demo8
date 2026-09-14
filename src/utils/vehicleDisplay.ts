import type { Vehicle } from "@/types";

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "BX-01": "X1",
  "BX-02": "X5",
};

export function getVehicleDisplayName(vehicle?: Vehicle | null): string {
  if (!vehicle) return "--";
  const legacySeriesName = MODEL_DISPLAY_NAMES[vehicle.model];
  return vehicle.displayName && vehicle.displayName !== legacySeriesName
    ? vehicle.displayName
    : vehicle.name || legacySeriesName || vehicle.model;
}

export function getVehicleSeriesName(vehicle?: Vehicle | null): string {
  if (!vehicle) return "--";
  return MODEL_DISPLAY_NAMES[vehicle.model] || vehicle.model;
}

export function getVehicleIdentityLine(vehicle?: Vehicle | null): string {
  if (!vehicle) return "--";
  return `${getVehicleSeriesName(vehicle)} 越野系列 · ${vehicle.model}`;
}

export function getVehicleVin(vehicle?: Vehicle | null): string {
  if (!vehicle) return "--";
  return vehicle.vin || vehicle.serialNumber || "--";
}
