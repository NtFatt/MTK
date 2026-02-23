export type CartItemOptions = any; // JSON payload (validated at boundary)

export class CartItem {
  constructor(
    public readonly cartId: string,
    public readonly itemId: string,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly optionsHash: string = "",
    public readonly itemOptions: CartItemOptions | null = null,
  ) {}
}
