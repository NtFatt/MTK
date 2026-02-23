import { CartItem, type CartItemOptions } from "../../../domain/entities/CartItem.js";

export interface ICartItemRepository {
  upsert(input: {
    cartId: string;
    itemId: string;
    quantity: number;
    unitPrice: number;
    optionsHash: string; // stable hash for variant uniqueness
    itemOptions?: CartItemOptions | null;
  }): Promise<void>;

  /**
   * Remove a cart item. If optionsHash is omitted, remove ALL variants for that item.
   */
  remove(input: { cartId: string; itemId: string; optionsHash?: string | null }): Promise<void>;

  listByCartId(cartId: string): Promise<CartItem[]>;
}
