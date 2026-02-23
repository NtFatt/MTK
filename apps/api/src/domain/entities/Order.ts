export type OrderChannel = "DINE_IN" | "DELIVERY";
export type OrderStatus =
  | "NEW" | "RECEIVED" | "PREPARING" | "READY" | "SERVING"
  | "DELIVERING" | "COMPLETED" | "CANCELED" | "PAID";

export class Order {
  constructor(
    public readonly id: string,
    public readonly orderCode: string,
    public readonly orderChannel: OrderChannel,
    public readonly orderStatus: OrderStatus
  ) {}
}
