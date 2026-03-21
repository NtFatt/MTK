import type {
  IOrderCheckoutService,
  CheckoutFromCartInput,
  CheckoutFromCartResult,
} from "../../../../application/ports/services/IOrderCheckoutService.js";
import type { IVoucherRepository, VoucherRecord } from "../../../../application/ports/repositories/IVoucherRepository.js";
import type { OrderStatus } from "../../../../domain/entities/Order.js";
import { pool } from "../connection.js";
import { MySQLMenuItemStockRepository } from "../repositories/MySQLMenuItemStockRepository.js";
import { consumeOrderInventory } from "./orderInventoryMutations.js";
import {
  calculateVoucherPricing,
  validateVoucherForSubtotal,
} from "../../../../domain/policies/voucherPricing.js";

type LockedCartRow = {
  cartId: string;
  cartStatus: string;
  appliedVoucherId: string | null;
};

type LockedLiveDineInOrderRow = {
  orderId: string;
  orderCode: string;
  orderStatus: OrderStatus;
  note: string | null;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  voucherId: string | null;
  voucherCode: string | null;
  voucherName: string | null;
  voucherDiscountType: "PERCENT" | "FIXED_AMOUNT" | null;
  voucherDiscountValue: number | null;
  voucherDiscountAmount: number;
};

type VoucherSnapshot = CheckoutFromCartResult["voucher"];

type PricingResolution = {
  voucherSnapshot: VoucherSnapshot;
  discountAmount: number;
  totalAmount: number;
  rewriteVoucherUsage: boolean;
};

function toNum(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const next = String(value).trim();
  return next ? next : null;
}

function normalizeOrderStatus(value: unknown): OrderStatus {
  return String(value ?? "NEW").trim().toUpperCase() as OrderStatus;
}

function isLiveDineInStatus(status: OrderStatus): boolean {
  return status !== "PAID" && status !== "CANCELED";
}

function resolveStatusForAppend(currentStatus: OrderStatus): OrderStatus {
  if (currentStatus === "READY" || currentStatus === "SERVING" || currentStatus === "COMPLETED") {
    return "RECEIVED";
  }
  return currentStatus;
}

function buildMergedOrderNote(existingNote: string | null, nextNote: string | null, appendMode: boolean): string | null {
  const trimmedNext = typeof nextNote === "string" ? nextNote.trim() : "";
  const trimmedExisting = typeof existingNote === "string" ? existingNote.trim() : "";

  if (!appendMode) {
    return trimmedNext || null;
  }

  if (!trimmedNext) {
    return trimmedExisting || null;
  }

  if (!trimmedExisting) {
    return `Gọi thêm món: ${trimmedNext}`;
  }

  return `${trimmedExisting}\n---\nGọi thêm món: ${trimmedNext}`;
}

function buildAppendHistoryNote(batchItemCount: number, note: string | null): string {
  const suffix = note && note.trim() ? ` | note=${note.trim()}` : "";
  return `DINE_IN_APPEND_ITEMS lines=${batchItemCount}${suffix}`;
}

async function lockCart(conn: any, cartId: string): Promise<LockedCartRow> {
  const [cartRows]: any = await conn.query(
    `SELECT cart_id, cart_status, applied_voucher_id
     FROM carts
     WHERE cart_id = ?
     FOR UPDATE`,
    [cartId],
  );

  const lockedCart = cartRows?.[0];
  if (!lockedCart) throw new Error("CART_NOT_FOUND");

  return {
    cartId: String(lockedCart.cart_id),
    cartStatus: String(lockedCart.cart_status ?? ""),
    appliedVoucherId: toNullableString(lockedCart.applied_voucher_id),
  };
}

