export type OrderChannel = "DINE_IN" | "DELIVERY";
export type CartStatus = "ACTIVE" | "CHECKED_OUT" | "ABANDONED";

export class Cart {
  constructor(
    public readonly id: string,
    public readonly cartKey: string,
    public readonly orderChannel: OrderChannel,
    public readonly status: CartStatus,
    public readonly branchId?: string | null,
    public readonly sessionId?: string | null,
    public readonly clientId?: string | null,
  ) {}
}
