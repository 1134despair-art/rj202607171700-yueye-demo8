import type { UiIconName, UiIconTone } from "@/assets/ui/icon-registry";

export type ServiceResourceGroup = "technical" | "brand";

export interface ServiceResource {
  id: "repair-manual" | "fault-code-table" | "torque-table" | "brand-vi" | "body-sticker";
  group: ServiceResourceGroup;
  titleKey: string;
  detailKey: string;
  format: "PDF" | "SVG";
  fileName: string;
  icon: UiIconName;
  tone: UiIconTone;
  path?: string;
}

export const serviceResources: ServiceResource[] = [
  {
    id: "repair-manual",
    group: "technical",
    titleKey: "resources.items.repairManual",
    detailKey: "resources.details.repairManual",
    format: "PDF",
    fileName: "binsen-repair-manual.pdf",
    icon: "Wrench",
    tone: "info",
  },
  {
    id: "fault-code-table",
    group: "technical",
    titleKey: "resources.items.faultCodes",
    detailKey: "resources.details.faultCodes",
    format: "PDF",
    fileName: "binsen-fault-code-table.pdf",
    icon: "TriangleAlert",
    tone: "warning",
  },
  {
    id: "torque-table",
    group: "technical",
    titleKey: "resources.items.torqueTable",
    detailKey: "resources.details.torqueTable",
    format: "PDF",
    fileName: "binsen-torque-table.pdf",
    icon: "Ruler",
    tone: "success",
  },
  {
    id: "brand-vi",
    group: "brand",
    titleKey: "resources.items.brandVi",
    detailKey: "resources.details.brandVi",
    format: "SVG",
    fileName: "binsen-brand-vi.svg",
    icon: "Sparkles",
    tone: "info",
  },
  {
    id: "body-sticker",
    group: "brand",
    titleKey: "resources.items.bodySticker",
    detailKey: "resources.details.bodySticker",
    format: "PDF",
    fileName: "binsen-body-sticker.pdf",
    icon: "FileText",
    tone: "info",
  },
];
