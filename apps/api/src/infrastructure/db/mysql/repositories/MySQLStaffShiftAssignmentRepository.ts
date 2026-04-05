import type {
  IStaffShiftAssignmentRepository,
  StaffShiftAssignmentActorRef,
  StaffShiftAssignmentView,
} from "../../../../application/ports/repositories/IStaffShiftAssignmentRepository.js";
import { getShiftTemplate, type ShiftCode } from "../../../../domain/shifts/templates.js";
import { pool } from "../connection.js";

function toIso(value: unknown): string {
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function toDateOnly(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeStaffIds(staffIds: string[]): string[] {
  return Array.from(
    new Set(
      (staffIds ?? [])
        .map((staffId) => String(staffId ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function mapRow(row: any): StaffShiftAssignmentView {
  return {
    assignmentId: String(row.assignment_id),
    branchId: String(row.branch_id),
    staffId: String(row.staff_id),
    businessDate: toDateOnly(row.business_date),
    shiftCode: String(row.shift_code ?? "").toUpperCase() as ShiftCode,
    shiftName: String(row.shift_name ?? ""),
    assignedByActorType: row.assigned_by_actor_type
      ? (String(row.assigned_by_actor_type).toUpperCase() as "ADMIN" | "STAFF")
      : null,
    assignedById: row.assigned_by_id != null ? String(row.assigned_by_id) : null,
    assignedByName: row.assigned_by_name != null ? String(row.assigned_by_name) : null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

async function fetchAssignments(
  db: { query: typeof pool.query },
  input: { branchId: string; businessDate: string; shiftCode?: ShiftCode },
): Promise<StaffShiftAssignmentView[]> {
  const params: unknown[] = [input.branchId, input.businessDate];
  const where = ["branch_id = ?", "business_date = ?"];
  if (input.shiftCode) {
    where.push("shift_code = ?");
    params.push(input.shiftCode);
  }

  const [rows]: any = await db.query(
    `SELECT assignment_id, branch_id, staff_id, business_date, shift_code, shift_name,
            assigned_by_actor_type, assigned_by_id, assigned_by_name, created_at, updated_at
     FROM staff_shift_assignments
     WHERE ${where.join(" AND ")}
     ORDER BY shift_code ASC, created_at ASC, assignment_id ASC`,
    params,
  );

  return ((rows as any[]) ?? []).map(mapRow);
}

async function upsertAssignmentRows(
  db: { query: typeof pool.query },
  input: {
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    staffIds: string[];
    actor: StaffShiftAssignmentActorRef;
  },
) {
  const normalizedStaffIds = normalizeStaffIds(input.staffIds);
  if (!normalizedStaffIds.length) return;

  const template = getShiftTemplate(input.shiftCode);
  if (!template) throw new Error("SHIFT_TEMPLATE_INVALID");

  for (const staffId of normalizedStaffIds) {
    await db.query(
      `INSERT INTO staff_shift_assignments (
         branch_id,
         staff_id,
         business_date,
         shift_code,
         shift_name,
         assigned_by_actor_type,
         assigned_by_id,
         assigned_by_name
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         shift_name = VALUES(shift_name),
         assigned_by_actor_type = VALUES(assigned_by_actor_type),
         assigned_by_id = VALUES(assigned_by_id),
         assigned_by_name = VALUES(assigned_by_name),
         updated_at = CURRENT_TIMESTAMP`,
      [
        input.branchId,
        staffId,
        input.businessDate,
        input.shiftCode,
        template.name,
        input.actor.actorType,
        input.actor.actorId,
        input.actor.actorName,
      ],
    );
  }
}

export class MySQLStaffShiftAssignmentRepository implements IStaffShiftAssignmentRepository {
  async listForDate(input: { branchId: string; businessDate: string }): Promise<StaffShiftAssignmentView[]> {
    return fetchAssignments(pool, input);
  }

  async listForStaffDate(input: {
    branchId: string;
    staffId: string;
    businessDate: string;
  }): Promise<StaffShiftAssignmentView[]> {
    const [rows]: any = await pool.query(
      `SELECT assignment_id, branch_id, staff_id, business_date, shift_code, shift_name,
              assigned_by_actor_type, assigned_by_id, assigned_by_name, created_at, updated_at
       FROM staff_shift_assignments
       WHERE branch_id = ?
         AND staff_id = ?
         AND business_date = ?
       ORDER BY shift_code ASC, created_at ASC, assignment_id ASC`,
      [input.branchId, input.staffId, input.businessDate],
    );

    return ((rows as any[]) ?? []).map(mapRow);
  }

  async listForShift(input: {
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
  }): Promise<StaffShiftAssignmentView[]> {
    return fetchAssignments(pool, input);
  }

  async findForStaffShift(input: {
    branchId: string;
    staffId: string;
    businessDate: string;
    shiftCode: ShiftCode;
  }): Promise<StaffShiftAssignmentView | null> {
    const [rows]: any = await pool.query(
      `SELECT assignment_id, branch_id, staff_id, business_date, shift_code, shift_name,
              assigned_by_actor_type, assigned_by_id, assigned_by_name, created_at, updated_at
       FROM staff_shift_assignments
       WHERE branch_id = ?
         AND staff_id = ?
         AND business_date = ?
         AND shift_code = ?
       LIMIT 1`,
      [input.branchId, input.staffId, input.businessDate, input.shiftCode],
    );

    const row = rows?.[0];
    return row ? mapRow(row) : null;
  }

  async upsertAssignments(input: {
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    staffIds: string[];
    actor: StaffShiftAssignmentActorRef;
  }): Promise<StaffShiftAssignmentView[]> {
    const normalizedStaffIds = normalizeStaffIds(input.staffIds);
    if (!normalizedStaffIds.length) return [];

    await upsertAssignmentRows(pool, { ...input, staffIds: normalizedStaffIds });
    const rows = await this.listForShift(input);
    const allowedIds = new Set(normalizedStaffIds);
    return rows.filter((row) => allowedIds.has(row.staffId));
  }

  async replaceAssignmentsForShift(input: {
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    staffIds: string[];
    actor: StaffShiftAssignmentActorRef;
  }): Promise<StaffShiftAssignmentView[]> {
    const normalizedStaffIds = normalizeStaffIds(input.staffIds);
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      if (normalizedStaffIds.length) {
        const placeholders = normalizedStaffIds.map(() => "?").join(", ");
        await conn.query(
          `DELETE FROM staff_shift_assignments
           WHERE branch_id = ?
             AND business_date = ?
             AND shift_code = ?
             AND staff_id NOT IN (${placeholders})`,
          [input.branchId, input.businessDate, input.shiftCode, ...normalizedStaffIds],
        );
      } else {
        await conn.query(
          `DELETE FROM staff_shift_assignments
           WHERE branch_id = ?
             AND business_date = ?
             AND shift_code = ?`,
          [input.branchId, input.businessDate, input.shiftCode],
        );
      }

      await upsertAssignmentRows(conn, { ...input, staffIds: normalizedStaffIds });
      await conn.commit();

      return fetchAssignments(pool, input);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}
