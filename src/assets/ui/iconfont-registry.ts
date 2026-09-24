import add from "./iconfont/add.svg";
import battery from "./iconfont/battery.svg";
import batteryHealth from "./iconfont/battery-health.svg";
import bluetooth from "./iconfont/bluetooth.svg";
import bluetoothOff from "./iconfont/bluetooth-off.svg";
import cloudDownload from "./iconfont/cloud-download.svg";
import calendar from "./iconfont/calendar.svg";
import catalog from "./iconfont/catalog.svg";
import check from "./iconfont/check.svg";
import close from "./iconfont/close.svg";
import curve from "./iconfont/curve.svg";
import controllerChip from "./iconfont/controller-chip.svg";
import dashboard from "./iconfont/dashboard.svg";
import deleteIcon from "./iconfont/delete.svg";
import diagnosis from "./iconfont/diagnosis.svg";
import document from "./iconfont/document.svg";
import down from "./iconfont/down.svg";
import download from "./iconfont/download.svg";
import edit from "./iconfont/edit.svg";
import email from "./iconfont/email.svg";
import electricCurrent from "./iconfont/electric-current.svg";
import electricMotor from "./iconfont/electric-motor.svg";
import electricOff from "./iconfont/electric-off.svg";
import error from "./iconfont/error.svg";
import globe from "./iconfont/globe.svg";
import home from "./iconfont/home.svg";
import info from "./iconfont/info.svg";
import left from "./iconfont/left.svg";
import link from "./iconfont/link.svg";
import loading from "./iconfont/loading.svg";
import location from "./iconfont/location.svg";
import lock from "./iconfont/lock.svg";
import offroadMotorcycle from "./iconfont/offroad-motorcycle.svg";
import notice from "./iconfont/notice.svg";
import pause from "./iconfont/pause.svg";
import phone from "./iconfont/phone.svg";
import play from "./iconfont/play.svg";
import product from "./iconfont/product.svg";
import protection from "./iconfont/protection.svg";
import qr from "./iconfont/qr.svg";
import refresh from "./iconfont/refresh.svg";
import returnIcon from "./iconfont/return.svg";
import right from "./iconfont/right.svg";
import save from "./iconfont/save.svg";
import search from "./iconfont/search.svg";
import security from "./iconfont/security.svg";
import settings from "./iconfont/settings.svg";
import signalBars from "./iconfont/signal-bars.svg";
import shutdown from "./iconfont/shutdown.svg";
import smartphoneDevice from "./iconfont/smartphone-device.svg";
import sparkles from "./iconfont/sparkles.svg";
import appUpdate from "./iconfont/app-update.svg";
import success from "./iconfont/success.svg";
import temperature from "./iconfont/temperature.svg";
import translate from "./iconfont/translate.svg";
import upload from "./iconfont/upload.svg";
import user from "./iconfont/user.svg";
import view from "./iconfont/view.svg";
import warning from "./iconfont/warning.svg";
import wifi from "./iconfont/wifi.svg";
import wifiOff from "./iconfont/wifi-off.svg";
import rulerMeasure from "./iconfont/ruler-measure.svg";
import wrenchTool from "./iconfont/wrench-tool.svg";

// All aliases resolve to the locally bundled Alibaba Iconfont artwork.
export const uiIconRegistry = {
  AlertTriangle: warning,
  ArrowLeft: left,
  ArrowRight: right,
  ArrowUpFromLine: upload,
  BatteryCharging: battery,
  BatteryMedium: battery,
  Battery: battery,
  Bell: notice,
  Bike: offroadMotorcycle,
  BluetoothConnected: bluetooth,
  BluetoothOff: bluetoothOff,
  BluetoothSearching: bluetooth,
  Bluetooth: bluetooth,
  Bug: diagnosis,
  CalendarDays: calendar,
  ChartSpline: curve,
  CheckCircle2: success,
  Check: check,
  ChevronDown: down,
  ChevronLeft: left,
  ChevronRight: right,
  CircleAlert: error,
  CircleCheckBig: success,
  CircleCheck: success,
  CircleDashed: loading,
  CircleDot: location,
  CircleGauge: dashboard,
  CircleHelp: info,
  CircleParking: lock,
  CircleX: close,
  CircuitBoard: controllerChip,
  CloudDownload: cloudDownload,
  Cog: electricMotor,
  Cpu: controllerChip,
  Download: download,
  EyeOff: view,
  Eye: view,
  FileSearch: diagnosis,
  FileText: document,
  Gauge: dashboard,
  Globe: globe,
  Globe2: globe,
  Grid2X2: catalog,
  HeartPulse: batteryHealth,
  History: refresh,
  House: home,
  Info: info,
  IosBattery: battery,
  IosCellular: dashboard,
  KeyRound: lock,
  Languages: translate,
  LayoutGrid: catalog,
  LoaderCircle: loading,
  LockKeyhole: lock,
  LogIn: link,
  LogOut: returnIcon,
  Mail: email,
  MapPin: location,
  Mountain: product,
  MoveRight: right,
  PackageCheck: product,
  PackageOpen: product,
  PanelTopClose: close,
  Pause: pause,
  Phone: phone,
  Play: play,
  Power: shutdown,
  QrCode: qr,
  Radio: link,
  RefreshCw: refresh,
  RotateCcw: refresh,
  Ruler: rulerMeasure,
  Save: save,
  ScanLine: qr,
  ScanSearch: search,
  Search: search,
  Settings: settings,
  Settings2: settings,
  ShieldAlert: warning,
  ShieldCheck: security,
  ShieldQuestion: protection,
  Signal: signalBars,
  SlidersHorizontal: settings,
  Smartphone: smartphoneDevice,
  SmartphoneUpdate: appUpdate,
  Sparkles: sparkles,
  Square: catalog,
  Stethoscope: diagnosis,
  SwitchCamera: refresh,
  Thermometer: temperature,
  Trash2: deleteIcon,
  TriangleAlert: warning,
  Unplug: link,
  UserPen: edit,
  UserPlus: add,
  UserRound: user,
  UsersRound: user,
  WifiOff: wifiOff,
  Wifi: wifi,
  Wrench: wrenchTool,
  X: close,
  ZapOff: electricOff,
  Zap: electricCurrent,
} as const;

export type UiIconName = keyof typeof uiIconRegistry;
export type UiIconTone = "navy" | "muted" | "brand" | "info" | "success" | "warning" | "danger" | "inverse";
