import type { ICartRepository } from "../../ports/repositories/ICartRepository.js";
import type { ICartItemRepository } from "../../ports/repositories/ICartItemRepository.js";
import type { IMenuItemRepository } from "../../ports/repositories/IMenuItemRepository.js";
import type { ITableSessionRepository } from "../../ports/repositories/ITableSessionRepository.js";
import type { IStockHoldService } from "../../ports/services/IStockHoldService.js";
import { NoopStockHoldService } from "../../ports/services/NoopStockHoldService.js";
import type { IEventBus } from "../../ports/events/IEventBus.js";
import { NoopEventBus } from "../../ports/events/NoopEventBus.js";
import crypto from "node:crypto";

function normalizeForHash(value: any): any {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(normalizeForHash);
  if (typeof value === "object") {
    const out: any = {};
    for (const k of Object.keys(value).sort()) {
      out[k] = normalizeForHash((value as any)[k]);
    }
    return out;
  }
  return value;
}

function computeOptionsHash(itemOptions: any): { optionsHash: string; normalizedOptions: any | null } {
  if (itemOptions === undefined || itemOptions === null) return { optionsHash: "", normalizedOptions: null };
  if (typeof itemOptions !== "object") throw new Error("INVALID_ITEM_OPTIONS");

  const normalized = normalizeForHash(itemOptions);
  const json = JSON.stringify(normalized);
  const hash = crypto.createHash("sha256").update(json).digest("hex");
  return { optionsHash: hash, normalizedOptions: normalized };
}

async function resolveSessionKey(sessionRepo: ITableSessionRepository | null, sessionId?: string | null): Promise<string | null> {
  if (!sessionRepo || !sessionId) return null;
  const s = await sessionRepo.findById(sessionId);
  return s?.sessionKey ? String(s.sessionKey) : null;
}

export class UpsertCartItem {
  constructor(
    private cartRepo: ICartRepository,
    private cartItemRepo: ICartItemRepository,
    private menuRepo: IMenuItemRepository,
    private sessionRepo: ITableSessionRepository | null,
    private stockHold: IStockHoldService = new NoopStockHoldService(),
    private eventBus: IEventBus = new NoopEventBus(),
  ) {}

  async execute(cartKey: string, itemId: string, quantity: number, itemOptions?: any) {
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error("INVALID_QUANTITY");

    const cart = await this.cartRepo.findByCartKey(cartKey);
    if (!cart) throw new Error("CART_NOT_FOUND");
    if (cart.status !== "ACTIVE") throw new Error("CART_NOT_ACTIVE");

    const { optionsHash, normalizedOptions } = computeOptionsHash(itemOptions);

    // Current qty (for rollback if DB upsert fails after reserving stock)
    const currentItems = await this.cartItemRepo.listByCartId(cart.id);
    const currentQty = Number(
      currentItems.find((it: any) => String(it.itemId) === String(itemId) && String(it.optionsHash ?? "") === String(optionsHash))
        ?.quantity ?? 0,
    );

    // Phase-1: Redis stock holds (atomic)
    // Apply hold first to prevent DB from reflecting quantities we cannot fulfill.
    try {
      if (cart.branchId) {
        await this.stockHold.setDesiredQty({
          cartKey,
          branchId: String(cart.branchId),
          itemId: String(itemId),
          optionsHash: String(optionsHash),
          note: null,
          desiredQty: Number(quantity),
        });
      } else {
        // If stock holds is active, branchId is mandatory.
        // NoopStockHoldService will ignore, but RedisStockHoldService will be used in prod.
        if (!(this.stockHold instanceof NoopStockHoldService)) {
          throw new Error("BRANCH_REQUIRED");
        }
      }
    } catch (e) {
      // Stock is not enough / holds service rejected the update
      throw e;
    }

    if (quantity === 0) {
      await this.cartItemRepo.remove({ cartId: cart.id, itemId, optionsHash });

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
          quantity: 0,
          action: "REMOVE",
          optionsHash,
          itemOptions: normalizedOptions,
        },
      });
      return;
    }

    const price = await this.menuRepo.getUnitPrice(itemId);
    if (price === null) throw new Error("ITEM_NOT_FOUND");

    try {
      await this.cartItemRepo.upsert({
        cartId: cart.id,
        itemId,
        quantity,
        unitPrice: price,
        optionsHash,
        itemOptions: normalizedOptions,
      });
    } catch (err) {
      // Rollback hold to previous qty if DB write fails
      try {
        if (cart.branchId) {
          await this.stockHold.setDesiredQty({
            cartKey,
            branchId: String(cart.branchId),
            itemId: String(itemId),
            optionsHash: String(optionsHash),
            note: null,
            desiredQty: Number(currentQty),
          });
        }
      } catch {
        // ignore
      }
      throw err;
    }

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
        quantity,
        unitPrice: price,
        action: "UPSERT",
        optionsHash,
        itemOptions: normalizedOptions,
      },
    });
  }
}
