/**
 * Order types — contract-first from @hadilao/contracts schemas/orders.
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
  status?: OrderStatus;
  branchId?: string | number;
  sessionKey?: string;
  items?: OrderItem[];
  subtotal?: number;
  total?: number;
  createdAt?: string;
  updatedAt?: string;
};

/** Terminal statuses: stop polling when reached */
export const ORDER_TERMINAL_STATUSES: OrderStatus[] = [
  "PAID",
  "CANCELLED",
  "SERVED",
];

export function isOrderTerminal(status: OrderStatus | undefined): boolean {
  if (!status) return false;
  return ORDER_TERMINAL_STATUSES.includes(status);
}
