<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import {
  Activity, BatteryCharging, Bike, Bluetooth, BookOpen, CalendarDays, Check, ChevronLeft,
  ChevronRight, CircleGauge, CloudDownload, Download, FileText, FolderOpen, Gauge, Globe2, House,
  Languages, LoaderCircle, Mail, Minus, Pencil, Phone, Plus, RefreshCw, RotateCcw,
  Save, Search, Settings2, ShieldCheck, SlidersHorizontal, Stethoscope, TriangleAlert,
  Unlink, UserRound, Wrench,
} from "lucide-vue-next";
import AppFeedbackHost from "@/components/AppFeedbackHost.vue";
import AppModalShell from "@/components/AppModalShell.vue";
import { useFeedback } from "@/composables/useFeedback";
import { useVehicleStore } from "@/stores/vehicle";
import { useOtaStore } from "@/stores/ota";
import { useDiagnosisStore } from "@/stores/diagnosis";
import { useAppStore } from "@/stores/app";
import type { ChargingPower, ControlSettings, Language, RideGear, SpeedLimit, WheelieMode } from "@/types";
import { readStorage, storageKeys, writeStorage } from "@/utils/storage";
import {
  normalizeWheelieAngle,
  WHEELIE_ANGLE_TICKS,
} from "@/utils/wheelieAngle";
import bikeImage from "@/assets/ui/illustrations/binsen-x5-product-right@3x.png";
import wheelieVehicleImage from "@/assets/ui/illustrations/binsen-x5-real-wheelie@3x.png";
import logoImage from "@/assets/ui/branding/binsen-logo-horizontal-inverse.png";

type Screen = "dashboard" | "controls" | "general" | "ride" | "m-mode" | "curve" | "battery" |
  "status" | "diagnostics" | "ota" | "vehicle" | "service" | "profile";

const screen = ref<Screen>("dashboard");
const screenHistory = ref<Screen[]>([]);
const vehicle = useVehicleStore();
const ota = useOtaStore();
const diagnosis = useDiagnosisStore();
const app = useAppStore();
const feedback = useFeedback();
const { t } = useI18n();
const toggles = ref([vehicle.controls.autoPark, vehicle.controls.tipOverCutoff, vehicle.controls.sideStandSensor, vehicle.controls.hillDescent]);
const activeCurve = ref(4);
const curveValues = ref([...vehicle.controls.powerCurve]);
const curveDragging = ref(false);
const curveProfile = ref<"general" | "m">("general");
const mRangeDrafts = ref({
  mPowerPercent: vehicle.controls.mPowerPercent,
  mTorquePercent: vehicle.controls.mTorquePercent,
  mSpeedLimit: vehicle.controls.mSpeedLimit,
});
const regenLevel = ref(vehicle.controls.regenLevel);
const wheelieMode = ref<WheelieMode>(vehicle.controls.wheelieMode);
const wheelieMaxAngle = ref(normalizeWheelieAngle(vehicle.controls.wheelieMaxAngle));
const speedLimit = ref<SpeedLimit>(vehicle.controls.speedLimit);
const chargingPowerOptions: ChargingPower[] = [400, 600, 800, 1000, 1200, 1400, 1600, 1800, "max"];
const operation = ref("");
const wheelieDisclaimerOpen = ref(false);
const wheelieDisclaimerAcknowledged = ref(false);
const pendingWheelieMode = ref<WheelieMode | null>(null);
const downloadingResourceId = ref<string | null>(null);
const downloadedResourceIds = ref<string[]>(readStorage<string[]>(storageKeys.downloadedResources, []));
type VehicleSearchState = "idle" | "searching" | "results";
const vehicleSearchState = ref<VehicleSearchState>("idle");
const renameVehicleOpen = ref(false);
const vehicleNameDraft = ref("");
const languageModalOpen = ref(false);
const gearModalOpen = ref(false);
const pendingGear = ref<RideGear | null>(null);
let vehicleSearchTimer: ReturnType<typeof setTimeout> | undefined;

const SERVICE_PHONE = "+86 400 000 2026";
const SERVICE_PHONE_NUMBER = "4000002026";
const SERVICE_EMAIL = "service@binsen.com";

const isZh = computed(() => app.preferences.language === "zh");
const l = (english: string, chinese: string) => isZh.value ? chinese : english;
const title = computed(() => ({
  dashboard: "", controls: t("controls.title"), general: l("General Settings", "通用设置"), ride: l("Wheelie Settings", "翘头设置"),
  "m-mode": l("M Mode Settings", "M档设置"), curve: t("controls.curveTitle"),
  battery: t("service.batteryTitle"), status: t("service.statusTitle"),
  diagnostics: l("Vehicle Check", "车况检测"), ota: t("ota.title"), vehicle: vehicle.isBound ? t("bind.manager") : t("bind.title"),
  service: t("service.title"), profile: t("me.title"),
})[screen.value]);
const showTabs = computed(() => ["dashboard", "controls", "service", "profile"].includes(screen.value));
const connected = computed(() => vehicle.isConnected);
const busy = computed(() => ["scanning", "connecting"].includes(vehicle.bleState));
const telemetry = computed(() => vehicle.telemetry);
const vehicleName = computed(() => vehicle.vehicle?.displayName || vehicle.vehicle?.name || t("common.noVehicle"));
const connectionText = computed(() => busy.value ? t("home.ignition.connecting") : connected.value ? t("common.connected") : vehicle.isBound ? t("home.ignition.idle") : t("bind.title"));
const cacheSize = computed(() => `${(app.cacheBytes / 1_000_000).toFixed(1)} MB`);
const languageOptions: Array<{ value: Language; labelKey: string }> = [
  { value: "zh", labelKey: "me.chinese" },
  { value: "en", labelKey: "me.english" },
];
const currentLanguageLabel = computed(() => t(languageOptions.find((item) => item.value === app.preferences.language)?.labelKey || "me.chinese"));
const regenLabel = computed(() => [t("common.off"), t("controls.levels.low"), t("controls.levels.medium"), t("controls.levels.high")][regenLevel.value]);
const wheelieLabel = computed(() => t(`controls.wheelieOptions.${wheelieMode.value}`));
const speedLimitLabel = computed(() => speedLimit.value ? `${speedLimit.value} km/h` : t("common.off"));
const selectedCurveMinimum = computed(() => activeCurve.value === 0 ? 0 : curveValues.value[activeCurve.value - 1]);
const selectedCurveMaximum = computed(() => activeCurve.value === curveValues.value.length - 1 ? 100 : curveValues.value[activeCurve.value + 1]);
const gearLabel = computed(() => ({
  eco: l("ECO", "经济"), sport: l("SPORT", "运动"), m: "M", creep: l("CREEP", "蠕行"),
})[telemetry.value.rideGear]);
const gearOptions = computed<Array<{ value: RideGear; label: string; detail: string }>>(() => [
  { value: "eco", label: l("ECO", "经济"), detail: l("Smooth output and longer range", "动力平顺，兼顾续航") },
  { value: "sport", label: l("SPORT", "运动"), detail: l("Faster throttle response", "动力响应更迅速") },
  { value: "m", label: "M", detail: l("Uses the custom M-mode profile", "使用 M 档自定义参数") },
  { value: "creep", label: l("CREEP", "蠕行"), detail: l("Low-speed assisted movement", "低速辅助行驶") },
]);
const levelLabel = (level: number) => level === 0 ? t("common.off") : l(`Level ${level}`, `${level}档`);
const chargingPowerLabel = (value: ChargingPower) => value === "max" ? "MAX" : `${value} W`;
const diagnosisProgress = computed(() => diagnosis.progress);
const diagnosticButton = computed(() => diagnosis.running ? t("diagnosis.scanning", { progress: diagnosis.progress }) : diagnosis.latest ? t("diagnosis.rerun") : t("diagnosis.start"));
const vehicleSearchTitle = computed(() => vehicleSearchState.value === "searching" ? t("bind.searching") : vehicleSearchState.value === "results" ? t("bind.searchComplete") : t("bind.searchNearby"));
const vehicleSearchCopy = computed(() => vehicleSearchState.value === "searching" ? t("bind.searchingCopy") : vehicleSearchState.value === "results" ? t("bind.searchFound", { count: vehicle.availableVehicles.length }) : t("bind.searchIdleCopy"));
const bottomActions: Partial<Record<Screen, string>> = {
  diagnostics: "",
};
const bottomAction = computed(() => {
  const actions: Partial<Record<Screen, string>> = {
    status: l("Refresh Vehicle Status", "刷新车辆状态"),
    diagnostics: diagnosticButton.value,
  };
  return actions[screen.value] || bottomActions[screen.value] || "";
});

const safetyControls = computed(() => [
  { icon: CircleGauge, name: t("controls.autoPark"), detail: t("controls.autoParkCopy") },
  { icon: Bike, name: t("controls.tipOver"), detail: t("controls.tipOverCopy") },
  { icon: Activity, name: t("controls.sideStand"), detail: t("controls.sideStandCopy") },
  { icon: Gauge, name: t("controls.hillDescent"), detail: t("controls.hillDescentCopy") },
]);
const modules = computed(() => [l("Vehicle Controller ECU", "车辆控制器 ECU"), l("Battery Management BMS", "电池管理 BMS"), l("Motor", "电机"), l("Main Controller", "主控制器")]);
const diagnosticModules = computed(() => [l("Battery Check", "电池检测"), l("Controller (MCU) Check", "控制器（MCU）检测"), l("Instrument Check", "仪表检测")]);
const resources = computed(() => [
  { id: "repair-manual", fileName: "binsen-repair-manual.pdf", icon: BookOpen, name: t("resources.items.repairManual"), detail: t("resources.details.repairManual"), type: "PDF" },
  { id: "fault-code-table", fileName: "binsen-fault-code-table.pdf", icon: Activity, name: t("resources.items.faultCodes"), detail: t("resources.details.faultCodes"), type: "PDF" },
  { id: "torque-table", fileName: "binsen-torque-table.pdf", icon: Wrench, name: t("resources.items.torqueTable"), detail: t("resources.details.torqueTable"), type: "PDF" },
  { id: "brand-vi", fileName: "binsen-brand-vi.svg", icon: Globe2, name: t("resources.items.brandVi"), detail: t("resources.details.brandVi"), type: "SVG" },
  { id: "body-sticker", fileName: "binsen-body-sticker.pdf", icon: Settings2, name: t("resources.items.bodySticker"), detail: t("resources.details.bodySticker"), type: "PDF" },
]);
const safetyKeys: Array<keyof ControlSettings> = ["autoPark", "tipOverCutoff", "sideStandSensor", "hillDescent"];

function syncDrafts() {
  toggles.value = [vehicle.controls.autoPark, vehicle.controls.tipOverCutoff, vehicle.controls.sideStandSensor, vehicle.controls.hillDescent];
  curveValues.value = [...vehicle.controls.powerCurve];
  mRangeDrafts.value = {
    mPowerPercent: vehicle.controls.mPowerPercent,
    mTorquePercent: vehicle.controls.mTorquePercent,
    mSpeedLimit: vehicle.controls.mSpeedLimit,
  };
  regenLevel.value = vehicle.controls.regenLevel;
  wheelieMode.value = vehicle.controls.wheelieMode;
  wheelieMaxAngle.value = normalizeWheelieAngle(vehicle.controls.wheelieMaxAngle);
  speedLimit.value = vehicle.controls.speedLimit;
}

async function applyControl<K extends keyof ControlSettings>(key: K, value: ControlSettings[K], label: string) {
  if (!(await ensureConnected()) || vehicle.saving || operation.value) return;
  operation.value = String(key);
  try {
    await vehicle.writeControl(key, value);
    notify(l(`${label} updated`, `${label}已更新`));
  } catch (reason) {
    notify(reason instanceof Error ? reason.message : t("common.unableToSave"), "danger");
  } finally {
    operation.value = "";
  }
}

function toggleControl<K extends keyof ControlSettings>(key: K, label: string) {
  void applyControl(key, !Boolean(vehicle.controls[key]) as ControlSettings[K], label);
}

function openCurve(profile: "general" | "m") {
  curveProfile.value = profile;
  curveValues.value = [...(profile === "m" ? vehicle.controls.mPowerCurve : vehicle.controls.powerCurve)];
  activeCurve.value = 4;
  open("curve");
}

function notify(message: string, tone: "success" | "warning" | "danger" | "info" = "success") {
  feedback.toast({ message, tone });
}

async function toggleConnection() {
  if (busy.value) return;
  if (!vehicle.isBound) return open("vehicle");
  if (connected.value) {
    const confirmed = await feedback.confirm({ title: t("home.disconnectTitle"), content: t("home.disconnectCopy"), tone: "warning", cancelText: t("common.cancel"), confirmText: l("Disconnect", "断开") });
    if (confirmed) vehicle.disconnect(true);
    return;
  }
  operation.value = "connect";
  try { await vehicle.connect(); syncDrafts(); notify(t("common.connected")); }
  catch (reason) { notify(reason instanceof Error ? reason.message : t("common.connectionFailed"), "danger"); }
  finally { operation.value = ""; }
}

async function ensureConnected() {
  if (connected.value) return true;
  notify(t("controls.connectRequired"), "warning");
  return false;
}

async function toggleSafety(index: number) {
  if (!(await ensureConnected()) || vehicle.saving) return;
  const key = safetyKeys[index];
  const next = !toggles.value[index];
  operation.value = String(key);
  try { await vehicle.writeControl(key, next as never); toggles.value[index] = next; notify(t("common.settingSaved")); }
  catch (reason) { notify(reason instanceof Error ? reason.message : t("common.unableToSave"), "danger"); }
  finally { operation.value = ""; }
}

type RideSetting = "regen" | "wheelie" | "wheelieAngle" | "speed";

async function applyRideSetting(
  setting: RideSetting,
  label: string,
  values: Partial<ControlSettings>,
  apply: () => void,
  rollback: () => void,
) {
  if (!connected.value) {
    notify(t("controls.connectRequired"), "warning");
    return;
  }
  if (operation.value) return;
  operation.value = `ride-${setting}`;
  apply();
  try {
    await vehicle.writeControls(values);
    notify(t("controls.settingApplied", { setting: label }));
  } catch (reason) {
    rollback();
    notify(t("controls.settingApplyFailed", {
      setting: label,
      reason: reason instanceof Error ? reason.message : t("controls.writeFailed"),
    }), "danger");
  } finally {
    operation.value = "";
  }
}

