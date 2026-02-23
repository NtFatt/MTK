/**
 * Cart types — aligned with @hadilao/contracts cart schema.
 */

export type CartItemOption = {
  key?: string;
  value?: string | number | boolean;
};

export type CartItem = {
  itemId: string | number;
  name?: string;
  qty: number;
  unitPrice?: number;
  note?: string;
  options?: CartItemOption[];
  optionsHash?: string;
};

export type Cart = {
  cartKey: string;
  sessionKey?: string;
  branchId?: string | number;
  items: CartItem[];
  subtotal?: number;
  total?: number;
};

export type UpsertCartItemsBody = {
  items: CartItem[];
};
