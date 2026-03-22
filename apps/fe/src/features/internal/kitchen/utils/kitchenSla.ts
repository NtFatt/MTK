import type { KitchenQueueRow } from "../services/kitchenQueueApi";
import { normKitchenStatus } from "./kitchenStatus";

export type KitchenSeverity = "normal" | "warning" | "critical";

function getKitchenAnchor(row: KitchenQueueRow): string | null {
  const status = normKitchenStatus(row.orderStatus);
  if (status === "PREPARING" || status === "READY") {
    return row.updatedAt ?? row.createdAt ?? null;
  }
  return row.createdAt ?? row.updatedAt ?? null;
}

export function getKitchenAgeMinutes(row: KitchenQueueRow): number {
  const anchor = getKitchenAnchor(row);
  if (!anchor) return 0;
  const ts = Date.parse(anchor);
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, Math.floor((Date.now() - ts) / 60000));
}

export function formatKitchenAge(row: KitchenQueueRow): string {
  const minutes = getKitchenAgeMinutes(row);
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  return `${hours}h ${remain}m`;
}

export function getKitchenSeverity(row: KitchenQueueRow): KitchenSeverity {
  const age = getKitchenAgeMinutes(row);
  if (age >= 10) return "critical";
  if (age >= 5) return "warning";
  return "normal";
}

export function isKitchenOverdue(row: KitchenQueueRow): boolean {
  return getKitchenSeverity(row) === "critical";
}

export function getKitchenSeverityMeta(row: KitchenQueueRow) {
  const severity = getKitchenSeverity(row);
  if (severity === "critical") {
    return {
      severity,
      badgeClassName: "border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]",
      cardClassName: "shadow-[0_16px_34px_-26px_rgba(143,47,47,0.55)]",
      label: "Quá SLA",
    };
  }

  if (severity === "warning") {
    return {
      severity,
      badgeClassName: "border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]",
      cardClassName: "shadow-[0_16px_34px_-26px_rgba(139,90,29,0.35)]",
      label: "Sắp trễ",
    };
  }

  return {
    severity,
    badgeClassName: "border-[#d9bd95] bg-[#fff8ec] text-[#6a3b20]",
    cardClassName: "",
    label: "Ổn định",
  };
}
