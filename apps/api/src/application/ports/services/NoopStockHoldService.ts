import type { IStockHoldService, StockHoldVariantKey } from "./IStockHoldService.js";

export class NoopStockHoldService implements IStockHoldService {
  async setDesiredQty(_input: StockHoldVariantKey & { desiredQty: number }): Promise<void> {
    return;
  }

  async consumeCart(_cartKey: string): Promise<void> {
    return;
  }

  async releaseCart(_cartKey: string): Promise<void> {
    return;
  }

  async cleanupExpired(_now?: Date, _limit?: number): Promise<{ released: number }> {
    return { released: 0 };
  }
}
