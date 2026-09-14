import {
  AlertTriangle, ArrowLeft, ArrowRight, ArrowUpFromLine, BatteryCharging,
  BatteryMedium, Battery, BatteryFull, Bell, BluetoothConnected, BluetoothOff,
  BluetoothSearching, Bluetooth, Bug, CalendarDays, ChartSpline, CheckCircle2,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheckBig,
  CircleCheck, CircleDashed, CircleDot, CircleGauge, CircleHelp, CircleParking,
  CircleX, CircuitBoard, CloudDownload, Cog, Cpu, Download, EyeOff, Eye,
  FileSearch, FileText, Gauge, Globe, Globe2, Grid2X2, HeartPulse, History,
  House, Info, KeyRound, Languages, LayoutGrid, LoaderCircle, LockKeyhole,
  LogIn, LogOut, Mail, MapPin, Mountain, MoveRight, PackageCheck, PackageOpen,
  PanelTopClose, Pause, Phone, Play, Power, QrCode, Radio, RefreshCw, RotateCcw,
  Ruler, Save, ScanLine, ScanSearch, Search, Settings, Settings2, ShieldAlert,
  ShieldCheck, ShieldQuestion, Signal, SlidersHorizontal, Smartphone, Sparkles,
  Square, Stethoscope, SwitchCamera, Thermometer, Trash2, TriangleAlert,
  Unplug, UserPen, UserPlus, UserRound, UsersRound, WifiOff, Wifi, Wrench,
  X, ZapOff, Zap,
} from "lucide-vue-next";
import type { UiIconName } from "./icon-registry";

// Explicit imports keep the shared outline set tree-shakeable.
export const lineIcons = {
  AlertTriangle, ArrowLeft, ArrowRight, ArrowUpFromLine, BatteryCharging,
  BatteryMedium, Battery, Bell, BluetoothConnected, BluetoothOff,
  BluetoothSearching, Bluetooth, Bug, CalendarDays, ChartSpline, CheckCircle2,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheckBig,
  CircleCheck, CircleDashed, CircleDot, CircleGauge, CircleHelp, CircleParking,
  CircleX, CircuitBoard, CloudDownload, Cog, Cpu, Download, EyeOff, Eye,
  FileSearch, FileText, Gauge, Globe, Globe2, Grid2X2, HeartPulse, History,
  House, Info, KeyRound, Languages, LayoutGrid, LoaderCircle, LockKeyhole,
  LogIn, LogOut, Mail, MapPin, Mountain, MoveRight, PackageCheck, PackageOpen,
  PanelTopClose, Pause, Phone, Play, Power, QrCode, Radio, RefreshCw, RotateCcw,
  Ruler, Save, ScanLine, ScanSearch, Search, Settings, Settings2, ShieldAlert,
  ShieldCheck, ShieldQuestion, Signal, SlidersHorizontal, Smartphone, Sparkles,
  Square, Stethoscope, SwitchCamera, Thermometer, Trash2, TriangleAlert,
  Unplug, UserPen, UserPlus, UserRound, UsersRound, WifiOff, Wifi, Wrench,
  X, ZapOff, Zap, IosBattery: BatteryFull, IosCellular: Signal,
} satisfies Record<Exclude<UiIconName, "Bike">, unknown>;
