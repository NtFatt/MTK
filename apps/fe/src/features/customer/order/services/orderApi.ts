/**
 * Order API — contract-first.
 * POST /api/v1/orders/from-cart/:cartKey (Idempotency-Key header)
 * GET  /api/v1/orders/:orderCode/status
 */
import { apiFetch } from "../../../../lib/apiFetch";
import type { Order } from "../types";

export type CreateOrderParams = {
  cartKey: string;
  idempotencyKey: string;
  note?: string;
};

/**
 * Create order from current cart. Requires Idempotency-Key header.
 */
export async function createOrder(params: CreateOrderParams): Promise<Order> {
  const { cartKey, idempotencyKey, note } = params;
  const path = `/orders/from-cart/${encodeURIComponent(cartKey)}`;
  const body = note != null && note.trim() !== "" ? { note: note.trim() } : undefined;
  return apiFetch<Order>(path, {
    method: "POST",
    idempotencyKey,
    ...(body && { body: JSON.stringify(body) }),
  });
}

/**
 * Get order detail/status by orderCode (session-scoped on backend).
 */
export async function getOrder(orderCode: string): Promise<Order> {
  const path = `/orders/${encodeURIComponent(orderCode)}/status`;
  return apiFetch<Order>(path);
}
