import { defineStore } from "pinia";
import type { OtaModuleId, OtaScenario, OtaSession, VehicleModule } from "@/types";
import { defaultOta, defaultVehicleModules, firmwarePackages, otaManifest } from "@/mock/seed";
import { readStorage, storageKeys, writeStorage } from "@/utils/storage";
import { resolveFirmwareUpdate } from "@/utils/firmwareVersion";

let otaTimer: ReturnType<typeof setInterval> | undefined;
let otaDelayTimer: ReturnType<typeof setTimeout> | undefined;
let otaDelayResolve: (() => void) | undefined;
let preparationRun = 0;

interface PersistedOta {
  session: OtaSession;
  modules: VehicleModule[];
}

function cloneDefaultSession(): OtaSession {
  return { ...defaultOta, releaseNotes: [...defaultOta.releaseNotes] };
}

function cloneDefaultModules() {
  return defaultVehicleModules.map((item) => ({ ...item }));
}

function restoredState(): PersistedOta {
  const raw = readStorage<PersistedOta | Partial<OtaSession>>(storageKeys.ota, cloneDefaultSession());
  const storedSession = "session" in raw ? raw.session : raw;
  const session: OtaSession = { ...cloneDefaultSession(), ...storedSession, releaseNotes: [...(storedSession.releaseNotes || defaultOta.releaseNotes)] };
  if (["downloading", "verifying"].includes(session.stage)) {
    session.stage = "available";
    session.verificationState = "idle";
  }
  if (["transferring", "installing", "restarting"].includes(session.stage)) session.stage = "paused";
  if (session.error === "Transfer interrupted. Your current firmware remains safe.") session.error = "ota.stageCopy.failed";
  const defaults = cloneDefaultModules();
  const modules = "modules" in raw && Array.isArray(raw.modules)
    ? raw.modules.map((item) => {
      const fallback = defaults.find((module) => module.id === item.id);
      return { ...fallback, ...item, hardwareModel: item.hardwareModel || fallback?.hardwareModel || "" } as VehicleModule;
    })
    : defaults;
  return { session, modules };
}

