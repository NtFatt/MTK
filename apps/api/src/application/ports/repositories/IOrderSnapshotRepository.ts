export type PaymentSnapshot = {
  paymentId: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  txnRef: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderItemSnapshot = {
  orderItemId: string;
  itemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  itemOptions: any | null;
  pricingBreakdown: any | null;
};

export type OrderSnapshot = {
  order: {
    orderId: string;
    orderCode: string;
    branchId: string | null;
    sessionId: string | null;
    clientId: string | null;
    orderChannel: "DINE_IN" | "DELIVERY";
    orderStatus: string;
    note: string | null;
    discountPercentApplied: number;
    subtotalAmount: number;
    discountAmount: number;
    deliveryFee: number;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    acceptedAt: string | null;
    preparedAt: string | null;
    completedAt: string | null;
    paidAt: string | null;
    canceledAt: string | null;
  };
  items: OrderItemSnapshot[];
  payment: PaymentSnapshot | null;
};

export type SessionLatestOrderRef = {
  orderId: string;
  orderCode: string;
  orderStatus: string;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
};

export interface IOrderSnapshotRepository {
  getOrderSnapshotById(orderId: string): Promise<OrderSnapshot | null>;
  getLatestOrderForSession(sessionId: string): Promise<SessionLatestOrderRef | null>;
}
