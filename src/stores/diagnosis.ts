import { defineStore } from "pinia";
import type { DiagnosisItem, DiagnosisResult, DiagnosisScenario } from "@/types";
import { readStorage, storageKeys, writeStorage } from "@/utils/storage";

let diagnosisTimer: ReturnType<typeof setTimeout> | undefined;
let diagnosisResolve: (() => void) | undefined;
let runToken = 0;

const blankItems = (): DiagnosisItem[] => ["ECU", "BMS", "Motor", "Controller"].map((module, index) => ({
  id: `module-${index}`,
  module: module as DiagnosisItem["module"],
  status: "pending",
}));

const messageAliases: Record<string, string> = {
  "No issue detected.": "diagnosis.messages.ok",
  "Motor temperature sensor signal is intermittent.": "diagnosis.messages.motorSensor",
};

function restoredResult() {
  const result = readStorage<DiagnosisResult | null>(storageKeys.diagnosis, null);
  if (!result) return null;
  result.items = result.items.map((item) => ({ ...item, message: item.message ? messageAliases[item.message] || item.message : undefined }));
  return result;
}

function faultFor(scenario: DiagnosisScenario, index: number): Partial<DiagnosisItem> | null {
  if (scenario === "motor-sensor" && index === 2) return { status: "warning", code: "MTR-P021", message: "diagnosis.messages.motorSensor", advice: "diagnosis.advice.motorSensor" };
  if (scenario === "bms-overheat" && index === 1) return { status: "warning", code: "BMS-T068", message: "diagnosis.messages.bmsOverheat", advice: "diagnosis.advice.bmsOverheat" };
  if (scenario === "unknown" && index === 0) return { status: "warning", code: "ECU-U000", message: "diagnosis.messages.unknown", advice: "diagnosis.advice.unknown" };
  return null;
}

export const useDiagnosisStore = defineStore("diagnosis", {
  state: () => ({ items: blankItems(), running: false, progress: 0, latest: restoredResult() }),
  actions: {
    async run(input: DiagnosisScenario | boolean = "normal") {
      this.stop();
      const scenario: DiagnosisScenario = typeof input === "boolean" ? (input ? "motor-sensor" : "normal") : input;
      const token = ++runToken;
      this.items = blankItems();
      this.running = true;
      this.progress = 0;
      for (let index = 0; index < this.items.length; index += 1) {
        this.items[index].status = "checking";
        await this.delay(450);
        if (token !== runToken) return null;
        const fault = faultFor(scenario, index);
        this.items[index] = fault ? { ...this.items[index], ...fault } as DiagnosisItem : { ...this.items[index], status: "ok", message: "diagnosis.messages.ok" };
        this.progress = (index + 1) * 25;
      }
      this.running = false;
      this.latest = {
        id: `diagnosis-${Date.now()}`,
        createdAt: new Date().toISOString(),
        healthy: !this.items.some((item) => item.status === "warning"),
        items: this.items.map((item) => ({ ...item })),
      };
      writeStorage(storageKeys.diagnosis, this.latest);
      return this.latest;
    },
    delay(duration: number) {
      return new Promise<void>((resolve) => {
        diagnosisResolve = resolve;
        diagnosisTimer = setTimeout(() => {
          diagnosisTimer = undefined;
          diagnosisResolve = undefined;
          resolve();
        }, duration);
      });
    },
    stop() {
      runToken += 1;
      if (diagnosisTimer) clearTimeout(diagnosisTimer);
      diagnosisTimer = undefined;
      diagnosisResolve?.();
      diagnosisResolve = undefined;
      this.running = false;
    },
    reset() {
      this.stop();
      this.items = blankItems();
      this.progress = 0;
      this.latest = null;
    },
  },
});
