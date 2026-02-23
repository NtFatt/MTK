import { pool } from "../connection.js";
import type {
  IOrderSnapshotRepository,
  OrderSnapshot,
  SessionLatestOrderRef,
} from "../../../../application/ports/repositories/IOrderSnapshotRepository.js";

function toIso(v: any): string | null {
  if (!v) return null;
  try {
    return new Date(v).toISOString();
  } catch {
    return null;
  }
}

function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export class MySQLOrderSnapshotRepository implements IOrderSnapshotRepository {
  async getOrderSnapshotById(orderId: string): Promise<OrderSnapshot | null> {
    const id = String(orderId).trim();
    if (!id) return null;

    const [rows]: any = await pool.query(
      `SELECT o.order_id, o.order_code, o.branch_id, o.session_id, o.client_id,
              o.order_channel, o.order_status, o.note,
              o.discount_percent_applied, o.subtotal_amount, o.discount_amount, o.delivery_fee, o.total_amount,
              o.created_at, o.updated_at, o.accepted_at, o.prepared_at, o.completed_at, o.paid_at, o.canceled_at
       FROM orders o
       WHERE o.order_id = ?
       LIMIT 1`,
      [id],
    );

    const r = rows?.[0];
    if (!r) return null;

    const [itemRows]: any = await pool.query(
      `SELECT order_item_id, item_id, item_name, unit_price, quantity, line_total, item_options, pricing_breakdown
       FROM order_items
       WHERE order_id = ?
       ORDER BY order_item_id ASC`,
      [id],
    );

    const items = (Array.isArray(itemRows) ? itemRows : []).map((x: any) => ({
      orderItemId: String(x.order_item_id),
      itemId: String(x.item_id),
      itemName: String(x.item_name),
      unitPrice: toNum(x.unit_price),
      quantity: Number(x.quantity ?? 0),
      lineTotal: toNum(x.line_total),
      itemOptions: x.item_options ?? null,
      pricingBreakdown: x.pricing_breakdown ?? null,
    }));

    // We only care about the latest payment record for snapshot.
    const [payRows]: any = await pool.query(
      `SELECT payment_id, provider, amount, currency, status, txn_ref, created_at, updated_at
       FROM payments
       WHERE order_id = ?
       ORDER BY payment_id DESC
       LIMIT 1`,
      [id],
    );
    const p = payRows?.[0];

    return {
      order: {
        orderId: String(r.order_id),
        orderCode: String(r.order_code),
        branchId: r.branch_id ? String(r.branch_id) : null,
        sessionId: r.session_id ? String(r.session_id) : null,
        clientId: r.client_id ? String(r.client_id) : null,
        orderChannel: String(r.order_channel) === "DELIVERY" ? "DELIVERY" : "DINE_IN",
        orderStatus: String(r.order_status),
        note: r.note ? String(r.note) : null,
        discountPercentApplied: toNum(r.discount_percent_applied),
        subtotalAmount: toNum(r.subtotal_amount),
        discountAmount: toNum(r.discount_amount),
        deliveryFee: toNum(r.delivery_fee),
        totalAmount: toNum(r.total_amount),
        createdAt: toIso(r.created_at) ?? new Date().toISOString(),
        updatedAt: toIso(r.updated_at) ?? new Date().toISOString(),
        acceptedAt: toIso(r.accepted_at),
        preparedAt: toIso(r.prepared_at),
        completedAt: toIso(r.completed_at),
        paidAt: toIso(r.paid_at),
        canceledAt: toIso(r.canceled_at),
      },
      items,
      payment: p
        ? {
            paymentId: String(p.payment_id),
            provider: String(p.provider),
            amount: toNum(p.amount),
            currency: String(p.currency),
            status: String(p.status),
            txnRef: String(p.txn_ref),
            createdAt: toIso(p.created_at) ?? new Date().toISOString(),
            updatedAt: toIso(p.updated_at) ?? new Date().toISOString(),
          }
        : null,
    };
  }

  async getLatestOrderForSession(sessionId: string): Promise<SessionLatestOrderRef | null> {
    const sid = String(sessionId).trim();
    if (!sid) return null;

    const [rows]: any = await pool.query(
      `SELECT order_id, order_code, order_status, created_at, updated_at, paid_at
       FROM orders
       WHERE session_id = ?
       ORDER BY order_id DESC
       LIMIT 1`,
      [sid],
    );
    const r = rows?.[0];
    if (!r) return null;

    return {
      orderId: String(r.order_id),
      orderCode: String(r.order_code),
      orderStatus: String(r.order_status),
      createdAt: toIso(r.created_at) ?? new Date().toISOString(),
      updatedAt: toIso(r.updated_at) ?? new Date().toISOString(),
      paidAt: toIso(r.paid_at),
    };
  }
}
