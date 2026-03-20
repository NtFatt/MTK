import type {
  IOrderCheckoutService,
  CheckoutFromCartInput,
  CheckoutFromCartResult,
} from "../../../../application/ports/services/IOrderCheckoutService.js";
import type { IVoucherRepository } from "../../../../application/ports/repositories/IVoucherRepository.js";
import { pool } from "../connection.js";
import { MySQLMenuItemStockRepository } from "../repositories/MySQLMenuItemStockRepository.js";
import { consumeOrderInventory } from "./orderInventoryMutations.js";
import {
  calculateVoucherPricing,
  validateVoucherForSubtotal,
} from "../../../../domain/policies/voucherPricing.js";

export class MySQLOrderCheckoutService implements IOrderCheckoutService {
  constructor(
    private readonly stockRepo: MySQLMenuItemStockRepository,
    private readonly voucherRepo: IVoucherRepository | null = null,
  ) {}

  async checkoutFromCart(input: CheckoutFromCartInput): Promise<CheckoutFromCartResult> {
    const cart = input.cart;
    const items = input.items;
    if (!items?.length) throw new Error("CART_EMPTY");

    const branchId = cart.branchId ? String(cart.branchId) : null;
    if (!branchId) throw new Error("BRANCH_REQUIRED");

    const subtotalAmount = items.reduce((sum, item) => {
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      return sum + unitPrice * qty;
    }, 0);

    const conn: any = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [cartRows]: any = await conn.query(
        `SELECT cart_id, cart_status, applied_voucher_id
         FROM carts
         WHERE cart_id = ?
         FOR UPDATE`,
        [String(cart.id)],
      );
      const lockedCart = cartRows?.[0];
      if (!lockedCart) throw new Error("CART_NOT_FOUND");
      if (String(lockedCart.cart_status) !== "ACTIVE") throw new Error("CART_NOT_ACTIVE");

      let voucherSnapshot: CheckoutFromCartResult["voucher"] = null;
      let discountAmount = 0;
      let totalAmount = subtotalAmount;

      if (this.voucherRepo && lockedCart.applied_voucher_id) {
        const voucher = await this.voucherRepo.findById(String(lockedCart.applied_voucher_id), {
          conn,
          forUpdate: true,
        });
        if (!voucher) throw new Error("VOUCHER_NOT_FOUND");

        const sessionUsageCount =
          cart.sessionId && voucher.usageLimitPerSession != null
            ? await this.voucherRepo.countUsagesForSession(voucher.id, String(cart.sessionId), { conn })
            : 0;

        const validation = validateVoucherForSubtotal({
          voucher,
          subtotal: subtotalAmount,
          sessionUsageCount,
        });
        if (!validation.ok) throw new Error(validation.code);

        const pricing = calculateVoucherPricing({
          subtotal: subtotalAmount,
          voucher,
        });

        discountAmount = pricing.discountAmount;
        totalAmount = pricing.totalAfterDiscount;
        voucherSnapshot = {
          id: voucher.id,
          code: voucher.code,
          name: voucher.name,
          discountType: voucher.discountType,
          discountValue: voucher.discountValue,
          discountAmount: pricing.discountAmount,
        };
      }

      // 1) Create order (status NEW)
      const [orderRes]: any = await conn.query(
        `INSERT INTO orders (
           branch_id, session_id, client_id, order_code, order_channel, order_status, note,
           discount_percent_applied, subtotal_amount, discount_amount, delivery_fee, total_amount,
           voucher_id_snapshot, voucher_code_snapshot, voucher_name_snapshot,
           voucher_discount_type, voucher_discount_value, voucher_discount_amount
         )
         VALUES (?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
        [
          branchId,
          cart.sessionId ? String(cart.sessionId) : null,
          cart.clientId ? String(cart.clientId) : null,
          input.orderCode,
          cart.orderChannel,
          input.note ?? null,
          voucherSnapshot?.discountType === "PERCENT" ? voucherSnapshot.discountValue : 0,
          subtotalAmount,
          discountAmount,
          totalAmount,
          voucherSnapshot?.id ?? null,
          voucherSnapshot?.code ?? null,
          voucherSnapshot?.name ?? null,
          voucherSnapshot?.discountType ?? null,
          voucherSnapshot?.discountValue ?? null,
          voucherSnapshot?.discountAmount ?? 0,
        ],
      );

      const orderId = String(orderRes.insertId);

      // 2) Status history (UPDATED SCHEMA)
      // Sử dụng changed_by_type và changed_by_id thay vì changed_by
      await conn.query(
        `INSERT INTO order_status_history
          (order_id, from_status, to_status, changed_by_type, changed_by_id, note)
         VALUES
          (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          null,              // from_status (new order)
          "NEW",             // to_status
          "SYSTEM",          // changed_by_type: SYSTEM/CLIENT/ADMIN
          null,              // changed_by_id (SYSTEM => null)
          input.note ?? null // note (lưu lại ghi chú của order vào history dòng đầu tiên nếu muốn)
        ],
      );

      // 3) Insert order items
      const values: any[] = [];
      const placeholders: string[] = [];
      for (const it of items) {
        const qty = Number(it.quantity);
        if (!Number.isFinite(qty) || qty <= 0) throw new Error("INVALID_QUANTITY");

        const unitPrice = Number(it.unitPrice);
        const lineTotal = unitPrice * qty;

        placeholders.push("(?, ?, ?, ?, ?, ?, ?)");
        values.push(
          orderId,
          String(it.itemId),
          String((it as any).itemName ?? ""),
          unitPrice,
          qty,
          it.itemOptions ? JSON.stringify(it.itemOptions) : null,
          lineTotal,
        );
      }

      if (values.length > 0) {
        await conn.query(
          `INSERT INTO order_items (order_id, item_id, item_name, unit_price, quantity, item_options, line_total)
           VALUES ${placeholders.join(", ")}`,
          values,
        );
      }

      await conn.query(
        `UPDATE orders
         SET discount_percent_applied = ?,
             subtotal_amount = ?,
             discount_amount = ?,
             total_amount = ?,
             voucher_discount_amount = ?
         WHERE order_id = ?`,
        [
          voucherSnapshot?.discountType === "PERCENT" ? voucherSnapshot.discountValue : 0,
          subtotalAmount,
          discountAmount,
          totalAmount,
          voucherSnapshot?.discountAmount ?? 0,
          orderId,
        ],
      );

      // 4) Decrement stock atomically per item
      const agg = new Map<string, number>();
      for (const it of items) {
        const key = String(it.itemId);
        const qty = Number(it.quantity);
        agg.set(key, (agg.get(key) ?? 0) + qty);
      }

      for (const [itemId, qty] of agg.entries()) {
        // Giả sử stockRepo.decrementIfEnough nhận conn để chạy trong transaction này
        // Nếu hàm này chưa hỗ trợ transaction connection, bạn cần sửa lại repo đó.
        const ok = await this.stockRepo.decrementIfEnough(conn, branchId, itemId, qty);
        if (!ok) throw new Error("OUT_OF_STOCK");
      }

      // 5) Commit ingredient inventory at the same business commit point as order creation.
      const inventoryResult = await consumeOrderInventory(conn, {
        orderId,
        branchId,
        triggerStatus: "ORDER_CREATED",
      });

      if (this.voucherRepo && voucherSnapshot) {
        await this.voucherRepo.recordUsage(
          {
            voucherId: voucherSnapshot.id,
            branchId,
            orderId,
            sessionId: cart.sessionId ? String(cart.sessionId) : null,
            voucherCodeSnapshot: voucherSnapshot.code,
            voucherNameSnapshot: voucherSnapshot.name,
            discountType: voucherSnapshot.discountType,
            discountValue: voucherSnapshot.discountValue,
            discountAmount: voucherSnapshot.discountAmount,
            subtotalAmount,
            totalAfterDiscount: totalAmount,
          },
          { conn },
        );
      }

      // 6) Checkout cart
      await conn.query(`UPDATE carts SET cart_status = 'CHECKED_OUT' WHERE cart_id = ?`, [String(cart.id)]);

      await conn.commit();
      return {
        orderId,
        orderCode: input.orderCode,
        subtotalAmount,
        discountAmount,
        totalAmount,
        voucher: voucherSnapshot,
        affectedMenuItemIds: inventoryResult.affectedMenuItemIds,
        consumedIngredients: inventoryResult.ingredientTotals,
        inventoryCommitPoint: "ORDER_CREATED",
      };
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        // ignore rollback error
      }
      throw err;
    } finally {
      try {
        conn.release();
      } catch {
        // ignore release error
      }
    }
  }
}
