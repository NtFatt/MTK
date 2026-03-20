import type { ICartRepository } from "../../ports/repositories/ICartRepository.js";
import type { ICartItemRepository } from "../../ports/repositories/ICartItemRepository.js";
import type { IMenuCatalogRepository } from "../../ports/repositories/IMenuCatalogRepository.js";
import type { ITableSessionRepository } from "../../ports/repositories/ITableSessionRepository.js";
import type { IOrderCodeGenerator } from "../../ports/services/IOrderCodeGenerator.js";
import type { IOrderCheckoutService } from "../../ports/services/IOrderCheckoutService.js";
import type { IStockHoldService } from "../../ports/services/IStockHoldService.js";
import { NoopStockHoldService } from "../../ports/services/NoopStockHoldService.js";
import type { IEventBus } from "../../ports/events/IEventBus.js";
import { NoopEventBus } from "../../ports/events/NoopEventBus.js";

async function resolveSessionKey(sessionRepo: ITableSessionRepository | null, sessionId?: string | null): Promise<string | null> {
  if (!sessionRepo || !sessionId) return null;
  const s = await sessionRepo.findById(sessionId);
  return s?.sessionKey ? String(s.sessionKey) : null;
}

export class CreateOrderFromCart {
  constructor(
    private cartRepo: ICartRepository,
    private cartItemRepo: ICartItemRepository,
    private menuCatalog: IMenuCatalogRepository,
    private codeGen: IOrderCodeGenerator,
    private checkoutSvc: IOrderCheckoutService,
    private sessionRepo: ITableSessionRepository | null,
    private stockHold: IStockHoldService = new NoopStockHoldService(),
    private eventBus: IEventBus = new NoopEventBus(),
    private readonly syncHooks: {
      syncMenuProjection?: ((input: { branchId: string; itemIds: string[] }) => Promise<unknown>) | null;
    } = {},
  ) { }

  async execute(cartKey: string, note: string | null = null) {
    const cart = await this.cartRepo.findByCartKey(cartKey);
    if (!cart) throw new Error("CART_NOT_FOUND");
    if (cart.status !== "ACTIVE") throw new Error("CART_NOT_ACTIVE");

    const items = await this.cartItemRepo.listByCartId(cart.id);
    if (items.length === 0) throw new Error("CART_EMPTY");

    // Snapshot item names (SoT = menu_items)
    const nameById = new Map<string, string>();
    for (const it of items) {
      const id = String((it as any).itemId ?? (it as any).item_id);
      if (nameById.has(id)) continue;
      const menuItem = await this.menuCatalog.getItemById(id);
      if (!menuItem) throw new Error("MENU_ITEM_NOT_FOUND");
      nameById.set(id, String((menuItem as any).name ?? (menuItem as any).itemName ?? ""));
    }

    const orderCode = await this.codeGen.next();

    const itemsWithNames = items.map((it: any) => ({
      ...it,
      itemName: nameById.get(String(it.itemId ?? it.item_id)) ?? "",
    }));

    const checkoutResult = await this.checkoutSvc.checkoutFromCart({
      orderCode,
      cart,
      items: itemsWithNames,
      note,
    });
    const orderId = checkoutResult.orderId;

    // Consume holds after successful checkout (remove holds without restoring stock)
    try {
      await this.stockHold.consumeCart(cartKey);
    } catch {
      // ignore (order already created)
    }

    if (
      cart.branchId &&
      checkoutResult.affectedMenuItemIds.length > 0 &&
      this.syncHooks.syncMenuProjection
    ) {
      await Promise.allSettled([
        this.syncHooks.syncMenuProjection({
          branchId: String(cart.branchId),
          itemIds: checkoutResult.affectedMenuItemIds,
        }),
      ]);
    }

    const sessionKey = await resolveSessionKey(this.sessionRepo, cart.sessionId ?? null);

    await this.eventBus.publish({
      type: "order.created",
      at: new Date().toISOString(),
      scope: {
        orderId: String(orderId),
        sessionId: cart.sessionId ?? null,
        sessionKey,
        clientId: cart.clientId ?? null,
        branchId: cart.branchId ?? null,
      },
      payload: {
        orderId: String(orderId),
        orderCode,
        sessionId: cart.sessionId ?? null,
        clientId: cart.clientId ?? null,
        itemCount: items.length,
        subtotal: items.reduce((s: number, it: any) => s + Number(it.unitPrice ?? it.unit_price) * Number(it.quantity ?? 0), 0),
      },
    });
    if (cart.branchId) {
      await this.eventBus.publish({
        type: "inventory.updated",
        at: new Date().toISOString(),
        scope: {
          sessionKey,
          branchId: cart.branchId,
        },
        payload: {
          branchId: cart.branchId,
          cartKey,
          orderCode,
          orderId: String(orderId),
          consumedIngredients: checkoutResult.consumedIngredients,
          affectedMenuItemIds: checkoutResult.affectedMenuItemIds,
          triggerStatus: checkoutResult.inventoryCommitPoint,
          source: "order.checkout.consume",
        },
      });
    }
    return {
      orderCode,
      orderId: String(orderId),
      subtotalAmount: checkoutResult.subtotalAmount,
      discountAmount: checkoutResult.discountAmount,
      totalAmount: checkoutResult.totalAmount,
      voucher: checkoutResult.voucher,
    };
  }
}
