import type { ICartRepository } from "../../ports/repositories/ICartRepository.js";
import type { ICartItemRepository } from "../../ports/repositories/ICartItemRepository.js";
import type { ITableSessionRepository } from "../../ports/repositories/ITableSessionRepository.js";
import type { IStockHoldService } from "../../ports/services/IStockHoldService.js";
import { NoopStockHoldService } from "../../ports/services/NoopStockHoldService.js";
import type { IEventBus } from "../../ports/events/IEventBus.js";
import { NoopEventBus } from "../../ports/events/NoopEventBus.js";

async function resolveSessionKey(sessionRepo: ITableSessionRepository | null, sessionId?: string | null): Promise<string | null> {
  if (!sessionRepo || !sessionId) return null;
  const s = await sessionRepo.findById(sessionId);
  return s?.sessionKey ? String(s.sessionKey) : null;
}

export class RemoveCartItem {
  constructor(
    private cartRepo: ICartRepository,
    private cartItemRepo: ICartItemRepository,
    private sessionRepo: ITableSessionRepository | null,
    private stockHold: IStockHoldService = new NoopStockHoldService(),
    private eventBus: IEventBus = new NoopEventBus(),
  ) {}

  async execute(cartKey: string, itemId: string, optionsHash?: string | null) {
    const cart = await this.cartRepo.findByCartKey(cartKey);
    if (!cart) throw new Error("CART_NOT_FOUND");
    if (cart.status !== "ACTIVE") throw new Error("CART_NOT_ACTIVE");

    // Release holds BEFORE removing from DB (so stock becomes available fast).
    if (cart.branchId) {
      if (optionsHash !== undefined && optionsHash !== null) {
        await this.stockHold.setDesiredQty({
          cartKey,
          branchId: String(cart.branchId),
          itemId: String(itemId),
          optionsHash: String(optionsHash),
          note: null,
          desiredQty: 0,
        });
      } else {
        const all = await this.cartItemRepo.listByCartId(cart.id);
        const variants = all.filter((it: any) => String(it.itemId) === String(itemId));
        for (const v of variants) {
          await this.stockHold.setDesiredQty({
            cartKey,
            branchId: String(cart.branchId),
            itemId: String(itemId),
            optionsHash: String((v as any).optionsHash ?? ""),
            note: null,
            desiredQty: 0,
          });
        }
      }
    } else {
      if (!(this.stockHold instanceof NoopStockHoldService)) {
        throw new Error("BRANCH_REQUIRED");
      }
    }

    const removeInput: { cartId: string; itemId: string; optionsHash?: string | null } = { cartId: cart.id, itemId };
    if (optionsHash !== undefined) removeInput.optionsHash = optionsHash;
    await this.cartItemRepo.remove(removeInput);

    const sessionKey = await resolveSessionKey(this.sessionRepo, cart.sessionId ?? null);

    await this.eventBus.publish({
      type: "cart.updated",
      at: new Date().toISOString(),
      scope: { sessionId: cart.sessionId ?? null, sessionKey, clientId: cart.clientId ?? null, branchId: cart.branchId ?? null },
      payload: {
        cartKey,
        cartId: cart.id,
        sessionId: cart.sessionId ?? null,
        itemId,
        action: "REMOVE",
        optionsHash: optionsHash ?? null,
      },
    });
  }
}
