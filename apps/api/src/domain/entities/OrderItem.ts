export type OrderItemOptions = any; // JSON snapshot

export class OrderItem {
  constructor(
    public readonly itemId: string,
    public readonly itemName: string,
    public readonly unitPrice: number,
    public readonly quantity: number,
    public readonly itemOptions: OrderItemOptions | null = null,
  ) {}
}