export const useOtaStore = defineStore("ota", {
  state: () => {
    const restored = restoredState();
    return { session: restored.session, modules: restored.modules, downloadProgress: 0, failAt: 0 };
  },
  getters: {
    selectedModule: (state) => state.modules.find((item) => item.id === state.session.selectedModuleId) || state.modules[0],
    selectedPackage: (state) => {
      const module = state.modules.find((item) => item.id === state.session.selectedModuleId);
      return otaManifest.find((item) => item.moduleId === module?.id && item.moduleModel === module.hardwareModel && item.version === module.targetVersion)
        || firmwarePackages.find((item) => item.moduleId === state.session.selectedModuleId)
        || firmwarePackages[0];
    },
    updateCount: (state) => state.modules.filter((item) => item.hasUpdate).length,
    hasUpdates(): boolean {
      return this.updateCount > 0;
    },
  },
  actions: {
    async check(scenario: OtaScenario = "normal", vehicleModel?: string) {
      preparationRun += 1;
      this.stopTimer();
      this.session.error = undefined;
      this.session.checkState = "checking";
      this.session.stage = "checking";
      this.session.verificationState = "idle";
      this.session.rollbackState = "idle";
      this.persist();
      await this.delay(650);
      if (scenario === "check-failed") {
        this.session.checkState = "failed";
        this.session.stage = "idle";
        this.session.error = "ota.checkFailedCopy";
        this.persist();
        return;
      }
      if (scenario === "no-update") {
        this.modules = this.modules.map((item) => ({ ...item, targetVersion: item.currentVersion, hasUpdate: false }));
        this.session.checkState = "none";
        this.session.stage = "idle";
        this.persist();
        return;
      }
      this.modules = this.modules.map((item) => resolveFirmwareUpdate(item, vehicleModel, otaManifest));
      this.session.checkState = this.updateCount ? "updates" : "none";
      this.session.stage = this.updateCount ? "available" : "idle";
      this.persist();
    },
    selectModule(id: OtaModuleId) {
      const module = this.modules.find((item) => item.id === id);
      const pkg = firmwarePackages.find((item) => item.moduleId === id);
      if (!module || !pkg) return;
      preparationRun += 1;
      this.downloadProgress = 0;
      this.session.selectedModuleId = id;
      this.session.currentVersion = module.currentVersion;
      this.session.targetVersion = module.targetVersion;
      this.session.releaseNotes = [...pkg.releaseNotes];
      this.session.verificationState = "idle";
      this.session.rollbackState = "idle";
      this.session.progress = 0;
      this.session.error = undefined;
      this.session.stage = "available";
      this.persist();
    },
    async prepareUpdate(scenario: OtaScenario = "normal") {
      this.stopTimer();
      const run = ++preparationRun;
      this.downloadProgress = 0;
      this.session.verificationState = "idle";
      this.session.stage = "downloading";
      this.session.error = undefined;
      this.persist();

      while (this.downloadProgress < 100) {
        await this.delay(100);
        if (run !== preparationRun) return false;
        this.downloadProgress = Math.min(100, this.downloadProgress + 10);
      }

      await this.verify(scenario);
      return run === preparationRun && String(this.session.verificationState) === "success";
    },
    async verify(scenario: OtaScenario = "normal") {
      this.stopTimer();
      this.session.verificationState = "checking";
      this.session.stage = "verifying";
      this.session.error = undefined;
      this.persist();
      await this.delay(650);
      if (scenario === "verify-failed") {
        this.session.verificationState = "failed";
        this.session.stage = "available";
        this.session.error = "ota.verifyFailedCopy";
      } else {
        this.session.verificationState = "success";
        this.session.stage = "available";
      }
      this.persist();
    },
    start(scenario: OtaScenario = "normal") {
      if (this.session.verificationState !== "success") return false;
      this.stopTimer();
      this.session.progress = Math.max(this.session.progress, 1);
      this.session.stage = "transferring";
      this.session.rollbackState = "idle";
      if (scenario === "transfer-failed") this.failAt = Math.max(35, this.session.progress + 3);
      this.persist();
      otaTimer = setInterval(() => this.tick(), 240);
      return true;
    },
    cancelPreparation() {
      if (!["downloading", "verifying"].includes(this.session.stage)) return;
      preparationRun += 1;
      this.stopTimer();
      this.downloadProgress = 0;
      this.session.verificationState = "idle";
      this.session.stage = "available";
      this.persist();
    },
    tick() {
      if (this.session.stage === "transferring") {
        this.session.progress += 3;
        if (this.failAt && this.session.progress >= this.failAt) {
          this.session.error = "ota.stageCopy.failed";
          this.session.stage = "failed";
          this.stopTimer();
          this.failAt = 0;
          this.persist();
          return;
        }
        if (this.session.progress >= 88) this.session.stage = "installing";
      } else if (this.session.stage === "installing") {
        this.session.progress += 2;
        if (this.session.progress >= 96) this.session.stage = "restarting";
      } else if (this.session.stage === "restarting") {
        this.session.progress += 1;
        if (this.session.progress >= 100) {
          this.session.progress = 100;
          this.session.currentVersion = this.session.targetVersion;
          const module = this.modules.find((item) => item.id === this.session.selectedModuleId);
          if (module) {
            module.currentVersion = module.targetVersion;
            module.hasUpdate = false;
          }
          this.session.stage = "success";
          this.stopTimer();
        }
      }
      this.persist();
    },
    pause() {
      if (this.session.stage !== "transferring") return;
      this.session.stage = "paused";
      this.stopTimer();
      this.persist();
    },
    resume() {
      if (this.session.stage !== "paused") return;
      this.session.stage = "transferring";
      this.persist();
      otaTimer = setInterval(() => this.tick(), 240);
    },
    retry() {
      this.session.error = undefined;
      this.session.stage = "paused";
      this.resume();
    },
    async rollback(scenario: OtaScenario = "normal") {
      this.stopTimer();
      this.session.error = undefined;
      this.session.stage = "rollback";
      this.session.rollbackState = "running";
      this.persist();
      await this.delay(700);
      this.session.progress = 0;
      if (scenario === "rollback-failed") {
        this.session.rollbackState = "service-required";
        this.session.stage = "failed";
        this.session.error = "ota.rollbackServiceCopy";
      } else {
        this.session.rollbackState = "success";
        this.session.stage = "available";
      }
      this.persist();
    },
    delay(duration: number) {
      return new Promise<void>((resolve) => {
        otaDelayResolve = resolve;
        otaDelayTimer = setTimeout(() => {
          otaDelayTimer = undefined;
          otaDelayResolve = undefined;
          resolve();
        }, duration);
      });
    },
    persist() {
      writeStorage<PersistedOta>(storageKeys.ota, { session: this.session, modules: this.modules });
    },
    stopTimer() {
      if (otaTimer) clearInterval(otaTimer);
      otaTimer = undefined;
      if (otaDelayTimer) clearTimeout(otaDelayTimer);
      otaDelayTimer = undefined;
      otaDelayResolve?.();
      otaDelayResolve = undefined;
    },
    reset() {
      preparationRun += 1;
      this.stopTimer();
      this.session = cloneDefaultSession();
      this.modules = cloneDefaultModules();
      this.downloadProgress = 0;
      this.failAt = 0;
    },
  },
});
