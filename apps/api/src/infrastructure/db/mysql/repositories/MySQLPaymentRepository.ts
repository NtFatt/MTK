import type { IPaymentRepository } from "../../../../application/ports/repositories/IPaymentRepository.js";
import { pool } from "../connection.js";

export class MySQLPaymentRepository implements IPaymentRepository {
  async createInitPayment(
    orderCode: string,
    opts?: { provider?: string; txnPrefix?: string },
  ) {
    const [rows]: any = await pool.query(
      `SELECT order_id, total_amount FROM orders WHERE order_code = ? LIMIT 1`,
      [orderCode]
    );
    if (!rows?.[0]) throw new Error("ORDER_NOT_FOUND");

    // Avoid collisions under concurrent requests (Date.now alone can collide)
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const provider = String(opts?.provider ?? "VNPAY").toUpperCase();
    const prefix = String(opts?.txnPrefix ?? (provider === "CASH" ? "CASH" : "VNP")).toUpperCase();
    const txnRef = `${prefix}-${Date.now()}-${rand}`;

    const [res]: any = await pool.query(
      `INSERT INTO payments (order_id, amount, txn_ref, provider)
       VALUES (?, ?, ?, ?)`,
      [rows[0].order_id, rows[0].total_amount, txnRef, provider]
    );

    return {
      paymentId: String(res.insertId),
      txnRef,
      amount: Number(rows[0].total_amount),
    };
  }

  async markRedirected(paymentId: string): Promise<void> {
    await pool.query(`UPDATE payments SET status = 'REDIRECTED' WHERE payment_id = ?`, [paymentId]);
  }

  async markSuccess(txnRef: string): Promise<void> {
    // idempotent: avoid retriggering payment SUCCESS triggers
    await pool.query(
      `UPDATE payments SET status = 'SUCCESS' WHERE txn_ref = ? AND status <> 'SUCCESS'`,
      [txnRef]
    );
  }

  async markFailed(txnRef: string): Promise<void> {
    await pool.query(
      `UPDATE payments SET status = 'FAILED' WHERE txn_ref = ? AND status <> 'SUCCESS'`,
      [txnRef]
    );
  }

  async findOrderCodeByTxnRef(txnRef: string): Promise<string | null> {
    const [rows]: any = await pool.query(
      `SELECT o.order_code
       FROM payments p
       JOIN orders o ON o.order_id = p.order_id
       WHERE p.txn_ref = ?
       LIMIT 1`,
      [txnRef]
    );
    const r = rows?.[0];
    return r ? String(r.order_code) : null;
  }

  async findPaymentIdByTxnRef(txnRef: string): Promise<string | null> {
    const [rows]: any = await pool.query(
      `SELECT payment_id FROM payments WHERE txn_ref = ? LIMIT 1`,
      [txnRef]
    );
    const r = rows?.[0];
    return r ? String(r.payment_id) : null;
  }
}
