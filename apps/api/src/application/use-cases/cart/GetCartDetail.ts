import type { ICartRepository } from "../../ports/repositories/ICartRepository.js";
import type { ICartItemRepository } from "../../ports/repositories/ICartItemRepository.js";
import type { IVoucherRepository } from "../../ports/repositories/IVoucherRepository.js";
import { buildVoucherPreview } from "./cartVoucherPreview.js";

export class GetCartDetail {
  constructor(
    private cartRepo: ICartRepository,
    private cartItemRepo: ICartItemRepository,
    private voucherRepo: IVoucherRepository | null = null,
  ) {}

  async execute(cartKey: string) {
    const cart = await this.cartRepo.findByCartKey(cartKey);
    if (!cart) throw new Error("CART_NOT_FOUND");

    const items = await this.cartItemRepo.listByCartId(cart.id);
    const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const appliedVoucher =
      this.voucherRepo && cart.appliedVoucherId
        ? await this.voucherRepo.getCartVoucher(cart.id)
        : null;

    const voucher =
      this.voucherRepo && appliedVoucher
        ? await buildVoucherPreview({
            voucher: appliedVoucher,
            subtotal,
            sessionId: cart.sessionId ?? null,
            voucherRepo: this.voucherRepo,
          })
        : null;

    const discount = voucher?.discountAmount ?? 0;
    const total = voucher?.totalAfterDiscount ?? subtotal;

    return { cart, items, subtotal, discount, total, voucher };
  }
}
