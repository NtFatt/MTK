import type { ICartRepository } from "../../ports/repositories/ICartRepository.js";
import type { ICartItemRepository } from "../../ports/repositories/ICartItemRepository.js";

export class GetCartDetail {
  constructor(
    private cartRepo: ICartRepository,
    private cartItemRepo: ICartItemRepository
  ) {}

  async execute(cartKey: string) {
    const cart = await this.cartRepo.findByCartKey(cartKey);
    if (!cart) throw new Error("CART_NOT_FOUND");

    const items = await this.cartItemRepo.listByCartId(cart.id);
    const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

    return { cart, items, subtotal };
  }
}