function setRegen(level: number) {
  const previous = regenLevel.value;
  if (previous === level) return;
  void applyRideSetting("regen", t("controls.regenLevel"), { regenLevel: level }, () => { regenLevel.value = level; }, () => { regenLevel.value = previous; });
}

function showWheelieDisclaimer(mode: WheelieMode | null = null) {
  pendingWheelieMode.value = mode;
  wheelieDisclaimerAcknowledged.value = mode === null && app.wheelieDisclaimerAccepted;
  wheelieDisclaimerOpen.value = true;
}

function applyWheelieMode(mode: WheelieMode) {
  const previous = wheelieMode.value;
  const values: Partial<ControlSettings> = mode === "custom"
    ? { wheelieMode: mode, wheelieMaxAngle: normalizeWheelieAngle(wheelieMaxAngle.value) }
    : { wheelieMode: mode };
  void applyRideSetting("wheelie", t("controls.wheelieMode"), values, () => { wheelieMode.value = mode; }, () => { wheelieMode.value = previous; });
}

function selectWheelie(mode: WheelieMode) {
  if (!connected.value || operation.value || wheelieMode.value === mode) return;
  if (mode !== "off" && !app.wheelieDisclaimerAccepted) {
    showWheelieDisclaimer(mode);
    return;
  }
  applyWheelieMode(mode);
}

function dismissWheelieDisclaimer() {
  wheelieDisclaimerOpen.value = false;
  wheelieDisclaimerAcknowledged.value = false;
  pendingWheelieMode.value = null;
}

function acceptWheelieDisclaimer() {
  if (!wheelieDisclaimerAcknowledged.value) return;
  const targetMode = pendingWheelieMode.value;
  app.acceptWheelieDisclaimer();
  dismissWheelieDisclaimer();
  if (targetMode) applyWheelieMode(targetMode);
}

function setWheelieAngle(value: number) {
  const next = normalizeWheelieAngle(value);
  const previous = vehicle.controls.wheelieMaxAngle;
  wheelieMaxAngle.value = next;
  if (previous === next) return;
  void applyRideSetting("wheelieAngle", t("controls.wheelieMaxAngle"), { wheelieMaxAngle: next }, () => { wheelieMaxAngle.value = next; }, () => { wheelieMaxAngle.value = previous; });
}

function setSpeed(limit: SpeedLimit) {
  const previous = speedLimit.value;
  if (previous === limit) return;
  void applyRideSetting("speed", t("controls.speedLimit"), { speedLimit: limit }, () => { speedLimit.value = limit; }, () => { speedLimit.value = previous; });
}

function setCurvePoint(index: number, value: number) {
  const minimum = index === 0 ? 0 : curveValues.value[index - 1];
  const maximum = index === curveValues.value.length - 1 ? 100 : curveValues.value[index + 1];
  curveValues.value[index] = Math.max(minimum, Math.min(maximum, Math.round(value)));
}

function adjustCurvePoint(delta: number) {
  setCurvePoint(activeCurve.value, curveValues.value[activeCurve.value] + delta);
}

type NumericControlKey = "mPowerPercent" | "mTorquePercent" | "mSpeedLimit";
function previewMRange(key: NumericControlKey, value: number) {
  mRangeDrafts.value[key] = Math.max(30, Math.min(100, Math.round(value)));
}

async function commitMRange(key: NumericControlKey, value: number, label: string) {
  const previous = vehicle.controls[key];
  const next = Math.max(30, Math.min(100, Math.round(value)));
  mRangeDrafts.value[key] = next;
  if (next === previous || !connected.value || operation.value) return;
  operation.value = key;
  try {
    await vehicle.writeControl(key, next);
    mRangeDrafts.value[key] = vehicle.controls[key];
    notify(l(`${label} updated`, `${label}已更新`));
  } catch (reason) {
    mRangeDrafts.value[key] = previous;
    notify(reason instanceof Error ? reason.message : t("common.unableToSave"), "danger");
  } finally {
    operation.value = "";
  }
}

function updateCurveFromPointer(event: PointerEvent) {
  event.preventDefault();
  const chart = event.currentTarget as SVGSVGElement;
  const bounds = chart.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const chartX = ((event.clientX - bounds.left) / bounds.width) * 320;
  const chartY = ((event.clientY - bounds.top) / bounds.height) * 190;
  const index = Math.max(0, Math.min(9, Math.round((chartX - 10) / (300 / 9))));
  const value = Math.max(0, Math.min(100, Math.round((180 - chartY) / 1.6)));
  activeCurve.value = index;
  setCurvePoint(index, value);
}

function startCurveDrag(event: PointerEvent) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  curveDragging.value = true;
  (event.currentTarget as SVGSVGElement).setPointerCapture?.(event.pointerId);
  updateCurveFromPointer(event);
}

function dragCurvePoint(event: PointerEvent) {
  if (curveDragging.value) updateCurveFromPointer(event);
}

function stopCurveDrag(event: PointerEvent) {
  if (!curveDragging.value) return;
  curveDragging.value = false;
  const chart = event.currentTarget as SVGSVGElement;
  if (chart.hasPointerCapture?.(event.pointerId)) chart.releasePointerCapture(event.pointerId);
}

function resetCurve() { curveValues.value = [8, 17, 27, 39, 52, 64, 74, 83, 92, 100]; }
async function saveCurve() {
  if (!(await ensureConnected())) return;
  operation.value = "curve";
  try {
    if (curveProfile.value === "m") await vehicle.writeMPowerCurve(curveValues.value);
    else await vehicle.writePowerCurve(curveValues.value);
    if (curveProfile.value === "m") curveValues.value = [...vehicle.controls.mPowerCurve];
    else curveValues.value = [...vehicle.controls.powerCurve];
    notify(t("controls.curveSaved"));
  }
  catch (reason) { notify(reason instanceof Error ? reason.message : t("common.unableToSave"), "danger"); }
  finally { operation.value = ""; }
}

async function refreshVehicle() {
  if (!(await ensureConnected())) return;
  operation.value = "refresh";
  try { await vehicle.loadVehicleData(); syncDrafts(); notify(l("Vehicle data refreshed", "车辆状态已更新")); }
  catch (reason) { notify(reason instanceof Error ? reason.message : l("Unable to refresh vehicle data", "车辆状态读取失败"), "danger"); }
  finally { operation.value = ""; }
}

async function runDiagnostics() {
  if (!(await ensureConnected()) || diagnosis.running) return;
  operation.value = "diagnostics";
  const result = await diagnosis.run(app.preferences.diagnosisScenario);
  operation.value = "";
  if (result) notify(result.healthy ? l("All vehicle modules are healthy", "所有车辆模块运行正常") : l("Diagnostic found items that need attention", "诊断发现需要处理的项目"), result.healthy ? "success" : "warning");
}

async function checkUpdates() {
  if (!(await ensureConnected())) return;
  operation.value = "ota";
  await ota.check(app.preferences.otaScenario, vehicle.vehicle?.model);
  operation.value = "";
  notify(ota.updateCount ? l(`${ota.updateCount} module updates available`, `${ota.updateCount} 个车辆模块可升级`) : l("Vehicle firmware is up to date", "车辆固件已是最新版本"), ota.updateCount ? "info" : "success");
}

function openOtaModule(index: number) { ota.selectModule(ota.modules[index].id); uni.navigateTo({ url: "/pages/service/ota-detail" }); }
function otaModuleName(id: string, fallback: string) {
  if (id === "display") return t("ota.modules.display");
  if (id === "controller") return t("ota.modules.controller");
  if (id === "bms") return t("ota.modules.bms");
  return fallback;
}
function openRenameVehicle() {
  if (!vehicle.vehicle) return;
  vehicleNameDraft.value = vehicleName.value;
  renameVehicleOpen.value = true;
}

function closeRenameVehicle() {
  renameVehicleOpen.value = false;
  vehicleNameDraft.value = "";
}

function saveVehicleName() {
  const value = vehicleNameDraft.value.trim().replace(/\s+/g, " ");
  if (!value) {
    notify(t("bind.renameRequired"), "warning");
    return;
  }
  vehicle.setVehicleDisplayName(value);
  closeRenameVehicle();
  notify(t("bind.renameSaved"));
}

async function unbindRavenVehicle() {
  if (!vehicle.isBound) return;
  const confirmed = await feedback.confirm({
    title: t("bind.unbindTitle"),
    content: t("bind.unbindCopy"),
    tone: "danger",
    confirmText: t("bind.unbind"),
    cancelText: t("common.cancel"),
  });
  if (!confirmed) return;
  vehicle.unbindVehicle();
  vehicleSearchState.value = "idle";
  syncDrafts();
  notify(t("bind.unboundToast"));
}

function searchNearbyVehicles() {
  if (vehicleSearchState.value === "searching") return;
  if (vehicleSearchTimer) clearTimeout(vehicleSearchTimer);
  vehicleSearchState.value = "searching";
  vehicleSearchTimer = setTimeout(() => {
    vehicleSearchTimer = undefined;
    vehicleSearchState.value = "results";
  }, 900);
}

function bindRavenVehicle(id: string) {
  const selected = vehicle.availableVehicles.find((item) => item.id === id);
  if (!selected) return;
  vehicle.bindVehicle(selected);
  vehicleSearchState.value = "idle";
  syncDrafts();
  notify(t("common.vehicleBound"));
  open("dashboard");
}
function navigate(url: string) { uni.navigateTo({ url }); }
async function downloadResource(resource: (typeof resources.value)[number]) {
  if (downloadingResourceId.value) return;
  const confirmed = await feedback.confirm({
    title: t("resources.confirmTitle", { name: resource.name }),
    content: t("resources.confirmCopy", { format: resource.type, fileName: resource.fileName }),
    icon: "Download",
    tone: "info",
    confirmText: t("resources.startDownload"),
    cancelText: t("common.cancel"),
  });
  if (!confirmed) return;
  downloadingResourceId.value = resource.id;
  await new Promise((resolve) => setTimeout(resolve, 1200));
  if (!downloadedResourceIds.value.includes(resource.id)) {
    downloadedResourceIds.value = [...downloadedResourceIds.value, resource.id];
    writeStorage(storageKeys.downloadedResources, downloadedResourceIds.value);
  }
  downloadingResourceId.value = null;
  await feedback.confirm({
    title: t("resources.downloadComplete"),
    content: t("resources.downloadCompleteCopy", { name: resource.name, fileName: resource.fileName }),
    icon: "CheckCircle2",
    tone: "success",
    showCancel: false,
    confirmText: t("common.done"),
  });
}

async function openResource(resource: (typeof resources.value)[number]) {
  await feedback.confirm({
    title: t("resources.openTitle", { name: resource.name }),
    content: t("resources.openCopy", { format: resource.type, fileName: resource.fileName }),
    icon: "FileText",
    tone: "info",
    showCancel: false,
    confirmText: t("common.done"),
  });
}

function handleResourceAction(resource: (typeof resources.value)[number]) {
  if (downloadedResourceIds.value.includes(resource.id)) return openResource(resource);
  return downloadResource(resource);
}

async function callService() {
  const confirmed = await feedback.confirm({
    title: t("service.callConfirmTitle"),
    content: t("service.callConfirmCopy", { phone: SERVICE_PHONE }),
    icon: "Phone",
    tone: "info",
    confirmText: t("service.callNow"),
    cancelText: t("common.cancel"),
  });
  if (!confirmed) return;
  if (typeof uni.makePhoneCall !== "function") {
    notify(t("service.phoneUnavailable", { phone: SERVICE_PHONE }), "info");
    return;
  }
  uni.makePhoneCall({
    phoneNumber: SERVICE_PHONE_NUMBER,
    fail: () => notify(t("service.phoneUnavailable", { phone: SERVICE_PHONE }), "info"),
  });
}

function copyServiceEmail() {
  uni.setClipboardData({
    data: SERVICE_EMAIL,
    success: () => notify(t("service.emailCopied")),
    fail: () => notify(SERVICE_EMAIL, "info"),
  });
}
async function clearCache() {
  const confirmed = await feedback.confirm({ title: t("me.clearTitle"), content: t("me.clearCopy"), tone: "warning", cancelText: t("common.cancel"), confirmText: l("Clear", "清理") });
  if (confirmed) { app.clearCache(); notify(t("me.cacheCleared")); }
}
function openLanguageModal() { languageModalOpen.value = true; }
function closeLanguageModal() { languageModalOpen.value = false; }
function selectLanguage(option: (typeof languageOptions)[number]) {
  closeLanguageModal();
  if (option.value === app.preferences.language) return;
  app.setLanguage(option.value);
  notify(t("me.languageChanged", { language: t(option.labelKey) }));
}
function openGearModal() {
  if (!connected.value || operation.value) {
    if (!connected.value) notify(t("controls.connectRequired"), "warning");
    return;
  }
  gearModalOpen.value = true;
}
function closeGearModal() { gearModalOpen.value = false; }
async function selectGear(gear: RideGear) {
  if (gear === vehicle.controls.rideGear) {
    closeGearModal();
    return;
  }
  operation.value = "rideGear";
  pendingGear.value = gear;
  try {
    await vehicle.writeControl("rideGear", gear);
    closeGearModal();
    notify(l("Ride gear updated", "当前档位已切换"));
  } catch (reason) {
    notify(reason instanceof Error ? reason.message : t("common.unableToSave"), "danger");
  } finally {
    operation.value = "";
    pendingGear.value = null;
  }
}

async function handleBottomAction() {
  if (screen.value === "status") return refreshVehicle();
  if (screen.value === "diagnostics") return runDiagnostics();
}

const primaryScreens: Screen[] = ["dashboard", "controls", "service", "profile"];
const validScreens: Screen[] = ["dashboard", "controls", "general", "ride", "m-mode", "curve", "battery", "status", "diagnostics", "ota", "vehicle", "service", "profile"];

