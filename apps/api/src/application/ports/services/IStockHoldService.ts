export type StockHoldVariantKey = {
  cartKey: string;
  branchId: string;
  itemId: string;
  optionsHash: string;
  note?: string | null;
};

export interface IStockHoldService {
  /**
   * Set desired quantity for a specific cart item variant (cartKey + itemId + optionsHash).
   * Implementations must be atomic and must not allow reserved quantities to exceed available stock.
   */
  setDesiredQty(input: StockHoldVariantKey & { desiredQty: number }): Promise<void>;

  /**
   * Consume (finalize) all holds for a cart (e.g., after successful order checkout).
   * Must remove holds WITHOUT releasing stock back.
   */
  consumeCart(cartKey: string): Promise<void>;

  /**
   * Release (cancel) all holds for a cart (e.g., cart abandoned/closed session).
   */
  releaseCart(cartKey: string): Promise<void>;

  /**
   * Cleanup expired holds and release stock back.
   */
  cleanupExpired(now?: Date, limit?: number): Promise<{ released: number }>;
}
