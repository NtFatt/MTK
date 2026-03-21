import type { Cart } from "../../../domain/entities/Cart.js";
import type { CartItem } from "../../../domain/entities/CartItem.js";

export type CheckoutFromCartInput = {
  orderCode: string;
  cart: Cart;
  items: CartItem[];
  note?: string | null;
};

export type CheckoutMode = "CREATED" | "APPENDED";

export type CheckoutFromCartResult = {
  orderId: string;
  orderCode: string;
  checkoutMode: CheckoutMode;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  voucher: null | {
    id: string;
    code: string;
    name: string;
    discountType: "PERCENT" | "FIXED_AMOUNT";
    discountValue: number;
    discountAmount: number;
  };
  affectedMenuItemIds: string[];
  consumedIngredients: Array<{
    ingredientId: string;
    qtyConsumed: number;
  }>;
  inventoryCommitPoint: "ORDER_CREATED";
  previousOrderStatus: string | null;
  currentOrderStatus: string;
  statusTransition: null | {
    fromStatus: string;
    toStatus: string;
  };
};

/**
 * Orchestrates DB-transactional checkout
 * (orders + items + stock decrement + ingredient inventory commit + cart checkout).
 */
export interface IOrderCheckoutService {
  checkoutFromCart(input: CheckoutFromCartInput): Promise<CheckoutFromCartResult>;
}
