import type { OrderStatus } from "../../../domain/entities/Order.js";

export type OpsTableActiveSummary = {
  tableId: string;

  activeOrdersCount: number;
  activeOrderCode: string | null;
  activeOrderStatus: OrderStatus | null;
  activeOrderUpdatedAt: string | null;

  activeItemsCount: number | null;
  activeItemsTop: Array<{ name: string; qty: number }> | null;
  activeItemsPreview: string | null;

  unpaidOrdersCount: number;
  unpaidOrderCode: string | null;
  unpaidOrderStatus: OrderStatus | null;
  unpaidOrderUpdatedAt: string | null;

  unpaidItemsCount: number | null;
  unpaidItemsTop: Array<{ name: string; qty: number }> | null;
  unpaidItemsPreview: string | null;
};

export interface IOpsTableOrderSummaryRepository {
  getActiveSummaryByTableIds(input: {
    branchId: string;
    tableIds: string[];
  }): Promise<Record<string, OpsTableActiveSummary>>;
}
