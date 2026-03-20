import type { ICartRepository } from "../../ports/repositories/ICartRepository.js";
import type { ICartItemRepository } from "../../ports/repositories/ICartItemRepository.js";
import type { IVoucherRepository } from "../../ports/repositories/IVoucherRepository.js";
import { buildVoucherPreview } from "../cart/cartVoucherPreview.js";

export class ListPublicVouchers {
  constructor(
    private readonly cartRepo: ICartRepository,
    private readonly cartItemRepo: ICartItemRepository,
    private readonly voucherRepo: IVoucherRepository,
  ) {}

  async execute(input: { cartKey: string }) {
    const cart = await this.cartRepo.findByCartKey(input.cartKey);
    if (!cart) throw new Error("CART_NOT_FOUND");
    if (!cart.branchId) throw new Error("BRANCH_REQUIRED");

    const items = await this.cartItemRepo.listByCartId(cart.id);
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const vouchers = await this.voucherRepo.listPublicByBranch(cart.branchId);

    const previews = await Promise.all(
      vouchers.map((voucher) =>
        buildVoucherPreview({
          voucher,
          subtotal,
          sessionId: cart.sessionId ?? null,
          voucherRepo: this.voucherRepo,
        }),
      ),
    );

    return {
      items: previews,
      subtotal,
      appliedVoucherId: cart.appliedVoucherId ?? null,
    };
  }
}
