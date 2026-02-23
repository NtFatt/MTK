export type KitchenQueueKeyParams = {
  branchId: string;      // normalized
  statuses: string;      // "NEW,RECEIVED"
  limit: number;
};

export function kitchenQueueQueryKey(params: {
  branchId: string | number;
  statuses?: string[];
  limit?: number;
}): readonly ["admin", "kitchen", "queue", KitchenQueueKeyParams] {
  const b = String(params.branchId);
  const statuses = (params.statuses ?? []).map((x) => String(x).trim().toUpperCase()).filter(Boolean);
  const limit = Number(params.limit ?? 50);

  return ["admin", "kitchen", "queue", { branchId: b, statuses: statuses.join(","), limit }];
}

export const kitchenQueueBaseKey = ["admin", "kitchen", "queue"] as const;