import type { ICartRepository } from "../../ports/repositories/ICartRepository.js";
import type { ITableSessionRepository } from "../../ports/repositories/ITableSessionRepository.js";
import type { IVoucherRepository } from "../../ports/repositories/IVoucherRepository.js";
import type { IEventBus } from "../../ports/events/IEventBus.js";
import { NoopEventBus } from "../../ports/events/NoopEventBus.js";

async function resolveSessionKey(
  sessionRepo: ITableSessionRepository | null,
  sessionId?: string | null,
): Promise<string | null> {
  if (!sessionRepo || !sessionId) return null;
  const session = await sessionRepo.findById(sessionId);
  return session?.sessionKey ? String(session.sessionKey) : null;
}

export class RemoveCartVoucher {
  constructor(
    private readonly cartRepo: ICartRepository,
    private readonly voucherRepo: IVoucherRepository,
    private readonly sessionRepo: ITableSessionRepository | null,
    private readonly eventBus: IEventBus = new NoopEventBus(),
  ) {}

  async execute(cartKey: string) {
    const cart = await this.cartRepo.findByCartKey(cartKey);
    if (!cart) throw new Error("CART_NOT_FOUND");
    if (cart.status !== "ACTIVE") throw new Error("CART_NOT_ACTIVE");

    const previousVoucherId = cart.appliedVoucherId ?? null;
    await this.voucherRepo.setCartVoucher(cart.id, null);

    const sessionKey = await resolveSessionKey(this.sessionRepo, cart.sessionId ?? null);
    await this.eventBus.publish({
      type: "cart.updated",
      at: new Date().toISOString(),
      scope: {
        sessionId: cart.sessionId ?? null,
        sessionKey,
        clientId: cart.clientId ?? null,
        branchId: cart.branchId ?? null,
      },
      payload: {
        cartKey,
        cartId: cart.id,
        action: "VOUCHER_REMOVED",
        voucherId: previousVoucherId,
      },
    });

    return { removed: Boolean(previousVoucherId) };
  }
}
