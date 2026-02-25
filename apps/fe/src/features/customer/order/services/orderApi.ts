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

// BE DTO (thực tế đang trả orderStatus)
type OrderDto = {
  orderCode: string;
  status?: string;
  orderStatus?: string;
  updatedAt?: string;
};

function toOrder(dto: OrderDto): Order {
  return {
    orderCode: dto.orderCode,
    status: dto.status ?? dto.orderStatus ?? "UNKNOWN",
    updatedAt: dto.updatedAt,
  };
}

/**
 * Create order from current cart. Requires Idempotency-Key header.
 */
export async function createOrder(params: CreateOrderParams): Promise<Order> {
  const { cartKey, idempotencyKey, note } = params;
  const path = `/orders/from-cart/${encodeURIComponent(cartKey)}`;
  const body = note != null && note.trim() !== "" ? { note: note.trim() } : undefined;

  const dto = await apiFetch<OrderDto>(path, {
    method: "POST",
    idempotencyKey,
    ...(body && { body: JSON.stringify(body) }),
  });

  return toOrder(dto);
}

/**
 * Get order detail/status by orderCode (session-scoped on backend).
 * Use no-store to avoid stale status (304/cache) while tracking.
 */
export async function getOrder(orderCode: string): Promise<Order> {
  const path = `/orders/${encodeURIComponent(orderCode)}/status`;

  const dto = await apiFetch<OrderDto>(path, {
    cache: "no-store",
  });

  return toOrder(dto);
}