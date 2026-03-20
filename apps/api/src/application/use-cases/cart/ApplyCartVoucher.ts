import type { ICartRepository } from "../../ports/repositories/ICartRepository.js";
import type { ICartItemRepository } from "../../ports/repositories/ICartItemRepository.js";
import type { IVoucherRepository } from "../../ports/repositories/IVoucherRepository.js";
import type { ITableSessionRepository } from "../../ports/repositories/ITableSessionRepository.js";
import type { IEventBus } from "../../ports/events/IEventBus.js";
import { NoopEventBus } from "../../ports/events/NoopEventBus.js";
import { buildVoucherPreview } from "./cartVoucherPreview.js";

async function resolveSessionKey(
  sessionRepo: ITableSessionRepository | null,
  sessionId?: string | null,
): Promise<string | null> {
  if (!sessionRepo || !sessionId) return null;
  const session = await sessionRepo.findById(sessionId);
  return session?.sessionKey ? String(session.sessionKey) : null;
}

function normalizeCode(code: string): string {
  return String(code ?? "").trim().toUpperCase();
}

export class ApplyCartVoucher {
  constructor(
    private readonly cartRepo: ICartRepository,
    private readonly cartItemRepo: ICartItemRepository,
    private readonly voucherRepo: IVoucherRepository,
    private readonly sessionRepo: ITableSessionRepository | null,
    private readonly eventBus: IEventBus = new NoopEventBus(),
  ) {}

  async execute(cartKey: string, voucherCode: string) {
    const normalizedCode = normalizeCode(voucherCode);
    if (!normalizedCode) throw new Error("INVALID_VOUCHER_CODE");

    const cart = await this.cartRepo.findByCartKey(cartKey);
    if (!cart) throw new Error("CART_NOT_FOUND");
    if (cart.status !== "ACTIVE") throw new Error("CART_NOT_ACTIVE");
    if (!cart.branchId) throw new Error("BRANCH_REQUIRED");

    const items = await this.cartItemRepo.listByCartId(cart.id);
    if (!items.length) throw new Error("CART_EMPTY");

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    const voucher = await this.voucherRepo.findByCodeForBranch(cart.branchId, normalizedCode);
    if (!voucher) throw new Error("VOUCHER_NOT_FOUND");

    const preview = await buildVoucherPreview({
      voucher,
      subtotal,
      sessionId: cart.sessionId ?? null,
      voucherRepo: this.voucherRepo,
    });

    if (!preview.isValid) {
      throw new Error(preview.invalidReasonCode ?? "VOUCHER_INVALID");
    }

    await this.voucherRepo.setCartVoucher(cart.id, voucher.id);

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
        action: "VOUCHER_APPLIED",
        voucherCode: voucher.code,
        voucherId: voucher.id,
        discountAmount: preview.discountAmount,
        totalAfterDiscount: preview.totalAfterDiscount,
      },
    });

    return {
      applied: true,
      voucher: preview,
      subtotal,
      discount: preview.discountAmount,
      total: preview.totalAfterDiscount,
    };
  }
}