async function lockLatestLiveDineInOrderForSession(
  conn: any,
  sessionId: string | null,
): Promise<LockedLiveDineInOrderRow | null> {
  if (!sessionId) return null;

  const [rows]: any = await conn.query(
    `SELECT
        order_id,
        order_code,
        order_status,
        note,
        subtotal_amount,
        discount_amount,
        total_amount,
        voucher_id_snapshot,
        voucher_code_snapshot,
        voucher_name_snapshot,
        voucher_discount_type,
        voucher_discount_value,
        voucher_discount_amount
     FROM orders
     WHERE session_id = ?
       AND order_channel = 'DINE_IN'
       AND order_status NOT IN ('PAID', 'CANCELED')
     ORDER BY updated_at DESC, order_id DESC
     LIMIT 1
     FOR UPDATE`,
    [sessionId],
  );

  const row = rows?.[0];
  if (!row) return null;

  return {
    orderId: String(row.order_id),
    orderCode: String(row.order_code),
    orderStatus: normalizeOrderStatus(row.order_status),
    note: toNullableString(row.note),
    subtotalAmount: toNum(row.subtotal_amount),
    discountAmount: toNum(row.discount_amount),
    totalAmount: toNum(row.total_amount),
    voucherId: toNullableString(row.voucher_id_snapshot),
    voucherCode: toNullableString(row.voucher_code_snapshot),
    voucherName: toNullableString(row.voucher_name_snapshot),
    voucherDiscountType: row.voucher_discount_type
      ? String(row.voucher_discount_type) as LockedLiveDineInOrderRow["voucherDiscountType"]
      : null,
    voucherDiscountValue:
      row.voucher_discount_value === null || row.voucher_discount_value === undefined
        ? null
        : toNum(row.voucher_discount_value),
    voucherDiscountAmount: toNum(row.voucher_discount_amount),
  };
}

