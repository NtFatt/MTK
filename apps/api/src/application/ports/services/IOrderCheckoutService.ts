import type { Cart } from "../../../domain/entities/Cart.js";
import type { CartItem } from "../../../domain/entities/CartItem.js";

export type CheckoutFromCartInput = {
  orderCode: string;
  cart: Cart;
  items: CartItem[];
  note?: string | null;
};

export type CheckoutFromCartResult = {
  orderId: string;
  orderCode: string;
};

/**
 * Orchestrates DB-transactional checkout (orders + items + stock decrement + cart checkout).
 */
export interface IOrderCheckoutService {
  checkoutFromCart(input: CheckoutFromCartInput): Promise<CheckoutFromCartResult>;
}
