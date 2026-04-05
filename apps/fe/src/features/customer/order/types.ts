/**
 * Order types — contract-first from @duong-hanh-phuc/contracts schemas/orders.
 * OrderStatus is string per zOrderStatus (no enum in contract).
 */

export type OrderStatus = string;

export type OrderItem = {
  itemId: string | number;
  name?: string;
  qty: number;
  unitPrice?: number;
  note?: string;
  optionsHash?: string;
};

export type Order = {
  orderCode: string;
  checkoutMode?: "CREATED" | "APPENDED";
  status?: OrderStatus;
  branchId?: string | number;
  sessionKey?: string;
  items?: OrderItem[];
  subtotal?: number;
  discount?: number;
  total?: number;
  voucherCode?: string | null;
  voucherName?: string | null;
  voucherDiscountAmount?: number;
  createdAt?: string;
  updatedAt?: string;
};

function normalizeOrderStatus(status: OrderStatus | undefined): string {
  return String(status ?? "").trim().toUpperCase();
}

/** Terminal statuses: stop polling when reached */
export const ORDER_TERMINAL_STATUSES: OrderStatus[] = [
  "PAID",
  "CANCELLED",
  "SERVED",
];

export function isOrderTerminal(status: OrderStatus | undefined): boolean {
  const normalized = normalizeOrderStatus(status);
  return normalized.length > 0 && ORDER_TERMINAL_STATUSES.includes(normalized);
}

export function isOrderPayable(status: OrderStatus | undefined): boolean {
  const normalized = normalizeOrderStatus(status);
  return normalized.length > 0 && normalized !== "PAID" && normalized !== "CANCELED" && normalized !== "CANCELLED";
}

export function shouldCloseCustomerSessionAfterPayment(status: OrderStatus | undefined): boolean {
  return normalizeOrderStatus(status) === "PAID";
}