async function insertOrderItems(
  conn: any,
  orderId: string,
  items: CheckoutFromCartInput["items"],
): Promise<string[]> {
  const orderItemIds: string[] = [];

  for (const item of items) {
    const quantity = toNum(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("INVALID_QUANTITY");

    const unitPrice = toNum(item.unitPrice);
    const lineTotal = roundMoney(unitPrice * quantity);

    const [result]: any = await conn.query(
      `INSERT INTO order_items (order_id, item_id, item_name, unit_price, quantity, item_options, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        String(item.itemId),
        String((item as any).itemName ?? ""),
        unitPrice,
        quantity,
        item.itemOptions ? JSON.stringify(item.itemOptions) : null,
        lineTotal,
      ],
    );

    orderItemIds.push(String(result.insertId));
  }

  return orderItemIds;
}

async function decrementMenuItemStocks(
  conn: any,
  stockRepo: MySQLMenuItemStockRepository,
  branchId: string,
  items: CheckoutFromCartInput["items"],
): Promise<void> {
  const byItemId = new Map<string, number>();

  for (const item of items) {
    const itemId = String(item.itemId);
    const quantity = toNum(item.quantity);
    byItemId.set(itemId, (byItemId.get(itemId) ?? 0) + quantity);
  }

  for (const [itemId, quantity] of byItemId.entries()) {
    const ok = await stockRepo.decrementIfEnough(conn, branchId, itemId, quantity);
    if (!ok) throw new Error("OUT_OF_STOCK");
  }
}

async function resolvePricing(
  input: {
    conn: any;
    voucherRepo: IVoucherRepository | null;
    sessionId: string | null;
    subtotalAmount: number;
    selectedVoucherId: string | null;
    existingOrder: LockedLiveDineInOrderRow | null;
  },
): Promise<PricingResolution> {
  const { voucherRepo, subtotalAmount, selectedVoucherId, existingOrder, sessionId } = input;

  if (!voucherRepo) {
    return {
      voucherSnapshot: null,
      discountAmount: existingOrder ? Math.min(subtotalAmount, existingOrder.discountAmount) : 0,
      totalAmount: existingOrder
        ? roundMoney(Math.max(0, subtotalAmount - Math.min(subtotalAmount, existingOrder.discountAmount)))
        : subtotalAmount,
      rewriteVoucherUsage: false,
    };
  }

  if (selectedVoucherId) {
    const voucher = await voucherRepo.findById(selectedVoucherId, {
      conn: input.conn,
      forUpdate: true,
    });
    if (!voucher) throw new Error("VOUCHER_NOT_FOUND");

    const selectedMatchesExisting = existingOrder?.voucherId != null && existingOrder.voucherId === voucher.id;
    const usageOffset = selectedMatchesExisting ? 1 : 0;
    const rawSessionUsageCount =
      sessionId && voucher.usageLimitPerSession != null
        ? await voucherRepo.countUsagesForSession(voucher.id, String(sessionId), { conn: input.conn })
        : 0;

    const adjustedVoucher: VoucherRecord = {
      ...voucher,
      usageCount: Math.max(0, voucher.usageCount - usageOffset),
    };

    const validation = validateVoucherForSubtotal({
      voucher: adjustedVoucher,
      subtotal: subtotalAmount,
      sessionUsageCount: Math.max(0, rawSessionUsageCount - usageOffset),
    });
    if (!validation.ok) throw new Error(validation.code);

    const pricing = calculateVoucherPricing({
      subtotal: subtotalAmount,
      voucher,
    });

    return {
      voucherSnapshot: {
        id: voucher.id,
        code: voucher.code,
        name: voucher.name,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        discountAmount: pricing.discountAmount,
      },
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAfterDiscount,
      rewriteVoucherUsage: true,
    };
  }

  if (existingOrder?.voucherCode && existingOrder.voucherDiscountType && existingOrder.voucherDiscountValue != null) {
    const preservedDiscount = Math.min(subtotalAmount, Math.max(0, existingOrder.voucherDiscountAmount));
    return {
      voucherSnapshot: existingOrder.voucherId
        ? {
            id: existingOrder.voucherId,
            code: existingOrder.voucherCode,
            name: existingOrder.voucherName ?? existingOrder.voucherCode,
            discountType: existingOrder.voucherDiscountType,
            discountValue: existingOrder.voucherDiscountValue,
            discountAmount: preservedDiscount,
          }
        : null,
      discountAmount: preservedDiscount,
      totalAmount: roundMoney(Math.max(0, subtotalAmount - preservedDiscount)),
      rewriteVoucherUsage: false,
    };
  }

  return {
    voucherSnapshot: null,
    discountAmount: 0,
    totalAmount: subtotalAmount,
    rewriteVoucherUsage: false,
  };
}

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

    const batchSubtotalAmount = roundMoney(
      items.reduce((sum, item) => sum + toNum(item.unitPrice) * toNum(item.quantity), 0),
    );

    const conn: any = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const lockedCart = await lockCart(conn, String(cart.id));
      if (lockedCart.cartStatus !== "ACTIVE") throw new Error("CART_NOT_ACTIVE");

      const liveDineInOrder =
        cart.orderChannel === "DINE_IN"
          ? await lockLatestLiveDineInOrderForSession(conn, cart.sessionId ? String(cart.sessionId) : null)
          : null;

      const appendMode = Boolean(
        liveDineInOrder &&
          cart.orderChannel === "DINE_IN" &&
          isLiveDineInStatus(liveDineInOrder.orderStatus),
      );

      const nextSubtotalAmount = roundMoney(
        (appendMode ? liveDineInOrder!.subtotalAmount : 0) + batchSubtotalAmount,
      );

      const pricing = await resolvePricing({
        conn,
        voucherRepo: this.voucherRepo,
        sessionId: cart.sessionId ? String(cart.sessionId) : null,
        subtotalAmount: nextSubtotalAmount,
        selectedVoucherId: lockedCart.appliedVoucherId,
        existingOrder: appendMode ? liveDineInOrder : null,
      });

      let orderId: string;
      let orderCode: string;
      let previousOrderStatus: OrderStatus | null = null;
      let currentOrderStatus: OrderStatus = "NEW";
      let statusTransition: CheckoutFromCartResult["statusTransition"] = null;
      let checkoutMode: CheckoutFromCartResult["checkoutMode"] = appendMode ? "APPENDED" : "CREATED";

      if (appendMode) {
        orderId = liveDineInOrder!.orderId;
        orderCode = liveDineInOrder!.orderCode;
        previousOrderStatus = liveDineInOrder!.orderStatus;
        currentOrderStatus = resolveStatusForAppend(liveDineInOrder!.orderStatus);
        statusTransition =
          currentOrderStatus !== previousOrderStatus
            ? {
                fromStatus: previousOrderStatus,
                toStatus: currentOrderStatus,
              }
            : null;
      } else {
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
            buildMergedOrderNote(null, input.note ?? null, false),
            pricing.voucherSnapshot?.discountType === "PERCENT" ? pricing.voucherSnapshot.discountValue : 0,
            nextSubtotalAmount,
            pricing.discountAmount,
            pricing.totalAmount,
            pricing.voucherSnapshot?.id ?? null,
            pricing.voucherSnapshot?.code ?? null,
            pricing.voucherSnapshot?.name ?? null,
            pricing.voucherSnapshot?.discountType ?? null,
            pricing.voucherSnapshot?.discountValue ?? null,
            pricing.voucherSnapshot?.discountAmount ?? 0,
          ],
        );

        orderId = String(orderRes.insertId);
        orderCode = input.orderCode;

        await conn.query(
          `INSERT INTO order_status_history
            (order_id, from_status, to_status, changed_by_type, changed_by_id, note)
           VALUES
            (?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            null,
            "NEW",
            "SYSTEM",
            null,
            input.note ?? null,
          ],
        );
      }

      const orderItemIds = await insertOrderItems(conn, orderId, items);
      await decrementMenuItemStocks(conn, this.stockRepo, branchId, items);

      const inventoryResult = await consumeOrderInventory(conn, {
        orderId,
        branchId,
        triggerStatus: "ORDER_CREATED",
        orderItemIds,
      });

      if (appendMode) {
        const mergedNote = buildMergedOrderNote(liveDineInOrder!.note, input.note ?? null, true);

        await conn.query(
          `UPDATE orders
           SET order_status = ?,
               note = ?,
               discount_percent_applied = ?,
               subtotal_amount = ?,
               discount_amount = ?,
               total_amount = ?,
               voucher_id_snapshot = ?,
               voucher_code_snapshot = ?,
               voucher_name_snapshot = ?,
               voucher_discount_type = ?,
               voucher_discount_value = ?,
               voucher_discount_amount = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE order_id = ?`,
          [
            currentOrderStatus,
            mergedNote,
            pricing.voucherSnapshot?.discountType === "PERCENT" ? pricing.voucherSnapshot.discountValue : 0,
            nextSubtotalAmount,
            pricing.discountAmount,
            pricing.totalAmount,
            pricing.voucherSnapshot?.id ?? null,
            pricing.voucherSnapshot?.code ?? null,
            pricing.voucherSnapshot?.name ?? null,
            pricing.voucherSnapshot?.discountType ?? null,
            pricing.voucherSnapshot?.discountValue ?? null,
            pricing.voucherSnapshot?.discountAmount ?? 0,
            orderId,
          ],
        );

        await conn.query(
          `INSERT INTO order_status_history
            (order_id, from_status, to_status, changed_by_type, changed_by_id, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            previousOrderStatus,
            currentOrderStatus,
            cart.clientId ? "CLIENT" : "SYSTEM",
            cart.clientId ? String(cart.clientId) : null,
            buildAppendHistoryNote(items.length, input.note ?? null),
          ],
        );
      } else {
        await conn.query(
          `UPDATE orders
           SET discount_percent_applied = ?,
               subtotal_amount = ?,
               discount_amount = ?,
               total_amount = ?,
               voucher_discount_amount = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE order_id = ?`,
          [
            pricing.voucherSnapshot?.discountType === "PERCENT" ? pricing.voucherSnapshot.discountValue : 0,
            nextSubtotalAmount,
            pricing.discountAmount,
            pricing.totalAmount,
            pricing.voucherSnapshot?.discountAmount ?? 0,
            orderId,
          ],
        );
      }

      if (this.voucherRepo && pricing.rewriteVoucherUsage && pricing.voucherSnapshot) {
        await this.voucherRepo.reverseUsageForOrder(orderId, { conn });
        await this.voucherRepo.recordUsage(
          {
            voucherId: pricing.voucherSnapshot.id,
            branchId,
            orderId,
            sessionId: cart.sessionId ? String(cart.sessionId) : null,
            voucherCodeSnapshot: pricing.voucherSnapshot.code,
            voucherNameSnapshot: pricing.voucherSnapshot.name,
            discountType: pricing.voucherSnapshot.discountType,
            discountValue: pricing.voucherSnapshot.discountValue,
            discountAmount: pricing.voucherSnapshot.discountAmount,
            subtotalAmount: nextSubtotalAmount,
            totalAfterDiscount: pricing.totalAmount,
          },
          { conn },
        );
      }

      await conn.query(
        `UPDATE carts
         SET cart_status = 'CHECKED_OUT'
         WHERE cart_id = ?`,
        [String(cart.id)],
      );

      await conn.commit();

      return {
        orderId,
        orderCode,
        checkoutMode,
        subtotalAmount: nextSubtotalAmount,
        discountAmount: pricing.discountAmount,
        totalAmount: pricing.totalAmount,
        voucher: pricing.voucherSnapshot,
        affectedMenuItemIds: inventoryResult.affectedMenuItemIds,
        consumedIngredients: inventoryResult.ingredientTotals,
        inventoryCommitPoint: "ORDER_CREATED",
        previousOrderStatus,
        currentOrderStatus,
        statusTransition,
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
