import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type AdminOrderStatus = "RECEIVED" | "READY" | "COMPLETED" | "CANCELED" | "PAID";

export type AdminChangeOrderStatusBody = {
  toStatus: AdminOrderStatus;
  note?: string | null;
};

export type AdminChangeOrderStatusResult = {
  changed?: boolean;
  fromStatus?: string;
  toStatus?: string;
};

function normalizeOrderCode(orderCode: string): string {
  const code = String(orderCode ?? "").trim();
  if (!code) throw new Error("Missing orderCode");
  return code;
}

/**
 * POST /api/v1/admin/orders/:orderCode/status
 * - Pass idempotencyKey if you want retry-safe behavior (recommended for status mutations).
 */
export async function changeAdminOrderStatus(
  orderCode: string,
  body: AdminChangeOrderStatusBody,
  idempotencyKey?: string
): Promise<AdminChangeOrderStatusResult> {
  const code = normalizeOrderCode(orderCode);

  // Optional: sanity check body
  if (!body || typeof body !== "object") throw new Error("Missing body");
  if (!body.toStatus) throw new Error("Missing toStatus");

  return apiFetchAuthed<AdminChangeOrderStatusResult>(
    `/admin/orders/${encodeURIComponent(code)}/status`,
    {
      method: "POST",
      body: JSON.stringify({
        toStatus: body.toStatus,
        note: body.note ?? null,
      }),
      idempotencyKey,
    }
  );
}

/**
 * Convenience wrapper for Kitchen role (usually only RECEIVED/READY).
 * Use this in Kitchen UI to avoid accidental invalid status.
 */
export type KitchenNextStatus = "RECEIVED" | "READY";
export async function changeKitchenOrderStatus(
  orderCode: string,
  toStatus: KitchenNextStatus,
  opts?: { note?: string | null; idempotencyKey?: string }
) {
  return changeAdminOrderStatus(
    orderCode,
    { toStatus, note: opts?.note ?? null },
    opts?.idempotencyKey
  );
}