import type { KitchenQueueRow } from "../services/kitchenQueueApi";
import { getKitchenAgeMinutes, getKitchenSeverity } from "./kitchenSla";
import { normKitchenStatus } from "./kitchenStatus";

function severityRank(row: KitchenQueueRow): number {
  const severity = getKitchenSeverity(row);
  if (severity === "critical") return 3;
  if (severity === "warning") return 2;
  return 1;
}

function statusRank(row: KitchenQueueRow): number {
  const status = normKitchenStatus(row.orderStatus);
  if (status === "NEW") return 4;
  if (status === "RECEIVED") return 3;
  if (status === "PREPARING") return 2;
  if (status === "READY") return 1;
  return 0;
}

export function sortKitchenRows(rows: KitchenQueueRow[]): KitchenQueueRow[] {
  return [...rows].sort((left, right) => {
    const severityDiff = severityRank(right) - severityRank(left);
    if (severityDiff !== 0) return severityDiff;

    const statusDiff = statusRank(right) - statusRank(left);
    if (statusDiff !== 0) return statusDiff;

    const recipeDiff = Number(left.recipeConfigured === false) - Number(right.recipeConfigured === false);
    if (recipeDiff !== 0) return recipeDiff;

    const ageDiff = getKitchenAgeMinutes(right) - getKitchenAgeMinutes(left);
    if (ageDiff !== 0) return ageDiff;

    return Date.parse(right.updatedAt ?? right.createdAt ?? "") - Date.parse(left.updatedAt ?? left.createdAt ?? "");
  });
}
