import { defineStore } from "pinia";
import { setI18nLanguage, tr } from "@/i18n";
import type { AppPreferences, AppUpdateScenario, DiagnosisScenario, Language, OtaScenario, ResolvedTheme, TelemetryScenario, ThemeMode } from "@/types";
import { readStorage, storageKeys, writeStorage } from "@/utils/storage";

const LANGUAGE_CONFIG_VERSION = 2;
export const WHEELIE_DISCLAIMER_VERSION = 1;
export const DEFAULT_CACHE_BYTES = 12_400_000;
let stopSystemThemeListener: (() => void) | undefined;

const defaults: AppPreferences = {
  language: "zh",
  languageConfigVersion: LANGUAGE_CONFIG_VERSION,
  themeMode: "dark",
  wheelieDisclaimerVersion: 0,
  reduceMotion: false,
  debugUnlocked: false,
  abnormalScenario: false,
  telemetryScenario: "normal",
  diagnosisScenario: "normal",
  otaScenario: "normal",
  appUpdateScenario: "available",
};

function readSystemTheme(): ResolvedTheme {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  try {
    const info = uni.getSystemInfoSync() as { theme?: string };
    return info.theme === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyDocumentTheme(theme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function restoredPreferences(): AppPreferences {
  const stored = readStorage<Partial<AppPreferences>>(storageKeys.preferences, {});
  const migratedLanguage: Language = stored.languageConfigVersion === LANGUAGE_CONFIG_VERSION && stored.language === "en" ? "en" : "zh";
  const preferences: AppPreferences = {
    ...defaults,
    ...stored,
    language: migratedLanguage,
    languageConfigVersion: LANGUAGE_CONFIG_VERSION,
    themeMode: "dark",
    wheelieDisclaimerVersion: Number.isInteger(stored.wheelieDisclaimerVersion)
      ? Math.max(0, Number(stored.wheelieDisclaimerVersion))
      : 0,
  };
  writeStorage(storageKeys.preferences, preferences);
  setI18nLanguage(preferences.language);
  return preferences;
}

export const useAppStore = defineStore("app", {
  state: () => ({
    preferences: restoredPreferences(),
    systemTheme: readSystemTheme(),
    cacheBytes: readStorage(storageKeys.cacheBytes, DEFAULT_CACHE_BYTES),
    versionTapCount: 0,
  }),
  getters: {
    isZh: (state) => state.preferences.language === "zh",
    resolvedTheme: (): ResolvedTheme => "dark",
    wheelieDisclaimerAccepted: (state) => state.preferences.wheelieDisclaimerVersion >= WHEELIE_DISCLAIMER_VERSION,
  },
  actions: {
    initializeTheme() {
      this.systemTheme = readSystemTheme();
      this.applyTheme();
      stopSystemThemeListener?.();
      stopSystemThemeListener = undefined;

      if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = (event: MediaQueryListEvent) => {
          this.systemTheme = event.matches ? "dark" : "light";
          if (this.preferences.themeMode === "system") this.applyTheme();
        };
        media.addEventListener("change", onChange);
        stopSystemThemeListener = () => media.removeEventListener("change", onChange);
        return;
      }

      const themeApi = uni as typeof uni & {
        onThemeChange?: (callback: (event: { theme: "light" | "dark" }) => void) => void;
        offThemeChange?: (callback: (event: { theme: "light" | "dark" }) => void) => void;
      };
      if (typeof themeApi.onThemeChange === "function") {
        const onChange = (event: { theme: "light" | "dark" }) => {
          this.systemTheme = event.theme === "dark" ? "dark" : "light";
          if (this.preferences.themeMode === "system") this.applyTheme();
        };
        themeApi.onThemeChange(onChange);
        stopSystemThemeListener = () => themeApi.offThemeChange?.(onChange);
      }
    },
    setThemeMode(_themeMode: ThemeMode) {
      // V5 is dark-only, including previously saved light/system preferences.
      this.preferences.themeMode = "dark";
      this.persist();
      this.applyTheme();
    },
    applyTheme() {
      const theme = this.resolvedTheme;
      applyDocumentTheme(theme);
      try {
        uni.setBackgroundColor({ backgroundColor: theme === "dark" ? "#061421" : "#f3f6f4" });
        uni.setTabBarStyle({
          color: theme === "dark" ? "#91a2b8" : "#7a8581",
          selectedColor: theme === "dark" ? "#7dff78" : "#07c160",
          backgroundColor: theme === "dark" ? "#081b2b" : "#f7f7f7",
          borderStyle: theme === "dark" ? "white" : "black",
        });
      } catch {
        // Custom navigation and tab bars remain styled by CSS if native APIs are unavailable.
      }
    },
    setLanguage(language: Language) {
      this.preferences.language = language;
      this.preferences.languageConfigVersion = LANGUAGE_CONFIG_VERSION;
      setI18nLanguage(language);
      this.persist();
      this.applyTabLanguage();
    },
    toggleReduceMotion() {
      this.preferences.reduceMotion = !this.preferences.reduceMotion;
      this.persist();
    },
    acceptWheelieDisclaimer() {
      this.preferences.wheelieDisclaimerVersion = WHEELIE_DISCLAIMER_VERSION;
      this.persist();
    },
    setAbnormalScenario(value: boolean) {
      this.preferences.abnormalScenario = value;
      this.preferences.diagnosisScenario = value ? "motor-sensor" : "normal";
      this.preferences.otaScenario = value ? "transfer-failed" : "normal";
      this.persist();
    },
    setTelemetryScenario(scenario: TelemetryScenario) {
      this.preferences.telemetryScenario = scenario;
      this.persist();
    },
    setDiagnosisScenario(scenario: DiagnosisScenario) {
      this.preferences.diagnosisScenario = scenario;
      this.preferences.abnormalScenario = scenario !== "normal";
      this.persist();
    },
    setOtaScenario(scenario: OtaScenario) {
      this.preferences.otaScenario = scenario;
      this.persist();
    },
    setAppUpdateScenario(scenario: AppUpdateScenario) {
      this.preferences.appUpdateScenario = scenario;
      this.persist();
    },
    clearCache() {
      this.cacheBytes = 0;
      writeStorage(storageKeys.cacheBytes, 0);
    },
    tapVersion() {
      this.versionTapCount += 1;
      const remaining = Math.max(0, 7 - this.versionTapCount);
      if (remaining === 0) {
        this.preferences.debugUnlocked = true;
        this.persist();
        return 0;
      }
      return remaining;
    },
    persist() {
      writeStorage(storageKeys.preferences, this.preferences);
    },
    applyTabLanguage() {
      setI18nLanguage(this.preferences.language);
      [tr("tabs.home"), tr("tabs.controls"), tr("tabs.service"), tr("tabs.me")].forEach((text, index) => {
        try {
          uni.setTabBarItem({ index, text, fail: () => undefined });
        } catch {
          // App launch can precede native tab creation.
        }
      });
    },
    reset() {
      this.preferences = { ...defaults };
      this.systemTheme = readSystemTheme();
      this.cacheBytes = DEFAULT_CACHE_BYTES;
      this.versionTapCount = 0;
      setI18nLanguage("zh");
      writeStorage(storageKeys.cacheBytes, this.cacheBytes);
      this.persist();
      this.applyTabLanguage();
      this.applyTheme();
    },
  },
});
