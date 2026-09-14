import type { OtaManifestEntry, VehicleModule } from "@/types";

function numericParts(version: string): number[] {
  return (version.match(/\d+/g) || []).map(Number);
}

export function compareFirmwareVersions(currentVersion: string, targetVersion: string): number {
  const current = numericParts(currentVersion);
  const target = numericParts(targetVersion);
  const length = Math.max(current.length, target.length);

  for (let index = 0; index < length; index += 1) {
    const currentPart = current[index] || 0;
    const targetPart = target[index] || 0;
    if (currentPart !== targetPart) return currentPart < targetPart ? -1 : 1;
  }

  return 0;
}

export function resolveFirmwareUpdate(
  module: VehicleModule,
  vehicleModel: string | undefined,
  manifest: OtaManifestEntry[],
): VehicleModule {
  const entry = manifest.find((item) =>
    item.enabled
    && item.moduleId === module.id
    && item.moduleModel === module.hardwareModel
    && vehicleModel !== undefined
    && item.compatibleVehicleModels.includes(vehicleModel));

  if (!entry) return { ...module, targetVersion: module.currentVersion, hasUpdate: false };

  const hasUpdate = compareFirmwareVersions(module.currentVersion, entry.version) < 0;
  return {
    ...module,
    targetVersion: hasUpdate ? entry.version : module.currentVersion,
    hasUpdate,
  };
}