function open(next: Screen) {
  if (next === screen.value) return;
  if (primaryScreens.includes(next)) screenHistory.value = [];
  else screenHistory.value.push(screen.value);
  screen.value = next;
}
function back() {
  const previous = screenHistory.value.pop();
  if (previous) screen.value = previous;
  else if (["general", "ride", "m-mode", "curve"].includes(screen.value)) screen.value = "controls";
  else screen.value = "dashboard";
}
function tab(next: "dashboard" | "controls" | "service" | "profile") {
  screenHistory.value = [];
  screen.value = next;
}

onLoad((options) => {
  const requested = options?.screen as Screen | undefined;
  if (requested && validScreens.includes(requested)) screen.value = requested;
});

onShow(async () => {
  if (vehicle.shouldAutoConnect) {
    operation.value = "connect";
    try { await vehicle.connect(true); } catch { /* The connection button remains available for retry. */ }
    operation.value = "";
  }
  syncDrafts();
});

onUnmounted(() => { if (vehicleSearchTimer) clearTimeout(vehicleSearchTimer); });
</script>

<template>
  <view class="raven-app">
    <view class="ios-bar"><text>9:41</text><view class="ios-icons"><i /><i /><i /></view></view>

    <view class="topbar" :class="{ dashboard: screen === 'dashboard' }">
      <view v-if="showTabs" class="top-icon" />
      <button v-else class="top-icon" :aria-label="t('common.back')" @click="back"><ChevronLeft :size="20" /></button>
      <image v-if="screen === 'dashboard'" class="top-logo" :src="logoImage" mode="aspectFit" />
      <text v-else class="top-title">{{ title }}</text>
      <button v-if="screen === 'dashboard'" class="top-connected" :disabled="busy" @click="toggleConnection"><i :class="{ offline: !connected }" />{{ connectionText }}<LoaderCircle v-if="busy" class="spinning" :size="14" /><Bluetooth v-else :size="14" /></button>
      <button v-else-if="screen === 'battery'" class="top-icon end" :disabled="operation==='refresh'" @click="refreshVehicle"><RefreshCw :class="{ spinning: operation==='refresh' }" :size="17" /></button>
      <button v-else-if="screen === 'curve'" class="top-help" @click="notify(t('controls.curveCopy'), 'info')">{{ t('controls.curveHelp') }}</button>
      <view v-else class="top-icon end" />
    </view>

    <scroll-view scroll-y class="screen-scroll" :class="{ 'has-tabs': showTabs, 'has-action': bottomAction }">
      <view v-if="screen === 'dashboard'" class="dashboard-screen">
        <view class="bike-stage"><image :src="bikeImage" mode="aspectFit" /></view>
        <button class="model-line" @click="open('vehicle')"><view><text class="model">{{ vehicleName }}</text><text>{{ vehicle.isBound ? l('Off-road Series · CN','越野系列 · CN') : t('bind.waiting') }}</text></view><text>{{ vehicle.vehicle?.model || t('bind.title') }}</text></button>
        <view class="connection-gear-strip">
          <button @click="toggleConnection"><Bluetooth :size="15" /><span>{{ l('Bluetooth', '蓝牙') }}</span><b :class="{ offline: !connected }">{{ connectionText }}</b></button>
          <button data-testid="gear-select-trigger" :aria-expanded="gearModalOpen" aria-haspopup="dialog" :disabled="!connected || Boolean(operation)" @click="openGearModal"><Gauge :size="15" /><span>{{ l('Current Gear', '当前档位') }}</span><b>{{ vehicle.hasTelemetry ? gearLabel : '--' }}</b></button>
        </view>
        <view class="metrics three"><view><b>{{ vehicle.hasTelemetry ? `${telemetry.batteryTemp}°C` : '--' }}</b><span>{{ t('home.batteryTemp') }}</span></view><view><b>{{ vehicle.hasTelemetry ? `${telemetry.motorTemp}°C` : '--' }}</b><span>{{ t('service.motorTemp') }}</span></view><view><b>{{ vehicle.hasTelemetry ? `${telemetry.controllerTemp}°C` : '--' }}</b><span>{{ l('Controller (MCU) Temp','控制器（MCU）温度') }}</span></view></view>
        <view class="dashboard-data-grid telemetry-cards">
          <button class="dashboard-data-item" @click="open('battery')"><view class="round-icon lime"><BatteryCharging :size="16" /></view><view><small>{{ l('Battery', '电量') }}</small><b>{{ vehicle.hasTelemetry ? `${telemetry.soc}%` : '--' }}</b></view></button>
          <view class="dashboard-data-item"><view class="round-icon teal"><SlidersHorizontal :size="16" /></view><view><small>{{ l('Total Mileage','总里程') }}</small><b>{{ vehicle.hasTelemetry ? `${telemetry.totalMileage} km` : '--' }}</b></view></view>
        </view>
        <view class="quick-strip"><button @click="open('status')"><Activity :size="17" />{{ t('home.status') }}</button><button @click="open('diagnostics')"><Stethoscope :size="17" />{{ t('home.diagnose') }}</button><button @click="open('ota')"><CloudDownload :size="17" />OTA <em v-if="ota.updateCount">{{ ota.updateCount }}</em></button></view>
      </view>

      <view v-else-if="screen === 'controls'" class="page-content controls-screen">
        <view class="vehicle-summary"><image :src="bikeImage" mode="aspectFit" /><view><b>{{ vehicleName }}</b><small>{{ vehicle.isBound ? `X1 ${l('Off-road Series','越野系列')} · ${vehicle.vehicle?.model || '--'}` : t('bind.waiting') }}</small><small>{{ connected ? t('controls.connectedCopy') : t('controls.offlineCopy') }}</small></view><em>{{ connected ? t('controls.live') : vehicle.isBound ? t('common.offline') : t('bind.unbound') }}</em></view>
        <text class="section-label">{{ l('RIDING SETTINGS', '骑行设置') }}</text>
        <view class="line-list tune-list settings-entry-list">
          <button @click="open('general')"><view class="round-icon lime"><Settings2 :size="16" /></view><view><b>{{ l('General Settings', '通用设置') }}</b><small>{{ l('Energy recovery, TCS, safety and charging', '动能回收、TCS、安全保护与充电') }}</small></view><span><ChevronRight :size="16" /></span></button>
          <button @click="open('ride')"><view class="round-icon orange"><Bike :size="16" /></view><view><b>{{ l('Wheelie Settings', '翘头设置') }}</b><small>{{ l('Control, mode and target angle', '控制开关、模式与角度选择') }}</small></view><span>{{ vehicle.controls.wheelieEnabled ? wheelieLabel : t('common.off') }} <ChevronRight :size="16" /></span></button>
          <button @click="open('m-mode')"><view class="round-icon teal"><Gauge :size="16" /></view><view><b>{{ l('M Mode Settings', 'M档设置') }}</b><small>{{ l('Power, torque, speed and throttle curve', '功率、扭矩、车速与转把行程') }}</small></view><span>{{ vehicle.controls.mPowerPercent }}% <ChevronRight :size="16" /></span></button>
        </view>
      </view>

      <view v-else-if="screen === 'general'" class="page-content settings-screen">
        <text class="settings-intro">{{ l('Configure shared riding behavior. Changes are written to the connected vehicle immediately.', '配置所有档位共用的骑行行为，调整后将立即写入已连接车辆。') }}</text>
        <view class="setting-block"><view class="setting-title"><view><b>{{ l('Brake Energy Recovery', '制动动能回收') }}</b><small>{{ l('Recovery strength while braking', '制动时的能量回收强度') }}</small></view><em>{{ levelLabel(vehicle.controls.brakeRegenLevel) }}</em></view><view class="segment four"><button v-for="level in [0,1,2,3]" :key="level" :class="{ 'active-orange': vehicle.controls.brakeRegenLevel===level }" :disabled="!connected || Boolean(operation)" @click="applyControl('brakeRegenLevel', level, l('Brake recovery','制动动能回收'))">{{ levelLabel(level) }}</button></view></view>
        <view class="setting-block"><view class="setting-title"><view><b>{{ l('Coasting Energy Recovery', '滑动动能回收') }}</b><small>{{ l('Recovery strength when the throttle is released', '松开转把后的能量回收强度') }}</small></view><em>{{ levelLabel(vehicle.controls.coastingRegenLevel) }}</em></view><view class="segment four"><button v-for="level in [0,1,2,3]" :key="level" :class="{ 'active-orange': vehicle.controls.coastingRegenLevel===level }" :disabled="!connected || Boolean(operation)" @click="applyControl('coastingRegenLevel', level, l('Coasting recovery','滑动动能回收'))">{{ levelLabel(level) }}</button></view></view>
        <view class="setting-block"><view class="setting-title"><view><b>{{ l('TCS Level', 'TCS挡位设置') }}</b><small>{{ l('Traction control intervention level', '牵引力控制介入强度') }}</small></view><em>{{ levelLabel(vehicle.controls.tcsLevel) }}</em></view><view class="segment four"><button v-for="level in [0,1,2,3]" :key="level" :class="{ 'active-orange': vehicle.controls.tcsLevel===level }" :disabled="!connected || Boolean(operation)" @click="applyControl('tcsLevel', level, 'TCS')">{{ levelLabel(level) }}</button></view></view>
        <view class="setting-block inline-toggle"><view class="setting-title"><view><b>{{ l('Brake Power Cut-off', '刹车断电开关') }}</b><small>{{ l('Cut motor output while braking', '制动时切断电机动力输出') }}</small></view><button class="switch" :class="{ on: vehicle.controls.brakeCutoff }" :disabled="!connected || Boolean(operation)" @click="toggleControl('brakeCutoff', l('Brake cut-off','刹车断电'))"><i /></button></view></view>
        <view class="setting-block inline-toggle"><view class="setting-title"><view><b>{{ l('Tip-over Protection', '倾倒保护设置') }}</b><small>{{ l('Disable drive output after a fall', '车辆倾倒后停止动力输出') }}</small></view><button class="switch" :class="{ on: vehicle.controls.tipOverCutoff }" :disabled="!connected || Boolean(operation)" @click="toggleControl('tipOverCutoff', l('Tip-over protection','倾倒保护'))"><i /></button></view></view>
        <view class="setting-block inline-toggle"><view class="setting-title"><view><b>{{ l('Electronic Parking', '电子驻车设置') }}</b><small>{{ l('Enable electronic parking assist', '启用电子驻车辅助') }}</small></view><button class="switch" :class="{ on: vehicle.controls.electronicParking }" :disabled="!connected || Boolean(operation)" @click="toggleControl('electronicParking', l('Electronic parking','电子驻车'))"><i /></button></view></view>
        <button class="setting-link" @click="openCurve('general')"><view><b>{{ l('Throttle Travel Curve', '转把行程设置') }}</b><small>{{ l('10 × 10 throttle opening / acceleration curve', '10 × 10 转把开度 / 加速度曲线') }}</small></view><span>{{ l('Configure', '设置') }} <ChevronRight :size="15" /></span></button>
        <view class="setting-block"><view class="setting-title"><view><b>{{ l('Creep Level', '蠕行挡位设置') }}</b><small>{{ l('Low-speed creep output level', '低速蠕行的动力输出强度') }}</small></view><em>{{ levelLabel(vehicle.controls.creepLevel) }}</em></view><view class="segment four"><button v-for="level in [0,1,2,3]" :key="level" :class="{ 'active-orange': vehicle.controls.creepLevel===level }" :disabled="!connected || Boolean(operation)" @click="applyControl('creepLevel', level, l('Creep level','蠕行挡位'))">{{ levelLabel(level) }}</button></view></view>
        <view class="setting-block"><view class="setting-title"><view><b>{{ l('Charging Power', '充电功率设置') }}</b><small>{{ l('Nine levels from 400 W to charger maximum', '从 400W 到充电器最大输出，共 9 挡') }}</small></view><em>{{ chargingPowerLabel(vehicle.controls.chargingPower) }}</em></view><view class="power-grid"><button v-for="power in chargingPowerOptions" :key="power" :class="{ active: vehicle.controls.chargingPower===power }" :disabled="!connected || Boolean(operation)" @click="applyControl('chargingPower', power, l('Charging power','充电功率'))">{{ chargingPowerLabel(power) }}</button></view></view>
        <view class="setting-block inline-toggle"><view class="setting-title"><view><b>{{ l('Drift Mode', '滑胎模式') }}</b><small>{{ l('Allow controlled rear-wheel slip', '允许后轮受控滑动') }}</small></view><button class="switch" :class="{ on: vehicle.controls.driftMode }" :disabled="!connected || Boolean(operation)" @click="toggleControl('driftMode', l('Drift mode','滑胎模式'))"><i /></button></view></view>
        <view class="setting-block inline-toggle"><view class="setting-title"><view><b>{{ l('Emergency Charging Mode', '应急充电模式') }}</b><small>{{ l('Use only when standard charging is unavailable', '仅在常规充电不可用时启用') }}</small></view><button class="switch" :class="{ on: vehicle.controls.emergencyCharging }" :disabled="!connected || Boolean(operation)" @click="toggleControl('emergencyCharging', l('Emergency charging','应急充电模式'))"><i /></button></view></view>
      </view>

      <view v-else-if="screen === 'ride'" class="page-content ride-screen">
        <view class="setting-block inline-toggle"><view class="setting-title"><view><b>{{ l('Wheelie Control', '翘头控制开关') }}</b><small>{{ l('Master switch for wheelie assistance', '翘头辅助功能总开关') }}</small></view><button class="switch" :class="{ on: vehicle.controls.wheelieEnabled }" :disabled="!connected || Boolean(operation)" @click="toggleControl('wheelieEnabled', l('Wheelie control','翘头控制'))"><i /></button></view></view>
        <view class="setting-block wheelie-block">
          <view class="setting-title"><view><b>{{ l('Mode Selection', '模式选择') }}</b><small>{{ t('controls.wheelieCopy') }}</small></view><em class="neutral">{{ t(`controls.wheelieOptions.${wheelieMode}`) }}</em></view>
          <button class="risk" data-testid="wheelie-risk-summary" @click="showWheelieDisclaimer()"><TriangleAlert :size="16" /><view><b>{{ t('controls.wheelieRiskTitle') }}</b><small>{{ t('controls.wheelieRiskSummary') }}</small></view><span>{{ t('controls.wheelieDisclaimerReview') }} <ChevronRight :size="14" /></span></button>
          <view class="segment five"><button v-for="option in (['off','practice','advanced','master','custom'] as WheelieMode[])" :key="option" :class="{ 'active-orange': wheelieMode===option }" :disabled="!connected || !vehicle.controls.wheelieEnabled || Boolean(operation)" @click="selectWheelie(option)">{{ t(`controls.wheelieOptions.${option}`) }}</button></view>
          <view v-if="wheelieMode === 'custom'" class="custom-wheelie" :aria-label="t('controls.wheelieAnglePreview', { angle: wheelieMaxAngle })">
            <view class="custom-wheelie-head"><b>{{ t('controls.wheelieMaxAngle') }}</b><strong>{{ wheelieMaxAngle }}°</strong></view>
            <view class="wheelie-stage" :style="{ '--wheelie-angle': `${wheelieMaxAngle}deg` }">
              <view class="wheelie-grid" />
              <view class="wheelie-ground" />
              <view class="wheelie-ray" />
              <view class="wheelie-bike"><image :src="wheelieVehicleImage" mode="aspectFit" /></view>
              <i />
              <text>RAVEN</text>
            </view>
            <view class="segment six angle-options"><button v-for="tick in WHEELIE_ANGLE_TICKS" :key="tick" :class="{ 'active-orange': wheelieMaxAngle===tick }" :disabled="!connected || Boolean(operation)" @click="setWheelieAngle(tick)">{{ tick }}°</button></view>
          </view>
        </view>
      </view>

      <view v-else-if="screen === 'm-mode'" class="page-content settings-screen m-mode-screen">
        <text class="settings-intro">{{ l('M mode applies its own power, torque, speed and safety profile.', 'M 档使用独立的功率、扭矩、车速与安全配置。') }}</text>
        <view class="setting-block range-setting"><view class="setting-title"><view><b>{{ l('Power Output', '功率设置') }}</b><small>30% - MAX (100%)</small></view><em>{{ mRangeDrafts.mPowerPercent === 100 ? 'MAX' : `${mRangeDrafts.mPowerPercent}%` }}</em></view><slider data-testid="m-power-slider" :value="mRangeDrafts.mPowerPercent" :min="30" :max="100" :step="1" active-color="#a4f45a" background-color="#303530" block-color="#a4f45a" :block-size="22" :disabled="!connected || Boolean(operation)" @changing="previewMRange('mPowerPercent', Number($event.detail.value))" @change="commitMRange('mPowerPercent', Number($event.detail.value), l('Power output','功率设置'))"/><view class="range-scale"><span>30%</span><span>MAX</span></view></view>
        <view class="setting-block range-setting"><view class="setting-title"><view><b>{{ l('Torque Output', '扭矩设置') }}</b><small>30% - MAX (100%)</small></view><em>{{ mRangeDrafts.mTorquePercent === 100 ? 'MAX' : `${mRangeDrafts.mTorquePercent}%` }}</em></view><slider data-testid="m-torque-slider" :value="mRangeDrafts.mTorquePercent" :min="30" :max="100" :step="1" active-color="#a4f45a" background-color="#303530" block-color="#a4f45a" :block-size="22" :disabled="!connected || Boolean(operation)" @changing="previewMRange('mTorquePercent', Number($event.detail.value))" @change="commitMRange('mTorquePercent', Number($event.detail.value), l('Torque output','扭矩设置'))"/><view class="range-scale"><span>30%</span><span>MAX</span></view></view>
        <view class="setting-block range-setting"><view class="setting-title"><view><b>{{ l('Speed Limit', '车速限制') }}</b><small>{{ l('30 km/h to vehicle maximum', '30km/h 至车辆最高车速') }}</small></view><em>{{ mRangeDrafts.mSpeedLimit >= 100 ? 'MAX' : `${mRangeDrafts.mSpeedLimit} km/h` }}</em></view><slider data-testid="m-speed-slider" :value="mRangeDrafts.mSpeedLimit" :min="30" :max="100" :step="1" active-color="#a4f45a" background-color="#303530" block-color="#a4f45a" :block-size="22" :disabled="!connected || Boolean(operation)" @changing="previewMRange('mSpeedLimit', Number($event.detail.value))" @change="commitMRange('mSpeedLimit', Number($event.detail.value), l('Speed limit','车速限制'))"/><view class="range-scale"><span>30 km/h</span><span>MAX</span></view></view>
        <button class="setting-link" @click="openCurve('m')"><view><b>{{ l('Throttle Travel Curve', '转把行程设置') }}</b><small>{{ l('Independent 10 × 10 opening / acceleration curve', 'M 档独立 10 × 10 开度 / 加速度曲线') }}</small></view><span>{{ l('Configure', '设置') }} <ChevronRight :size="15" /></span></button>
        <view class="setting-block"><view class="setting-title"><view><b>{{ l('Coasting Energy Recovery', '滑动动能回收') }}</b></view><em>{{ levelLabel(vehicle.controls.mCoastingRegenLevel) }}</em></view><view class="segment four"><button v-for="level in [0,1,2,3]" :key="level" :class="{ 'active-orange': vehicle.controls.mCoastingRegenLevel===level }" :disabled="!connected || Boolean(operation)" @click="applyControl('mCoastingRegenLevel', level, l('M mode coasting recovery','M档滑动动能回收'))">{{ levelLabel(level) }}</button></view></view>
        <view class="setting-block"><view class="setting-title"><view><b>{{ l('Brake Energy Recovery', '制动动能回收') }}</b></view><em>{{ levelLabel(vehicle.controls.mBrakeRegenLevel) }}</em></view><view class="segment four"><button v-for="level in [0,1,2,3]" :key="level" :class="{ 'active-orange': vehicle.controls.mBrakeRegenLevel===level }" :disabled="!connected || Boolean(operation)" @click="applyControl('mBrakeRegenLevel', level, l('M mode brake recovery','M档制动动能回收'))">{{ levelLabel(level) }}</button></view></view>
        <view class="setting-block inline-toggle"><view class="setting-title"><view><b>{{ l('Brake Power Cut-off', '刹车断电设置') }}</b><small>{{ l('M mode brake cut-off', 'M 档独立刹车断电设置') }}</small></view><button class="switch" :class="{ on: vehicle.controls.mBrakeCutoff }" :disabled="!connected || Boolean(operation)" @click="toggleControl('mBrakeCutoff', l('M mode brake cut-off','M档刹车断电'))"><i /></button></view></view>
        <view class="setting-block inline-toggle"><view class="setting-title"><view><b>{{ l('Tip-over Protection', '倾倒保护设置') }}</b><small>{{ l('M mode tip-over protection', 'M 档独立倾倒保护设置') }}</small></view><button class="switch" :class="{ on: vehicle.controls.mTipOverCutoff }" :disabled="!connected || Boolean(operation)" @click="toggleControl('mTipOverCutoff', l('M mode tip-over protection','M档倾倒保护'))"><i /></button></view></view>
      </view>

      <view v-else-if="screen === 'curve'" class="page-content curve-screen">
        <text class="eyebrow">{{ curveProfile === 'm' ? l('M MODE PROFILE','M档独立曲线') : l('GENERAL PROFILE','通用曲线') }} · {{ connected?t('common.connected'):t('common.offline') }}</text><h1>{{ l('Throttle Travel Curve', '转把行程设置') }}</h1>
        <view class="chart-card"><view class="chart-head"><b>10 × 10</b><span>{{ t('controls.curveDrag') }}</span></view><view class="curve-axis curve-axis-y">{{ l('Acceleration','加速度') }}</view><svg data-testid="curve-drag-chart" class="curve-chart-svg" :class="{ dragging: curveDragging }" viewBox="0 0 320 190" :aria-label="t('controls.curveTitle')" @pointerdown="startCurveDrag" @pointermove="dragCurvePoint" @pointerup="stopCurveDrag" @pointercancel="stopCurveDrag"><defs><linearGradient id="zone" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#25301e"/><stop offset="1" stop-color="#101510"/></linearGradient></defs><g stroke="#242824" stroke-width="1"><line v-for="step in 11" :key="`h-${step}`" x1="10" x2="310" :y1="20+(step-1)*16" :y2="20+(step-1)*16"/><line v-for="step in 11" :key="`v-${step}`" y1="20" y2="180" :x1="10+(step-1)*30" :x2="10+(step-1)*30"/></g><path d="M10 20L310 180H10Z" fill="url(#zone)"/><polyline :points="curveValues.map((value,index)=>`${10+index*(300/9)},${180-value*1.6}`).join(' ')" fill="none" stroke="#a4f45a" stroke-width="2"/><g fill="#0b0d0b" stroke="#e9eee8" stroke-width="2"><circle v-for="(value,index) in curveValues" :key="index" :cx="10+index*(300/9)" :cy="180-value*1.6" :r="activeCurve===index?7:6" :fill="activeCurve===index?'#a4f45a':'#0b0d0b'"/></g></svg><view class="curve-axis curve-axis-x">{{ l('Throttle Opening','转把开度') }} (%)</view><view class="point-grid"><button v-for="(value,index) in curveValues" :key="index" :class="{ active: activeCurve===index }" @click="activeCurve=index"><b>{{ value }}%</b><small>P{{ index+1 }}</small></button></view><view class="curve-point-editor"><view><small>{{ l('Selected Point','当前控制点') }}</small><b>P{{ activeCurve+1 }}</b></view><view class="tap-stepper curve-stepper"><button :aria-label="l('Decrease output','降低输出')" :disabled="curveValues[activeCurve]<=selectedCurveMinimum" @click="adjustCurvePoint(-1)"><Minus :size="19" /></button><strong>{{ curveValues[activeCurve] }}%</strong><button :aria-label="l('Increase output','提高输出')" :disabled="curveValues[activeCurve]>=selectedCurveMaximum" @click="adjustCurvePoint(1)"><Plus :size="19" /></button></view></view></view>
        <view class="dual-actions"><button :disabled="operation==='curve'" @click="resetCurve"><RotateCcw :size="16" />{{ t('controls.resetCurve') }}</button><button class="lime-button" :disabled="!connected || operation==='curve'" @click="saveCurve"><LoaderCircle v-if="operation==='curve'" class="spinning" :size="16"/><Save v-else :size="16" />{{ t('controls.saveCurve') }}</button></view>
        <text class="section-label">{{ l('CURVE NOTES','曲线说明') }}</text><view class="note-line"><view><b>{{ l('Horizontal / Vertical', '横轴 / 纵轴') }}</b><small>{{ l('Throttle opening / acceleration, provisional unit', '转把开度 / 加速度，单位暂定') }}</small></view><span>10 × 10</span></view>
      </view>

      <view v-else-if="screen === 'battery'" class="page-content battery-screen">
        <view class="battery-hero-ref"><view class="battery-outline"><i class="battery-fill" :style="{ width: `${vehicle.hasTelemetry ? Math.max(0, Math.min(100, telemetry.soc)) : 0}%` }" /><b>{{ vehicle.hasTelemetry ? `${telemetry.soc}%` : '--' }}</b></view><small>{{ t('home.soc') }}</small></view><view class="battery-grid"><view><small>{{ t('service.stateOfHealth') }}</small><b class="lime-text">{{ vehicle.hasTelemetry ? `${telemetry.soh}%` : '--' }}</b><i><span :style="{width:`${vehicle.hasTelemetry?telemetry.soh:0}%`} " /></i></view><view><small>{{ t('service.packVoltage') }}</small><b>{{ vehicle.hasTelemetry ? telemetry.voltage : '--' }} <em>V</em></b></view><view><small>{{ t('service.temperature') }}</small><b>{{ vehicle.hasTelemetry ? telemetry.batteryTemp : '--' }} <em>°C</em></b></view><view><small>{{ t('service.cycles') }}</small><b>{{ vehicle.hasTelemetry ? telemetry.cycles : '--' }}</b></view><view><small>{{ t('service.batteryCapacity') }}</small><b>{{ vehicle.hasTelemetry ? telemetry.batteryCapacity : '--' }} <em>Ah</em></b></view><view><small>{{ l('Connection', '连接状态') }}</small><b>{{ connected ? t('common.connected') : t('common.offline') }}</b></view></view><text class="section-label">{{ l('BATTERY NOTES', '电池说明') }}</text><view class="note-line"><view><b>{{ l('Last Sync', '最近同步') }}</b><small>{{ t('service.snapshot') }}</small></view><span>{{ vehicle.lastTelemetryAt ? new Date(vehicle.lastTelemetryAt).toLocaleTimeString(isZh ? 'zh-CN' : 'en-GB') : l('Not synced', '尚未同步') }}</span></view>
      </view>

      <view v-else-if="screen === 'status'" class="page-content status-screen">
        <view class="status-vehicle"><image :src="bikeImage" mode="aspectFit"/><view><b>{{ vehicleName }}</b><small>X1 {{ l('Off-road Series', '越野系列') }} · {{ vehicle.vehicle?.model || 'BX-01' }}</small><small>{{ vehicle.vehicle?.serialNumber || '--' }}</small></view><em>{{ connected ? t('common.connected') : t('common.offline') }}</em></view><view class="status-metrics"><view><small>{{ t('service.motorTemp') }}</small><b>{{ vehicle.hasTelemetry ? `${telemetry.motorTemp}°C` : '--' }}</b></view><view><small>{{ t('service.controllerTemp') }}</small><b>{{ vehicle.hasTelemetry ? `${telemetry.controllerTemp}°C` : '--' }}</b></view><view><small>{{ t('service.currentDraw') }}</small><b>{{ vehicle.hasTelemetry ? `${telemetry.current} A` : '--' }}</b></view><view><small>{{ t('service.batteryTemperature') }}</small><b>{{ vehicle.hasTelemetry ? `${telemetry.batteryTemp}°C` : '--' }}</b></view></view><text class="section-label">{{ t('service.moduleVersions') }}</text><view class="line-list module-list"><view v-for="(item,index) in modules" :key="item"><view class="round-icon"><Settings2 :size="15" /></view><view><b>{{ item }}</b><small>{{ l('Version', '版本') }} {{ ['2.3.1','3.8.0','1.9.4','1.4.2 → 1.5.0'][index] }}</small></view><em :class="{ orange:index===3 }">{{ index===3?t('service.versionPending'):t('service.versionLatest') }}</em></view></view><text class="section-label">{{ t('service.identity') }}</text><view class="note-line"><b>{{ t('service.model') }}</b><span>{{ vehicle.vehicle?.model || '--' }}</span></view><view class="note-line"><b>{{ t('service.bleName') }}</b><span>{{ vehicle.vehicle?.bluetoothName || '--' }}</span></view>
      </view>

      <view v-else-if="screen === 'diagnostics'" class="page-content diagnostics-screen">
        <view class="diagnostic-hero"><view class="progress-circle"><b>{{ diagnosisProgress }}%</b><small>{{ t('diagnosis.complete') }}</small></view><h2>{{ l('Three Vehicle Checks', '三项车况检测') }}</h2><p>{{ l('Battery, controller MCU and instrument cluster', '检测电池、控制器（MCU）与仪表') }}</p></view><view class="line-list diagnostic-list"><view v-for="(item,index) in diagnosis.items" :key="item.id"><i :class="item.status" /><view><b>{{ diagnosticModules[index] }}</b><small>{{ item.code || (item.status==='checking'?l('Scanning module','正在扫描模块'):item.status==='ok'?t('diagnosis.messages.ok'):t('diagnosis.waiting')) }}</small></view><span :class="item.status">{{ item.status==='pending'?t('diagnosis.status.pending'):item.status==='checking'?t('diagnosis.status.checking'):item.status==='ok'?t('diagnosis.status.ok'):t('diagnosis.status.warning') }}</span></view></view><text class="section-label">{{ l('DIAGNOSTIC INFO', '诊断说明') }}</text><button v-if="diagnosis.latest" class="note-line result-link" @click="navigate('/pages/service/diagnosis-result')"><view><b>{{ t('diagnosis.viewLatest') }}</b><small>{{ l('Fault codes, descriptions and recommended actions', '查看故障码、故障说明和处理建议') }}</small></view><ChevronRight :size="15" /></button><view v-else class="note-line"><view><b>{{ l('A full scan takes about 30 seconds', '完整扫描大约需要 30 秒') }}</b><small>{{ l('Keep the bike stationary and Bluetooth connected during the scan', '扫描期间请保持车辆静止并维持蓝牙连接') }}</small></view></view>
      </view>

      <view v-else-if="screen === 'ota'" class="page-content ota-screen">
        <view class="ota-hero-ref"><view><CloudDownload :size="27" /></view><h2>{{ t('ota.updateCount', { count: ota.updateCount }) }}</h2><p>{{ t('ota.centerCopy') }}</p></view><text class="section-label">{{ t('ota.vehicleModules') }}</text><view class="line-list ota-list"><button v-for="(item,index) in ota.modules" :key="item.id" @click="openOtaModule(index)"><view class="round-icon"><Settings2 :size="15" /></view><view><b>{{ otaModuleName(item.id, item.name) }}</b><small>v{{ item.currentVersion }} → v{{ item.targetVersion }}</small></view><em :class="{ latest:!item.hasUpdate }">{{ item.hasUpdate?t('ota.update'):t('ota.latestShort') }}</em><ChevronRight :size="15" /></button></view><text class="section-label">{{ l('UPDATE REQUIREMENTS', '更新要求') }}</text><view class="note-line"><view><b>{{ l('Bike stationary', '车辆静止') }} · {{ l('Battery', '电量') }} {{ telemetry.soc }}% · Bluetooth {{ connected?t('common.connected'):t('common.offline') }}</b><small>{{ l('Keep the bike powered and do not ride during update', '更新期间请保持车辆供电且不要骑行') }}</small></view></view><button class="outline-action" :disabled="operation==='ota'" @click="checkUpdates"><RefreshCw :class="{ spinning:operation==='ota' }" :size="16" />{{ operation==='ota'?t('ota.checking'):t('ota.check') }}</button>
      </view>

      <view v-else-if="screen === 'vehicle'" class="page-content vehicle-screen">
        <template v-if="vehicle.isBound">
          <image class="vehicle-large" :src="bikeImage" mode="aspectFit"/>
          <h2>{{ vehicleName }}</h2><p>X1 {{ l('Off-road Series', '越野系列') }} · {{ vehicle.vehicle?.model }}</p><p>VIN {{ vehicle.vehicle?.vin || '--' }}</p>
          <view class="vehicle-actions"><button data-testid="raven-rename-vehicle" @click="openRenameVehicle"><Pencil :size="16"/>{{ t('bind.rename') }}</button><button data-testid="raven-unbind-vehicle" @click="unbindRavenVehicle"><Unlink :size="16"/>{{ t('bind.unbind') }}</button></view>
        </template>
        <view v-else class="vehicle-empty-state"><view><Unlink :size="22"/></view><h2>{{ t('bind.title') }}</h2><p>{{ t('bind.waiting') }}</p></view>
        <view class="search-panel"><view class="search-icon" :class="{ searching: vehicleSearchState === 'searching' }"><LoaderCircle v-if="vehicleSearchState === 'searching'" class="spinning" :size="24"/><Search v-else :size="24"/></view><h2>{{ vehicleSearchTitle }}</h2><p>{{ vehicleSearchCopy }}</p><button :disabled="vehicleSearchState === 'searching'" data-testid="raven-search-vehicle" @click="searchNearbyVehicles"><LoaderCircle v-if="vehicleSearchState === 'searching'" class="spinning" :size="18"/><Search v-else :size="18"/>{{ vehicleSearchState === 'searching' ? t('bind.scanning') : vehicleSearchState === 'results' ? t('bind.searchAgain') : t('bind.startSearch') }}</button></view>
        <template v-if="vehicleSearchState === 'results'"><text class="section-label">{{ t('bind.nearby') }}</text><view class="line-list vehicle-result-list"><button v-for="item in vehicle.availableVehicles" :key="item.id" :data-testid="`raven-bind-${item.id}`" @click="bindRavenVehicle(item.id)"><Bike :size="18"/><view><b>{{ item.displayName || item.name }}</b><small>{{ item.model }} · {{ item.serialNumber }}</small></view><em>{{ t('bind.bind') }}</em></button></view></template>
        <template v-else-if="vehicle.isBound"><text class="section-label">{{ l('CURRENT BINDING', '当前绑定') }}</text><view class="note-line"><view><b>{{ vehicle.vehicle?.serialNumber }}</b><small>{{ connected?l('Connected now','当前已连接'):l('Tap Home to connect again','返回首页可重新连接') }}</small></view><em class="bound">{{ t('bind.bound') }}</em></view></template>
      </view>

      <view v-else-if="screen === 'service'" class="page-content service-screen">
        <h1>{{ t('resources.heading') }}</h1><p>{{ t('resources.copy') }}<br/>{{ l('Resources apply across all models', '资料适用于全部车型') }}</p>
        <text class="section-label">{{ t('resources.count', { count: resources.length }) }}</text>
        <view class="line-list resource-list-ref">
          <button v-for="item in resources" :key="item.id" :class="{ 'is-downloaded': downloadedResourceIds.includes(item.id) }" :disabled="Boolean(downloadingResourceId)" :aria-label="t(downloadedResourceIds.includes(item.id) ? 'resources.openLabel' : 'resources.downloadLabel', { name: item.name })" :data-testid="`download-${item.id}`" @click="handleResourceAction(item)">
            <component :is="item.icon" :size="18"/><view><b>{{ item.name }}</b><small>{{ item.detail }}</small><small class="resource-file">{{ item.fileName }}</small></view>
            <LoaderCircle v-if="downloadingResourceId === item.id" class="spinning resource-state" :size="17" />
            <FolderOpen v-else-if="downloadedResourceIds.includes(item.id)" class="resource-state done" :size="19" />
            <Download v-else class="resource-state" :size="19" />
          </button>
        </view>
        <text class="section-label">{{ t('service.contactTitle') }}</text>
        <view class="contact-list-ref">
          <button data-testid="service-phone" @click="callService"><Phone :size="18"/><view><small>{{ t('service.contactHotline') }}</small><b>{{ SERVICE_PHONE }}</b></view><ChevronRight :size="15"/></button>
          <button data-testid="service-email" @click="copyServiceEmail"><Mail :size="18"/><view><small>{{ t('service.contactEmail') }}</small><b>{{ SERVICE_EMAIL }}</b></view><ChevronRight :size="15"/></button>
          <view><CalendarDays :size="18"/><view><small>{{ t('service.contactHours') }}</small><b>{{ t('service.workHours') }}</b></view></view>
        </view>
      </view>

      <view v-else class="page-content profile-screen">
        <button class="status-vehicle profile-bike" @click="open('vehicle')"><image :src="bikeImage" mode="aspectFit"/><view><b>{{ vehicleName }}</b><small>X1 {{ l('Off-road Series', '越野系列') }} · {{ vehicle.vehicle?.model || '--' }}</small><small>{{ vehicle.vehicle?.serialNumber || t('common.noVehicle') }}</small></view><em>{{ vehicle.isBound?t('bind.bound'):t('bind.unbound') }}</em></button>
        <text class="section-label">{{ t('me.settings') }}</text>
        <view class="line-list profile-list">
          <button
            data-testid="language-select-trigger"
            :aria-expanded="languageModalOpen"
            aria-haspopup="dialog"
            @click="openLanguageModal"
          ><Languages :size="16"/><b>{{ t('me.language') }}</b><span>{{ currentLanguageLabel }} <ChevronRight :size="14"/></span></button>
          <button @click="navigate('/pages/me/app-update')"><RefreshCw :size="16"/><b>{{ t('me.appUpdate') }}</b><span>{{ t('appUpdate.available') }} <ChevronRight :size="14"/></span></button>
          <button @click="open('ota')"><CloudDownload :size="16"/><b>{{ t('me.firmwareUpdates') }}</b><span>{{ t('ota.updateCount', { count: ota.updateCount }) }} <ChevronRight :size="14"/></span></button>
          <button @click="clearCache"><RotateCcw :size="16"/><b>{{ t('me.clearCache') }}</b><span>{{ cacheSize }} <ChevronRight :size="14"/></span></button>
        </view>
        <text class="section-label">{{ t('me.legalCompany') }}</text>
        <view class="line-list profile-list"><button @click="navigate('/pages/me/legal?type=terms')"><FileText :size="16"/><b>{{ t('me.userAgreement') }}</b><ChevronRight :size="14"/></button><button @click="navigate('/pages/me/legal?type=privacy')"><ShieldCheck :size="16"/><b>{{ t('me.privacy') }}</b><ChevronRight :size="14"/></button><button @click="navigate('/pages/me/about')"><Globe2 :size="16"/><b>{{ t('me.about') }}</b><ChevronRight :size="14"/></button></view><view class="note-line version"><b>{{ l('Current Version', '当前版本') }}</b><span>{{ l('Version', '版本') }} 1.0.0</span></view><p class="local-note-ref">{{ t('me.localDataNote') }}</p>
      </view>
    </scroll-view>

    <button v-if="bottomAction" class="fixed-action" :disabled="operation!=='' || (screen!=='diagnostics' && !connected)" @click="handleBottomAction"><RefreshCw v-if="screen==='status'" :class="{ spinning:operation==='refresh' }" :size="17"/><Activity v-else-if="screen==='diagnostics'" :class="{ spinning:diagnosis.running }" :size="17"/><LoaderCircle v-else-if="operation!==''" class="spinning" :size="17"/><Check v-else :size="17"/>{{ bottomAction }}</button>
    <view v-if="showTabs" class="bottom-tabs"><button :class="{active:screen==='dashboard'}" @click="tab('dashboard')"><House :size="20"/><span>{{ t('tabs.home') }}</span></button><button :class="{active:screen==='controls'}" @click="tab('controls')"><Bike :size="20"/><span>{{ t('tabs.controls') }}</span></button><button :class="{active:screen==='service'}" @click="tab('service')"><Wrench :size="20"/><span>{{ t('tabs.service') }}</span></button><button :class="{active:screen==='profile'}" @click="tab('profile')"><UserRound :size="20"/><span>{{ t('tabs.me') }}</span></button></view>
    <AppModalShell :open="wheelieDisclaimerOpen" :title="t('controls.wheelieDisclaimerTitle')" tone="danger" icon="TriangleAlert" data-testid="wheelie-disclaimer" @dismiss="dismissWheelieDisclaimer">
      <view class="wheelie-disclaimer-copy">
        <text>{{ t('controls.wheelieDisclaimerRisk') }}</text>
        <text>{{ t('controls.wheelieDisclaimerTraining') }}</text>
        <text>{{ t('controls.wheelieDisclaimerProtection') }}</text>
        <text>{{ t('controls.wheelieDisclaimerResponsibility') }}</text>
      </view>
      <button class="wheelie-disclaimer-check" role="checkbox" :aria-checked="wheelieDisclaimerAcknowledged" data-testid="wheelie-disclaimer-check" @click="wheelieDisclaimerAcknowledged = !wheelieDisclaimerAcknowledged"><i :class="{ checked: wheelieDisclaimerAcknowledged }"><Check v-if="wheelieDisclaimerAcknowledged" :size="14" /></i><span>{{ t('controls.wheelieDisclaimerAcknowledge') }}</span></button>
      <template #actions><button class="modal-secondary" @click="dismissWheelieDisclaimer">{{ t('common.cancel') }}</button><button class="modal-danger" :disabled="!wheelieDisclaimerAcknowledged" data-testid="wheelie-disclaimer-confirm" @click="acceptWheelieDisclaimer">{{ pendingWheelieMode ? t('controls.wheelieDisclaimerAgree') : t('common.done') }}</button></template>
    </AppModalShell>
    <AppModalShell :open="renameVehicleOpen" :title="t('bind.renameTitle')" :content="t('bind.renameCopy')" icon="UserPen" data-testid="raven-rename-modal" @dismiss="closeRenameVehicle">
      <view class="rename-vehicle-field"><input v-model="vehicleNameDraft" :maxlength="12" :placeholder="t('bind.renamePlaceholder')" confirm-type="done" @confirm="saveVehicleName"/><text>{{ vehicleNameDraft.length }}/12</text></view>
      <template #actions><button class="modal-secondary" @click="closeRenameVehicle">{{ t('common.cancel') }}</button><button class="modal-primary" data-testid="raven-save-vehicle-name" @click="saveVehicleName">{{ t('common.save') }}</button></template>
    </AppModalShell>
    <AppModalShell :open="languageModalOpen" :title="t('me.chooseLanguage')" icon="Languages" data-testid="language-modal" @dismiss="closeLanguageModal">
      <view class="language-modal-list" data-testid="language-options" role="listbox" :aria-label="t('me.chooseLanguage')">
        <button
          v-for="option in languageOptions"
          :key="option.value"
          class="language-modal-option"
          :class="{ active: app.preferences.language === option.value }"
          :data-testid="`language-option-${option.value}`"
          role="option"
          :aria-selected="app.preferences.language === option.value"
          @click="selectLanguage(option)"
        >
          <span>{{ t(option.labelKey) }}</span>
          <Check v-if="app.preferences.language === option.value" :size="18"/>
        </button>
      </view>
    </AppModalShell>
    <AppModalShell :open="gearModalOpen" :title="l('Select Ride Gear', '选择当前档位')" icon="Gauge" data-testid="gear-modal" @dismiss="closeGearModal">
      <view class="gear-modal-list" role="listbox" :aria-label="l('Select Ride Gear', '选择当前档位')">
        <button
          v-for="option in gearOptions"
          :key="option.value"
          class="gear-modal-option"
          :class="{ active: vehicle.controls.rideGear === option.value }"
          :data-testid="`gear-option-${option.value}`"
          role="option"
          :aria-selected="vehicle.controls.rideGear === option.value"
          :disabled="Boolean(operation)"
          @click="selectGear(option.value)"
        >
          <view><b>{{ option.label }}</b><small>{{ option.detail }}</small></view>
          <LoaderCircle v-if="operation === 'rideGear' && pendingGear === option.value" class="spinning" :size="18" />
          <Check v-else-if="vehicle.controls.rideGear === option.value" :size="18" />
        </button>
      </view>
    </AppModalShell>
    <view class="home-indicator" />
    <AppFeedbackHost />
  </view>
