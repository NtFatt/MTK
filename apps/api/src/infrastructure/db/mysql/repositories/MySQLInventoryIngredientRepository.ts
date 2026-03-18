import type {
  IInventoryIngredientRepository,
  InventoryIngredientRow,
  InventoryAlertRow,
  CreateInventoryIngredientInput,
  UpdateInventoryIngredientInput,
  AdjustInventoryIngredientInput,
} from "../../../../application/ports/repositories/IInventoryIngredientRepository.js";
import { pool } from "../connection.js";

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapRow(r: any): InventoryIngredientRow {
  return {
    id: String(r.id),
    branchId: String(r.branch_id),
    ingredientCode: String(r.ingredient_code),
    ingredientName: String(r.ingredient_name),
    unit: String(r.unit),
    currentQty: toNum(r.current_qty),
    warningThreshold: toNum(r.warning_threshold),
    criticalThreshold: toNum(r.critical_threshold),
    isActive: Boolean(r.is_active),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export class MySQLInventoryIngredientRepository implements IInventoryIngredientRepository {
  async listByBranch(branchId: string): Promise<InventoryIngredientRow[]> {
    const [rows]: any = await pool.query(
      `SELECT *
       FROM inventory_items
       WHERE branch_id = ?
       ORDER BY ingredient_name ASC, id ASC`,
      [branchId],
    );

    return (rows ?? []).map(mapRow);
  }

  async create(input: CreateInventoryIngredientInput): Promise<InventoryIngredientRow> {
    const [r]: any = await pool.query(
      `INSERT INTO inventory_items
       (branch_id, ingredient_code, ingredient_name, unit, current_qty, warning_threshold, critical_threshold, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.branchId,
        input.ingredientCode,
        input.ingredientName,
        input.unit,
        input.currentQty,
        input.warningThreshold,
        input.criticalThreshold,
        input.isActive ? 1 : 0,
      ],
    );

    const id = String(r.insertId);
    const [rows]: any = await pool.query(`SELECT * FROM inventory_items WHERE id = ?`, [id]);
    return mapRow(rows[0]);
  }

  async update(input: UpdateInventoryIngredientInput): Promise<InventoryIngredientRow> {
    await pool.query(
      `UPDATE inventory_items
       SET ingredient_name = COALESCE(?, ingredient_name),
           unit = COALESCE(?, unit),
           warning_threshold = COALESCE(?, warning_threshold),
           critical_threshold = COALESCE(?, critical_threshold),
           is_active = COALESCE(?, is_active)
       WHERE id = ? AND branch_id = ?`,
      [
        input.ingredientName ?? null,
        input.unit ?? null,
        input.warningThreshold ?? null,
        input.criticalThreshold ?? null,
        input.isActive == null ? null : input.isActive ? 1 : 0,
        input.ingredientId,
        input.branchId,
      ],
    );

    const [rows]: any = await pool.query(
      `SELECT * FROM inventory_items WHERE id = ? AND branch_id = ?`,
      [input.ingredientId, input.branchId],
    );

    if (!rows?.[0]) throw new Error("INGREDIENT_NOT_FOUND");
    return mapRow(rows[0]);
  }

  async adjust(input: AdjustInventoryIngredientInput) {
    const conn: any = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [rows]: any = await conn.query(
        `SELECT * FROM inventory_items WHERE id = ? AND branch_id = ? FOR UPDATE`,
        [input.ingredientId, input.branchId],
      );

      const cur = rows?.[0];
      if (!cur) throw new Error("INGREDIENT_NOT_FOUND");

      const prevQty = toNum(cur.current_qty);
      const quantity = toNum(input.quantity);
      let newQty = prevQty;

      if (input.adjustmentType === "IN") newQty = prevQty + quantity;
      else if (input.adjustmentType === "OUT") {
        if (quantity > prevQty) throw new Error("INSUFFICIENT_INGREDIENT");
        newQty = prevQty - quantity;
      } else if (input.adjustmentType === "SET") newQty = quantity;
      else if (input.adjustmentType === "CORRECTION") newQty = prevQty + quantity;
      else throw new Error("INVALID_ADJUSTMENT_TYPE");

      await conn.query(
        `UPDATE inventory_items
         SET current_qty = ?
         WHERE id = ? AND branch_id = ?`,
        [newQty, input.ingredientId, input.branchId],
      );

      await conn.query(
        `INSERT INTO ingredient_inventory_adjustments
         (branch_id, ingredient_id, adjustment_type, quantity_delta, reason, actor_type, actor_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.branchId,
          input.ingredientId,
          input.adjustmentType,
          input.adjustmentType === "SET" ? (newQty - prevQty) : quantity,
          input.reason,
          input.actorType,
          input.actorId,
        ],
      );

      await conn.commit();

      return {
        ingredientId: String(input.ingredientId),
        branchId: String(input.branchId),
        prevQty,
        newQty,
        adjustmentType: input.adjustmentType,
      };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  async listAlerts(branchId: string): Promise<InventoryAlertRow[]> {
    const [rows]: any = await pool.query(
      `SELECT *
       FROM inventory_items
       WHERE branch_id = ?
         AND current_qty <= warning_threshold
       ORDER BY current_qty ASC, ingredient_name ASC`,
      [branchId],
    );

    return (rows ?? []).map((r: any) => {
      const base = mapRow(r);
      return {
        ...base,
        alertLevel: base.currentQty <= base.criticalThreshold ? "CRITICAL" : "WARNING",
      };
    });
  }
}