</template>

<style scoped lang="scss">
.raven-app { --lime:#a4f45a; --orange:#d8703a; --teal:#35c6bd; --line:#242824; --muted:#747a74; --surface:#141714; --ink:#f2f4f0; --v3-divider:#303530; --v3-shadow-raised:0 18px 48px rgba(0,0,0,.55); --bs-vi-sys-color-background-overlay:rgba(0,0,0,.76); --bs-vi-sys-color-status-danger-background:#2e1715; height: min(100dvh,932px); display:flex; flex-direction:column; overflow:hidden; color:#f2f4f0; background:#080a09; font-family:Arial,"PingFang SC",sans-serif; }
.raven-app button { border:0; background:transparent; color:inherit; font:inherit; line-height:normal; letter-spacing:0; }
.raven-app button::after { border:0; }
.raven-app button[disabled] { color:inherit; }
.ios-bar { display:flex; height:28px; flex:0 0 28px; padding:0 17px; align-items:center; justify-content:space-between; font-size:11px; font-weight:700; }
.ios-icons { display:flex; align-items:center; gap:5px; }.ios-icons i:nth-child(1){width:15px;height:10px;background:linear-gradient(90deg,transparent 0 10%,#eee 10% 20%,transparent 20% 30%,#eee 30% 45%,transparent 45% 55%,#eee 55% 75%,transparent 75% 82%,#eee 82%)}.ios-icons i:nth-child(2){width:14px;height:9px;border-top:2px solid #eee;border-radius:50%}.ios-icons i:nth-child(3){width:22px;height:9px;border:1px solid #eee;border-radius:2px}
.topbar { display:grid; height:49px; flex:0 0 49px; padding:0 14px; grid-template-columns:72px 1fr 72px; align-items:center; border-bottom:1px solid var(--line); }.top-icon{display:grid;width:38px;height:38px;place-items:center}.top-icon.end{grid-column:3;justify-self:end}.top-title{text-align:center;font-size:13px;font-weight:700}.top-logo{width:72px;height:22px;justify-self:center}.top-connected{display:flex;min-width:72px;height:38px;padding:0;align-items:center;justify-content:flex-end;gap:4px;color:#b4baaf;font-size:8px;white-space:nowrap}.top-connected i{width:5px;height:5px;border-radius:50%;background:var(--lime)}.top-connected i.offline{background:#656b65}.top-help{font-size:12px;text-align:right;color:#ddd}
.screen-scroll { flex:1; min-height:0; }.screen-scroll.has-tabs{padding-bottom:66px}.screen-scroll.has-action{padding-bottom:66px}.page-content{padding:18px 16px 24px}.section-label{display:block;margin:20px 0 10px;color:#5f655f;font-size:9px;font-weight:700}.eyebrow,.center-label{display:block;color:#747a74;font-size:9px}.center-label{text-align:center;margin-top:13px}.page-content h1{margin:5px 0 12px;font-size:24px;line-height:1.1}.page-content h2{margin:0;font-size:16px}.page-content p{margin:5px 0;color:var(--muted);font-size:9px;line-height:1.55}.line-list{border-top:1px solid var(--line)}.line-list>view,.line-list>button{border-bottom:1px solid var(--line)}small{display:block;color:var(--muted);font-size:8px;line-height:1.45}b{font-size:12px}.round-icon{display:grid;width:28px;height:28px;flex:0 0 28px;place-items:center;border:1px solid #303530;border-radius:50%;color:#aeb4ae;background:#151815}.round-icon.lime{color:var(--lime)}.round-icon.orange{color:var(--orange)}.round-icon.teal{color:var(--teal)}
.bike-stage{height:184px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid var(--line)}.bike-stage image{width:88%;height:176px}.model-line{display:flex;height:54px;margin:0 16px;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.model-line>view{display:flex;flex-direction:column}.model-line .model{font-size:22px;font-weight:800}.model-line>view>text:last-child,.model-line>text{color:var(--muted);font-size:8px}.metrics{display:grid;margin:0 16px;border-bottom:1px solid var(--line)}.metrics.three{grid-template-columns:repeat(3,1fr)}.metrics>view{display:flex;min-height:55px;flex-direction:column;align-items:center;justify-content:center}.metrics>view+view{border-left:1px solid var(--line)}.metrics b{font-size:15px}.metrics span{margin-top:5px;color:var(--muted);font-size:7px}.data-row{display:flex;width:calc(100% - 32px);min-height:49px;margin:0 16px;padding:8px 0;align-items:center;gap:9px;border-bottom:1px solid var(--line);text-align:left}.data-row>view:nth-child(2){display:flex;flex-direction:column;gap:3px}.row-end{margin-left:auto;text-align:right}.quick-strip{display:grid;margin:0 16px;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--line)}.quick-strip button{display:flex;height:47px;align-items:center;justify-content:center;gap:5px;font-size:8px}.quick-strip button+button{border-left:1px solid var(--line)}.quick-strip em{display:grid;width:13px;height:13px;place-items:center;border-radius:50%;background:var(--lime);color:#111;font-size:7px;font-style:normal}
.dashboard-data-grid{display:grid;margin:0 16px;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.dashboard-data-item{display:flex;min-width:0;min-height:70px;padding:11px 10px;align-items:center;gap:10px;text-align:left}.dashboard-data-item--compact{flex-direction:column;align-items:flex-start;justify-content:center}.dashboard-data-item--odometer{grid-column:1/-1}.dashboard-data-item>view:last-child{display:flex;min-width:0;flex-direction:column;gap:4px}.dashboard-data-item b{white-space:nowrap}
.vehicle-summary,.status-vehicle{display:flex;width:100%;min-height:74px;padding:10px 0;align-items:center;gap:10px;border-bottom:1px solid var(--line);text-align:left}.vehicle-summary image,.status-vehicle image{width:92px;height:64px}.vehicle-summary>view,.status-vehicle>view{display:flex;min-width:0;flex:1;flex-direction:column;gap:4px}.vehicle-summary>em,.status-vehicle>em{color:var(--lime);font-size:8px;font-style:normal}.control-row{display:flex;min-height:63px;padding:10px 0;align-items:center;gap:10px}.control-row>view:nth-child(2){flex:1}.switch{position:relative;width:35px;height:20px;border-radius:12px;background:#424742}.switch i{position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#e5e8e4}.switch.on{background:var(--lime)}.switch.on i{left:18px;background:#182010}.switch:disabled{opacity:.45}.tune-list button{display:flex;width:100%;min-height:59px;padding:9px 0;align-items:center;text-align:left}.tune-list button>view{display:flex;flex:1;flex-direction:column;gap:4px}.tune-list span{display:flex;align-items:center;gap:5px;color:#a1a7a1;font-size:8px}
.segment{display:grid}.setting-block{padding:16px 0;border-bottom:1px solid var(--line)}.ride-screen .setting-block:first-child{padding-top:4px}.setting-title{display:flex;align-items:flex-start;justify-content:space-between}.setting-title>view{display:flex;min-width:0;flex:1;flex-direction:column;gap:4px}.setting-title em{flex:0 0 auto;color:var(--orange);font-size:10px;font-style:normal}.setting-title em.neutral{color:#eee}.segment{height:38px;margin-top:14px;overflow:hidden;border:1px solid var(--line);border-radius:8px}.segment.three{grid-template-columns:repeat(3,1fr)}.segment.four{grid-template-columns:repeat(4,1fr)}.segment.five{grid-template-columns:repeat(5,1fr)}.segment button{min-width:0;border-right:1px solid var(--line);color:#696f69;font-size:7px}.segment button:last-child{border-right:0}.segment .active-orange{color:#df824e;background:#452c22}.risk{display:flex;width:100%;min-height:52px;margin-top:12px;padding:8px 10px;align-items:center;gap:8px;border:1px solid rgba(210,77,64,.42);border-radius:8px;color:#df5e52;font-size:9px;text-align:left}.risk>view{display:flex;min-width:0;flex:1;flex-direction:column;gap:3px}.risk b{color:#ed7669;font-size:11px}.risk small{color:#a87873;font-size:9px}.risk span{display:flex;flex:0 0 auto;align-items:center;gap:2px;font-size:9px}
.chart-card{padding:12px;margin-top:10px;border:1px solid #303530}.chart-head{display:flex;justify-content:space-between;font-size:8px}.chart-head span{color:var(--muted)}.chart-card svg{width:100%;height:auto;margin:10px 0}.point-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.point-grid button{height:39px;border:1px solid #2c312c}.point-grid button.active{border-color:var(--lime);color:var(--lime)}.point-grid b{font-size:11px}.point-grid small{margin-top:2px}.dual-actions{display:grid;margin-top:12px;grid-template-columns:1fr 1fr;gap:8px}.dual-actions button,.outline-action{display:flex;height:43px;align-items:center;justify-content:center;gap:8px;border:1px solid #303530;font-size:10px}.lime-button{border-color:var(--lime)!important;background:var(--lime);color:#111!important}.lime-button:disabled,.fixed-action:disabled{opacity:.45}.note-line{display:flex;width:100%;min-height:54px;padding:11px 0;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);text-align:left}.note-line>view{display:flex;flex-direction:column;gap:4px}.note-line span{color:#969c96;font-size:8px}.result-link{color:#eef2ec}
.stepper{display:grid;width:78%;height:58px;margin:15px auto 10px;grid-template-columns:50px 1fr 50px;border:1px solid #303530}.stepper button{display:grid;place-items:center}.stepper b{display:flex;align-items:center;justify-content:center;gap:5px;font-size:26px}.stepper small{display:inline;font-size:8px}.preset{display:flex;justify-content:center;gap:10px}.preset button{height:26px;padding:0 14px;border:1px solid #2b302b;color:#686e68;font-size:8px}.preset button.active{border-color:var(--lime);color:var(--lime)}.guide>view{display:flex;min-height:62px;padding:12px 0;align-items:center;gap:10px;border-bottom:1px solid var(--line)}.guide i{display:grid;width:22px;height:22px;place-items:center;border:1px solid #32412a;border-radius:50%;color:var(--lime);font-size:9px;font-style:normal}.guide div{display:flex;flex-direction:column;gap:4px}.warning{display:flex;height:39px;margin-top:16px;padding:0 10px;align-items:center;gap:6px;border:1px solid rgba(210,77,64,.4);color:#df5e52;font-size:8px}
.battery-hero-ref{display:flex;height:180px;flex-direction:column;align-items:center;justify-content:center;gap:12px}.battery-outline{position:relative;display:grid;width:156px;height:76px;place-items:center;border:4px solid #f0f2ee}.battery-outline::after{position:absolute;right:-9px;width:6px;height:24px;background:#f0f2ee;content:''}.battery-outline b{font-size:30px}.battery-grid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line)}.battery-grid>view{position:relative;display:flex;min-height:73px;padding:13px 0;flex-direction:column;gap:9px;border-bottom:1px solid var(--line)}.battery-grid>view:nth-child(odd){padding-right:12px;border-right:1px solid var(--line)}.battery-grid>view:nth-child(even){padding-left:12px}.battery-grid b{font-size:17px}.battery-grid b em{font-size:8px;font-style:normal}.lime-text{color:var(--lime)}.battery-grid>view>i{position:absolute;right:12px;bottom:8px;left:0;height:3px;background:#303530}.battery-grid>view>i span{display:block;width:96%;height:100%;background:var(--lime)}
.status-vehicle{padding-top:0}.status-metrics{display:grid;grid-template-columns:1fr 1fr}.status-metrics>view{display:flex;min-height:72px;padding:13px 0;flex-direction:column;gap:8px;border-bottom:1px solid var(--line)}.status-metrics>view:nth-child(odd){border-right:1px solid var(--line)}.status-metrics>view:nth-child(even){padding-left:16px}.status-metrics b{font-size:18px}.module-list>view,.ota-list>button{display:flex;width:100%;min-height:55px;align-items:center;gap:9px;text-align:left}.module-list>view>view:nth-child(2),.ota-list>button>view:nth-child(2){display:flex;flex:1;flex-direction:column;gap:3px}.module-list em,.ota-list em{padding:4px 6px;border-radius:8px;color:var(--lime);background:#172713;font-size:7px;font-style:normal}.module-list em.orange,.ota-list em{color:#df824e;background:#2c1e17}.ota-list em.latest{color:var(--lime);background:#172713}
.diagnostic-hero,.ota-hero-ref{display:flex;height:150px;flex-direction:column;align-items:center;justify-content:center;text-align:center}.diagnostic-hero h2,.ota-hero-ref h2{margin-top:12px}.progress-circle{display:grid;width:65px;height:65px;place-items:center;align-content:center;border:1px solid #343934;border-radius:50%}.progress-circle b{font-size:21px}.ota-hero-ref>view{display:grid;width:52px;height:52px;place-items:center;border:1px solid rgba(216,112,58,.55);border-radius:50%;color:var(--orange)}.diagnostic-list>view{display:flex;min-height:61px;align-items:center;gap:10px}.diagnostic-list>view>i{width:26px;height:26px;border:1px dashed #555;border-radius:50%}.diagnostic-list>view>i.checking{border-color:var(--orange);animation:spin 1s linear infinite}.diagnostic-list>view>i.ok{border-style:solid;border-color:var(--lime);box-shadow:inset 0 0 0 8px #172713}.diagnostic-list>view>i.warning{border-style:solid;border-color:#df5e52}.diagnostic-list>view>view{display:flex;flex:1;flex-direction:column;gap:3px}.diagnostic-list span{color:#8a908a;font-size:8px}.diagnostic-list span.ok{color:var(--lime)}.diagnostic-list span.warning{color:#df5e52}.outline-action{width:100%;margin-top:16px}
.vehicle-screen{text-align:center}.vehicle-large{width:86%;height:160px}.vehicle-screen h2{font-size:17px}.vehicle-actions{display:grid;height:50px;margin-top:12px;overflow:hidden;grid-template-columns:1fr 1fr;border-top:1px solid var(--line);border-bottom:1px solid var(--line);border-radius:8px}.vehicle-actions button{display:flex;align-items:center;justify-content:center;gap:7px;font-size:9px}.vehicle-actions button+button{border-left:1px solid var(--line);color:#df5e52}.vehicle-empty-state{display:flex;min-height:160px;flex-direction:column;align-items:center;justify-content:center;border-bottom:1px solid var(--line)}.vehicle-empty-state>view{display:grid;width:48px;height:48px;margin-bottom:12px;place-items:center;border:1px solid #3b413b;border-radius:50%;color:#858b85}.search-panel{display:flex;padding:20px 0;flex-direction:column;align-items:center;border-bottom:1px solid var(--line)}.search-icon{display:grid;width:42px;height:42px;place-items:center;border:1px solid var(--teal);border-radius:50%;color:var(--teal)}.search-icon.searching{animation:pulse 1s ease-in-out infinite}.search-panel h2{margin-top:10px}.search-panel button{display:flex;width:170px;height:40px;margin-top:12px;align-items:center;justify-content:center;gap:7px;border:1px solid var(--teal);border-radius:8px;color:var(--teal);font-size:9px}.search-panel button:disabled{opacity:.5}.vehicle-result-list>button{display:flex;width:100%;min-height:66px;padding:10px 0;align-items:center;gap:11px;text-align:left}.vehicle-result-list>button>view{display:flex;min-width:0;flex:1;flex-direction:column;gap:4px}.vehicle-result-list>button>svg{color:var(--teal)}.vehicle-result-list em{padding:5px 10px;border-radius:8px;background:#172713;color:var(--lime);font-size:9px;font-style:normal}.bound{padding:4px 8px;border-radius:8px;color:var(--lime);background:#172713;font-size:7px;font-style:normal}
.service-screen h1{font-size:22px}.service-screen>p{padding-bottom:14px;border-bottom:1px solid var(--line)}.resource-list-ref>button{display:flex;width:100%;min-height:60px;align-items:center;gap:12px;text-align:left}.resource-list-ref>button:disabled{opacity:.6}.resource-list-ref>button>view{display:flex;min-width:0;flex:1;flex-direction:column;gap:4px}.resource-file{overflow:hidden;color:#555b55;text-overflow:ellipsis;white-space:nowrap}.resource-state{flex:0 0 auto;color:var(--orange)}.resource-state.done{color:var(--lime)}.contact-list-ref{overflow:hidden;border:1px solid var(--line);border-radius:8px}.contact-list-ref>button,.contact-list-ref>view{display:flex;width:100%;min-height:65px;padding:10px 12px;align-items:center;gap:11px;text-align:left}.contact-list-ref>*+*{border-top:1px solid var(--line)}.contact-list-ref>button>view,.contact-list-ref>view>view{display:flex;min-width:0;flex:1;flex-direction:column;gap:5px}.contact-list-ref>button>svg:first-child,.contact-list-ref>view>svg:first-child{color:var(--teal)}.contact-list-ref b{overflow-wrap:anywhere}
.profile-bike{margin-bottom:16px}.profile-list button{display:flex;width:100%;min-height:53px;align-items:center;gap:10px;text-align:left}.profile-list button b{flex:1;font-size:10px}.profile-list button span{display:flex;align-items:center;gap:6px;color:#858b85;font-size:7px}.profile-list button>svg:last-child{margin-left:auto}.version{margin-top:10px}.local-note-ref{text-align:center!important;margin-top:15px!important}
.language-modal-list{display:grid;gap:8px;margin-top:18px}
.raven-app .language-modal-option{display:flex;width:100%;min-height:50px;padding:0 14px;align-items:center;justify-content:space-between;border:1px solid #343a34;border-radius:8px;background:#0f120f;color:#c6cbc5;text-align:left}
.language-modal-option span{font-size:13px;font-weight:700}
.raven-app .language-modal-option.active{border-color:var(--lime);background:rgba(164,244,90,.08);color:var(--lime)}
.gear-modal-list{display:grid;gap:8px;margin-top:18px}
.raven-app .gear-modal-option{display:flex;width:100%;min-height:58px;padding:8px 14px;align-items:center;justify-content:space-between;gap:12px;border:1px solid #343a34;border-radius:8px;background:#0f120f;color:#c6cbc5;text-align:left}
.gear-modal-option>view{display:flex;min-width:0;flex:1;flex-direction:column;gap:4px}.gear-modal-option b{font-size:13px}.gear-modal-option small{color:#7f867f;font-size:10px}.raven-app .gear-modal-option.active{border-color:var(--lime);background:rgba(164,244,90,.08);color:var(--lime)}.gear-modal-option.active small{color:#a8b0a7}.gear-modal-option>svg{flex:0 0 auto;color:var(--lime)}
.fixed-action{position:absolute;z-index:10;right:16px;bottom:15px;left:16px;display:flex;height:49px;align-items:center;justify-content:center;gap:8px;background:var(--lime);color:#101510;font-size:10px;font-weight:800}.bottom-tabs{position:absolute;z-index:10;right:0;bottom:0;left:0;display:grid;height:66px;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);background:#0e110f}.bottom-tabs button{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#5e645e;font-size:8px}.bottom-tabs button.active{color:#f0f3ef}.bottom-tabs button.active::before{position:absolute;top:0;width:30px;height:2px;background:var(--lime);content:''}.home-indicator{position:absolute;z-index:12;bottom:4px;left:50%;width:90px;height:3px;border-radius:3px;background:#eee;transform:translateX(-50%)}

/* Reference-board scale and alignment calibration. */
.raven-app {
  position: relative;
  width: 100%;
  margin: 0 auto;
  --muted: #858b85;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
}
.topbar { height: 52px; flex-basis: 52px; padding: 0 16px; grid-template-columns: 76px minmax(0, 1fr) 76px; }
.top-icon { width: 40px; height: 40px; }
.top-title { width: 100%; place-self: center; font-size: 15px; line-height: 1.2; }
.top-logo { width: 82px; height: 24px; place-self: center; }
.top-connected { min-width: 76px; height: 40px; gap: 5px; font-size: 10px; }
.top-connected i { width: 6px; height: 6px; }
.top-help { font-size: 13px; }
.screen-scroll { width: 100%; }
.screen-scroll.has-tabs,
.screen-scroll.has-action { padding-bottom: 70px; }
.page-content { width: 100%; padding: 20px 18px 26px; }
.section-label { margin: 22px 0 11px; color: #747b74; font-size: 10px; line-height: 1.3; }
.eyebrow,
.center-label { color: #858b85; font-size: 10px; line-height: 1.35; }
.page-content h1 { line-height: 1.18; }
.page-content h2 { font-size: 17px; line-height: 1.25; }
.page-content p { margin: 6px 0; font-size: 11px; line-height: 1.55; }
.raven-app small { font-size: 10px; line-height: 1.45; }
.raven-app b { font-size: 13px; line-height: 1.3; }
.round-icon { width: 30px; height: 30px; flex-basis: 30px; }

.bike-stage { height: 188px; }
.bike-stage image { height: 180px; }
.model-line { width: calc(100% - 36px); height: 58px; margin-right: 18px; margin-left: 18px; text-align: left; }
.model-line > view { min-width: 0; gap: 3px; }
.model-line > view > text:last-child,
.model-line > text { font-size: 10px; }
.metrics { margin-right: 18px; margin-left: 18px; }
.metrics > view { min-height: 59px; text-align: center; }
.metrics b { font-size: 17px; }
.metrics span { font-size: 9px; line-height: 1.3; }
.data-row { width: calc(100% - 36px); min-height: 56px; margin-right: 18px; margin-left: 18px; padding: 9px 0; gap: 10px; }
.data-row > view:nth-child(2) { min-width: 0; gap: 4px; }
.quick-strip { margin-right: 18px; margin-left: 18px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.quick-strip button { height: 52px; min-width: 0; gap: 6px; font-size: 10px; text-align: center; }
.quick-strip em { width: 15px; height: 15px; font-size: 9px; }

/* Dashboard spacing follows the reference board's taller content rhythm. */
.dashboard-screen { width: 100%; }
.dashboard-screen .bike-stage { height: 212px; padding: 10px 0 6px; }
.dashboard-screen .bike-stage image { height: 196px; }
.raven-app .dashboard-screen .model-line {
  width: calc(100% - 40px);
  height: 72px;
  margin: 0 20px;
  padding: 0;
}
.dashboard-screen .model-line > view { gap: 5px; }
.dashboard-screen .metrics { margin: 0 20px; }
.dashboard-screen .metrics > view { min-height: 76px; gap: 4px; }
.raven-app .dashboard-screen .data-row {
  width: calc(100% - 36px);
  min-height: 64px;
  margin: 0 18px;
  padding: 10px 0;
  gap: 12px;
}
.dashboard-screen .data-row > view:nth-child(2) { gap: 5px; }
.raven-app .dashboard-screen .dashboard-data-grid { margin: 14px 20px 0; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.raven-app .dashboard-screen .dashboard-data-item { padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: #0f120f; }
.raven-app .dashboard-screen .dashboard-data-item--compact { min-height: 100px; flex-direction: column; align-items: flex-start; justify-content: center; gap: 9px; }
.dashboard-data-item--compact > view:last-child { width: 100%; gap: 5px; }
.dashboard-data-item--compact small { min-height: 26px; overflow-wrap: anywhere; }
.dashboard-data-item--compact b { font-size: 15px; }
.raven-app .dashboard-screen .dashboard-data-item--odometer { min-height: 68px; grid-column: 1 / -1; }
.dashboard-data-item--odometer > view:last-child { flex: 1; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; }
.dashboard-data-item--odometer b { font-size: 17px; }
.dashboard-screen .round-icon { width: 32px; height: 32px; flex-basis: 32px; }
.raven-app .dashboard-screen .quick-strip { margin: 14px 20px 0; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; }
.dashboard-screen .quick-strip button { height: 60px; }

.vehicle-summary,
.status-vehicle { min-height: 82px; padding: 11px 0; gap: 11px; }
.vehicle-summary image,
.status-vehicle image { width: 96px; height: 68px; }
.vehicle-summary > em,
.status-vehicle > em { flex: 0 0 auto; font-size: 10px; }
.control-row { min-height: 68px; padding: 11px 0; gap: 11px; }
.control-row > view:nth-child(2) { min-width: 0; }
.raven-app .switch { width: 38px; height: 22px; flex: 0 0 38px; overflow: hidden; border-radius: 999px; background: #424742; }
.raven-app .switch.on { background: var(--lime); }
.switch i { width: 16px; height: 16px; }
.switch.on i { left: 19px; }
.tune-list button { min-height: 64px; padding: 10px 0; }
.tune-list button > view { min-width: 0; }
.tune-list span { max-width: 52%; justify-content: flex-end; font-size: 10px; text-align: right; }

.segment button,
.preset button,
.modal-secondary,
.modal-danger {
  display: flex;
  padding: 0;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.setting-block { padding: 18px 0; }
.ride-screen .setting-block:first-child { padding-top: 4px; }
.setting-title > view { min-width: 0; padding-right: 12px; gap: 5px; }
.setting-title em { flex: 0 0 auto; font-size: 11px; }
.segment { height: 42px; margin-top: 15px; }
.segment button { font-size: 9px; }
.risk { height: 42px; margin-top: 12px; padding: 0 11px; gap: 7px; font-size: 10px; }

.chart-card { padding: 13px; margin-top: 11px; }
.chart-head { font-size: 10px; }
.point-grid button { display: flex; height: 42px; padding: 0; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.point-grid b { font-size: 12px; }
.point-grid small { font-size: 9px; }
.dual-actions { margin-top: 13px; }
.dual-actions button,
.outline-action { height: 46px; font-size: 11px; text-align: center; }
.lime-button { background: var(--lime) !important; }
.note-line { min-height: 60px; padding: 12px 0; gap: 12px; }
.note-line > view { min-width: 0; flex: 1; }
.note-line span { flex: 0 0 auto; font-size: 10px; text-align: right; }

.wheel-control-panel { padding: 18px; border: 1px solid var(--line); border-radius: 8px; background: #0f120f; }
.wheel-control-panel .center-label { margin: 0; color: #a4aaa4; text-align: left; }
.wheel-control-panel .stepper { width: 100%; height: 64px; margin: 12px 0; overflow: hidden; grid-template-columns: 58px minmax(0,1fr) 58px; border-color: #343a34; border-radius: 8px; background: #0a0d0b; }
.wheel-control-panel .stepper button:first-child { border-right: 1px solid #343a34; }
.wheel-control-panel .stepper button:last-child { border-left: 1px solid #343a34; }
.wheel-control-panel .stepper b { font-size: 24px; }
.wheel-control-panel .stepper small { color: #858b85; font-size: 10px; }
.wheel-control-panel .preset { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }
.wheel-control-panel .preset button { height: 38px; padding: 0; border: 1px solid #303630; border-radius: 6px; color: #858b85; background: #121612; font-size: 10px; }
.wheel-control-panel .preset button.active { border-color: var(--lime); color: var(--lime); background: rgba(164,244,90,.08); }
.guide > view { min-height: 68px; }
.guide i { width: 24px; height: 24px; font-size: 10px; }
.warning { height: 43px; font-size: 10px; }
.battery-hero-ref { height: 196px; gap: 14px; text-align: center; }
.battery-hero-ref > small { color: #a4aaa4; font-size: 11px; }
.battery-outline { overflow: visible; background: #151a15; }
.battery-outline .battery-fill { position: absolute; z-index: 1; top: 0; bottom: 0; left: 0; display: block; max-width: 100%; background: var(--lime); transition: width .35s ease; }
.battery-outline b { position: relative; z-index: 2; color: #f5f7f3; text-shadow: 0 1px 4px rgba(0,0,0,.9); }
.battery-outline::after { z-index: 3; }
.battery-grid > view { min-height: 78px; }
.battery-grid b { font-size: 18px; }
.battery-grid b em { font-size: 9px; }
.status-metrics > view { min-height: 78px; }
.module-list > view,
.ota-list > button { min-height: 61px; gap: 10px; }
.module-list > view > view:nth-child(2),
.ota-list > button > view:nth-child(2) { min-width: 0; gap: 4px; }
.module-list em,
.ota-list em { padding: 4px 7px; font-size: 9px; white-space: nowrap; }

.diagnostic-hero,
.ota-hero-ref { height: 168px; }
.diagnostic-hero h2,
.ota-hero-ref h2,
.diagnostic-hero p,
.ota-hero-ref p { text-align: center; }
.progress-circle { width: 70px; height: 70px; text-align: center; }
.progress-circle b { font-size: 23px; }
.ota-hero-ref > view { width: 56px; height: 56px; }
.diagnostic-list > view { min-height: 66px; gap: 11px; }
.diagnostic-list > view > i { width: 28px; height: 28px; flex: 0 0 28px; }
.diagnostic-list > view > view { min-width: 0; gap: 4px; }
.diagnostic-list span { flex: 0 0 auto; font-size: 10px; }

.vehicle-large { display: block; height: 168px; margin: 0 auto; }
.vehicle-screen > h2,
.vehicle-screen > p { text-align: center; }
.vehicle-screen h2 { font-size: 18px; }
.vehicle-actions { height: 54px; margin-top: 13px; }
.vehicle-actions button { font-size: 11px; text-align: center; }
.search-panel { padding: 23px 0; justify-content: center; text-align: center; }
.search-icon { width: 46px; height: 46px; }
.search-panel h2,
.search-panel p { text-align: center; }
.search-panel button { width: 178px; height: 43px; margin: 13px auto 0; font-size: 11px; text-align: center; }
.bound { font-size: 9px; }

.service-screen h1 { font-size: 23px; }
.service-screen > p { padding-bottom: 16px; }
.resource-list-ref > button { min-height: 66px; }
.resource-list-ref > button > view { min-width: 0; }
.contact-list-ref b { font-size: 12px; }

.custom-wheelie { margin-top: 14px; padding-top: 15px; border-top: 1px solid var(--line); }
.custom-wheelie-head { display: flex; min-height: 34px; align-items: center; justify-content: space-between; }
.custom-wheelie-head strong { color: var(--orange); font-size: 24px; font-variant-numeric: tabular-nums; }
.wheelie-stage { position: relative; height: 232px; margin-top: 8px; overflow: hidden; border: 1px solid #2d322d; border-radius: 8px; background: linear-gradient(180deg,#111511 0 76%,#181d18 76%); }
.wheelie-grid { position: absolute; inset: 0 0 28%; opacity: .42; background-image: linear-gradient(rgba(96,106,96,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(96,106,96,.18) 1px,transparent 1px); background-size: 30px 30px; }
.wheelie-ground { position: absolute; right: 7%; bottom: 34px; left: 7%; height: 1px; background: #596059; }
.wheelie-ray { position: absolute; bottom: 34px; left: 28%; width: 62%; height: 2px; border-radius: 2px; background: var(--orange); transform: rotate(calc(var(--wheelie-angle) * -1)); transform-origin: left center; transition: transform .1s linear; }
.wheelie-bike { position: absolute; top: calc(100% - 34px); left: 28%; width: 72%; max-width: 250px; aspect-ratio: 5/3; transform: rotate(calc(var(--wheelie-angle) * -1)); transform-origin: 0 0; transition: transform .1s linear; }
.wheelie-bike image { position: absolute; top: 0; left: 0; display: block; width: 100%; height: 100%; transform: translate(-25%,-93%); }
.wheelie-stage>i { position: absolute; bottom: 29px; left: calc(28% - 5px); width: 10px; height: 10px; border: 2px solid #e9ece7; border-radius: 50%; background: var(--orange); }
.wheelie-stage>text { position: absolute; right: 11px; bottom: 8px; color:#666d66; font-size:9px; font-weight:800; }
.wheelie-slider { margin: 14px 0 0; }
.wheelie-ticks { display: flex; margin: -2px 12px 0; justify-content: space-between; color: #737a73; font-size: 9px; font-variant-numeric: tabular-nums; }

.wheelie-disclaimer-copy { margin-top: 15px; padding: 12px; border-left: 3px solid #df5e52; border-radius: 8px; background: #291715; text-align: left; }
.wheelie-disclaimer-copy text { display: block; color: #d9ddd7; font-size: 12px; line-height: 1.55; }
.wheelie-disclaimer-copy text+text { margin-top: 8px; }
.wheelie-disclaimer-check { display: flex; width: 100%; min-height: 52px; margin-top: 14px; padding: 9px 10px; align-items: center; gap: 10px; border: 1px solid #383e38!important; border-radius: 8px; text-align: left; }
.wheelie-disclaimer-check>i { display: flex; width: 22px; height: 22px; flex: 0 0 22px; align-items: center; justify-content: center; border: 1px solid #505750; border-radius: 4px; font-style: normal; }
.wheelie-disclaimer-check>i.checked { border-color: #df5e52; background: #df5e52; color: white; }
.wheelie-disclaimer-check span { color:#e5e8e3; font-size:12px; font-weight:700; line-height:1.4; }
.modal-secondary,.modal-danger,.modal-primary { min-height: 44px; border: 1px solid #3b413b!important; border-radius: 8px; font-size: 12px; font-weight: 700; }
.modal-danger { border-color:#df5e52!important; background:#df5e52!important; color:white!important; }
.modal-danger:disabled { opacity:.38; }
.modal-primary { display:flex; padding:0; align-items:center; justify-content:center; border-color:var(--lime)!important; background:var(--lime)!important; color:#101510!important; }
.rename-vehicle-field{display:flex;height:48px;margin-top:18px;padding:0 11px;align-items:center;gap:8px;border:1px solid #383e38;border-radius:8px;background:#0f120f}.rename-vehicle-field input{min-width:0;height:46px;flex:1;color:#f2f4f0;font-size:15px;text-align:left}.rename-vehicle-field text{flex:0 0 auto;color:#707770;font-size:10px}
.raven-app :deep(.modal-panel) { max-height: calc(100dvh - 40px); overflow-y: auto; border-radius: 8px; background:#141714; }
.raven-app :deep(.modal-title) { color:#f2f4f0; }
.raven-app :deep(.modal-icon) { border-radius:8px; background:#2e1715; }
.profile-bike { margin-bottom: 18px; }
.profile-list button { min-height: 59px; gap: 11px; }
.profile-list button { align-items: center; }
.profile-list button b { min-width: 0; font-size: 12px; }
.profile-list button span { max-width: 52%; justify-content: flex-end; font-size: 10px; text-align: right; }
.local-note-ref { text-align: center !important; }

.fixed-action { right: 18px; bottom: 17px; left: 18px; height: 52px; background: var(--lime) !important; color: #101510 !important; font-size: 12px; text-align: center; }
.bottom-tabs { height: 70px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.bottom-tabs button { min-width: 0; font-size: 10px; text-align: center; }
.bottom-tabs button.active::before { left: 50%; width: 32px; transform: translateX(-50%); }
.connection-gear-strip { display:grid; margin:0 20px; grid-template-columns:repeat(2,minmax(0,1fr)); border-bottom:1px solid var(--line); }
.connection-gear-strip > button,
.connection-gear-strip > view { display:grid; min-width:0; min-height:58px; padding:9px 10px; align-items:center; grid-template-columns:auto minmax(0,1fr); gap:2px 7px; text-align:left; }
.connection-gear-strip > * + * { border-left:1px solid var(--line); }
.connection-gear-strip svg { grid-row:1 / 3; color:var(--teal); }
.connection-gear-strip span { color:var(--muted); font-size:9px; }
.connection-gear-strip b { overflow:hidden; color:var(--lime); font-size:11px; text-overflow:ellipsis; white-space:nowrap; }
.connection-gear-strip b.offline { color:var(--muted); }
.raven-app .dashboard-screen .telemetry-cards { grid-template-columns:repeat(2,minmax(0,1fr)); }
.raven-app .dashboard-screen .telemetry-cards .dashboard-data-item { min-height:74px; flex-direction:row; align-items:center; gap:10px; }
.telemetry-cards .dashboard-data-item > view:last-child { min-width:0; }
.telemetry-cards .dashboard-data-item b { font-size:15px; }
.settings-entry-list button { gap:10px; }
.settings-entry-list button > .round-icon { flex:0 0 30px; }
.settings-entry-list button > view:nth-child(2) { display:flex; min-width:0; flex:1; flex-direction:column; gap:4px; }
.settings-entry-list button > span { flex:0 0 auto; }
.tune-list button > view { min-width:0; padding-right:10px; }
.tune-list button > view small { display:-webkit-box; overflow:hidden; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.tune-list button > span { flex:0 0 auto; max-width:42%; white-space:nowrap; }
.settings-intro { display:block; margin:0 0 8px; padding:12px; border-left:2px solid var(--teal); background:#101411; color:#929992; font-size:10px; line-height:1.55; }
.inline-toggle .setting-title { align-items:center; }
.inline-toggle .switch { flex:0 0 38px; }
.setting-link { display:flex; width:100%; min-height:68px; padding:12px 0; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid var(--line)!important; text-align:left; }
.setting-link > view { display:flex; min-width:0; flex:1; flex-direction:column; gap:5px; }
.setting-link > span { display:flex; flex:0 0 auto; align-items:center; gap:3px; color:var(--lime); font-size:10px; }
.power-grid { display:grid; margin-top:15px; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; }
.power-grid button { display:flex; min-width:0; height:39px; padding:0; align-items:center; justify-content:center; border:1px solid #303530!important; border-radius:5px; color:#858b85; font-size:9px; line-height:1; text-align:center; }
.power-grid button.active { border-color:var(--orange)!important; background:#452c22; color:#ef965f; }
.range-setting slider { margin:14px 0 0; }
.range-setting .setting-title em { min-width:62px; text-align:right; }
.range-scale { display:flex; margin-top:-2px; justify-content:space-between; color:#737a73; font-size:9px; font-variant-numeric:tabular-nums; }
.curve-chart-svg { cursor:grab; touch-action:none; user-select:none; }
.curve-chart-svg.dragging { cursor:grabbing; }
.curve-chart-svg circle { pointer-events:none; }
.curve-axis { color:#737a73; font-size:9px; }
.curve-axis-y { margin-top:10px; }
.curve-axis-x { margin:-6px 0 10px; text-align:center; }
.segment button:disabled,
.power-grid button:disabled { opacity:.45; }
.segment.six { grid-template-columns:repeat(6,minmax(0,1fr)); }
.angle-options { margin-top:14px; }
.tap-stepper { display:grid; width:100%; height:48px; margin-top:14px; overflow:hidden; grid-template-columns:48px minmax(0,1fr) 48px; border:1px solid #343a34; border-radius:7px; background:#0c0f0d; }
.tap-stepper button { display:grid; place-items:center; color:var(--lime); }
.tap-stepper button:first-child { border-right:1px solid #343a34; }
.tap-stepper button:last-child { border-left:1px solid #343a34; }
.tap-stepper button:disabled { opacity:.28; }
.tap-stepper strong { display:flex; min-width:0; align-items:center; justify-content:center; color:#f2f4f0; font-size:18px; font-variant-numeric:tabular-nums; }
.curve-point-editor { display:flex; min-height:64px; margin-top:12px; padding-top:12px; align-items:center; justify-content:space-between; gap:10px; border-top:1px solid var(--line); }
.curve-point-editor > view:first-child { display:flex; min-width:50px; flex-direction:column; gap:4px; }
.curve-point-editor > view:first-child b { color:var(--lime); font-size:15px; }
.curve-point-editor > .curve-stepper { width:210px; margin-top:0; }
.spinning{animation:spin .9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{50%{opacity:.55;transform:scale(.92)}}
@media(max-width:350px){.page-content{padding-right:14px;padding-left:14px}.bike-stage{height:168px}.bike-stage image{height:160px}.model-line,.data-row{width:calc(100% - 28px);margin-right:14px;margin-left:14px}.metrics,.quick-strip,.connection-gear-strip{margin-right:14px;margin-left:14px}.battery-hero-ref{height:154px}.point-grid{gap:3px}.tune-list span,.profile-list button span{max-width:48%;font-size:9px}}
@media(max-width:350px){.raven-app .dashboard-screen .dashboard-data-grid{margin-right:14px;margin-left:14px;gap:6px}.raven-app .dashboard-screen .dashboard-data-item--compact{min-height:94px;padding:9px}.raven-app .dashboard-screen .dashboard-data-item--odometer{min-height:64px;padding:10px}}
</style>
