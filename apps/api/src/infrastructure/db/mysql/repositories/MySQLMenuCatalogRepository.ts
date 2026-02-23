import type {
  IMenuCatalogRepository,
  MenuItemListQuery,
  MenuItemSort,
} from "../../../../application/ports/repositories/IMenuCatalogRepository.js";
import { MenuCategory } from "../../../../domain/entities/MenuCategory.js";
import { MenuItem } from "../../../../domain/entities/MenuItem.js";
import { MeatProfile, type MeatKind } from "../../../../domain/entities/MeatProfile.js";
import { ComboDetail, type ComboLine } from "../../../../domain/entities/ComboDetail.js";
import { pool } from "../connection.js";

function toBool(v: unknown): boolean {
  return Number(v) === 1;
}

function safeNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toMeatKind(v: unknown): MeatKind {
  const s = String(v ?? "OTHER").toUpperCase();
  if (s === "BEEF" || s === "PORK" || s === "LAMB" || s === "CHICKEN" || s === "SEAFOOD") return s;
  return "OTHER";
}

function buildSort(sort: MenuItemSort | null | undefined): string {
  if (sort === "price_asc") return "mi.price ASC, mi.item_name ASC";
  if (sort === "price_desc") return "mi.price DESC, mi.item_name ASC";
  if (sort === "newest") return "mi.created_at DESC, mi.item_id DESC";
  return "mi.item_name ASC";
}

export class MySQLMenuCatalogRepository implements IMenuCatalogRepository {
  async listCategories(activeOnly: boolean = true): Promise<MenuCategory[]> {
    const where = activeOnly ? "WHERE is_active = 1" : "";
    const [rows]: any = await pool.query(
      `SELECT category_id, category_name, sort_order, is_active
       FROM menu_categories
       ${where}
       ORDER BY sort_order ASC, category_id ASC`
    );
    return (rows ?? []).map(
      (r: any) =>
        new MenuCategory(
          String(r.category_id),
          String(r.category_name),
          Number(r.sort_order ?? 0),
          toBool(r.is_active)
        )
    );
  }

  async listItems(query: MenuItemListQuery): Promise<{ items: MenuItem[]; total: number }> {
    const categoryId = query.categoryId ? String(query.categoryId) : null;
    const q = query.q ? String(query.q).trim() : null;
    const isActive = query.isActive ?? true;
    const branchId = query.branchId ? String(query.branchId) : null;
    const onlyInStock = query.onlyInStock === true;
    const limit = Math.min(Math.max(Number(query.limit ?? 50), 1), 200);
    const offset = Math.max(Number(query.offset ?? 0), 0);

    const filters: string[] = [];
    const params: any[] = [];

    if (categoryId) {
      filters.push("mi.category_id = ?");
      params.push(categoryId);
    }
    if (isActive !== null && isActive !== undefined) {
      filters.push("mi.is_active = ?");
      params.push(isActive ? 1 : 0);
    }
    if (q) {
      // Use FULLTEXT when available but keep LIKE fallback for stability.
      filters.push(
        "(MATCH(mi.item_name, mi.description) AGAINST (? IN BOOLEAN MODE) OR mi.item_name LIKE CONCAT('%', ?, '%'))"
      );
      const booleanQ = q
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => `${t}*`)
        .join(" ");
      params.push(booleanQ, q);
    }

    // Stock semantics:
    // - If branchId is provided: SoT = menu_item_stock (per-branch inventory)
    // - Else: fallback to legacy menu_items.stock_qty for backward compatibility
    const joinParams: any[] = [];
    const joinStockSql = branchId
      ? "LEFT JOIN menu_item_stock mis ON mis.branch_id = ? AND mis.item_id = mi.item_id"
      : "";
    if (branchId) joinParams.push(branchId);

    if (onlyInStock) {
      if (branchId) filters.push("COALESCE(mis.quantity, 0) > 0");
      else filters.push("mi.stock_qty > 0");
    }

    const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const orderSql = buildSort(query.sort);

    const [countRows]: any = await pool.query(
      `SELECT COUNT(*) AS total
       FROM menu_items mi
       ${joinStockSql}
       ${whereSql}`,
      [...joinParams, ...params]
    );
    const total = Number(countRows?.[0]?.total ?? 0);

    const [rows]: any = await pool.query(
      `SELECT
        mi.item_id,
        mi.category_id,
        c.category_name,
        mi.item_name,
        mi.description,
        mi.price,
        mi.image_url,
        mi.is_active,
        ${branchId ? "COALESCE(mis.quantity, 0)" : "mi.stock_qty"} AS stock_qty,
        (cs.combo_id IS NOT NULL) AS is_combo,
        (mp.item_id IS NOT NULL) AS is_meat
       FROM menu_items mi
       JOIN menu_categories c ON c.category_id = mi.category_id
       ${joinStockSql}
       LEFT JOIN combo_sets cs ON cs.combo_item_id = mi.item_id
       LEFT JOIN meat_profiles mp ON mp.item_id = mi.item_id
       ${whereSql}
       ORDER BY ${orderSql}
       LIMIT ? OFFSET ?`,
      [...joinParams, ...params, limit, offset]
    );

    const items: MenuItem[] = (rows ?? []).map(
      (r: any) =>
        new MenuItem(
          String(r.item_id),
          String(r.category_id),
          String(r.item_name),
          safeNumber(r.price),
          r.description === null ? null : String(r.description ?? ""),
          r.image_url === null ? null : String(r.image_url ?? ""),
          toBool(r.is_active),
          r.stock_qty === null || r.stock_qty === undefined ? null : Number(r.stock_qty),
          String(r.category_name),
          toBool(r.is_combo),
          toBool(r.is_meat)
        )
    );

    return { items, total };
  }

  async getItemById(itemId: string): Promise<MenuItem | null> {
    const [rows]: any = await pool.query(
      `SELECT
        mi.item_id,
        mi.category_id,
        c.category_name,
        mi.item_name,
        mi.description,
        mi.price,
        mi.image_url,
        mi.is_active,
        mi.stock_qty,
        (cs.combo_id IS NOT NULL) AS is_combo,
        (mp.item_id IS NOT NULL) AS is_meat
       FROM menu_items mi
       JOIN menu_categories c ON c.category_id = mi.category_id
       LEFT JOIN combo_sets cs ON cs.combo_item_id = mi.item_id
       LEFT JOIN meat_profiles mp ON mp.item_id = mi.item_id
       WHERE mi.item_id = ?
       LIMIT 1`,
      [itemId]
    );
    const r = rows?.[0];
    if (!r) return null;
    return new MenuItem(
      String(r.item_id),
      String(r.category_id),
      String(r.item_name),
      safeNumber(r.price),
      r.description === null ? null : String(r.description ?? ""),
      r.image_url === null ? null : String(r.image_url ?? ""),
      toBool(r.is_active),
      r.stock_qty === null || r.stock_qty === undefined ? null : Number(r.stock_qty),
      String(r.category_name),
      toBool(r.is_combo),
      toBool(r.is_meat)
    );
  }

  async getMeatProfile(itemId: string): Promise<MeatProfile | null> {
    const [rows]: any = await pool.query(
      `SELECT item_id, meat_kind, cut, origin, portion_grams, marbling_level
       FROM meat_profiles
       WHERE item_id = ?
       LIMIT 1`,
      [itemId]
    );
    const r = rows?.[0];
    if (!r) return null;
    return new MeatProfile(
      String(r.item_id),
      toMeatKind(r.meat_kind),
      String(r.cut),
      r.origin === null ? null : String(r.origin),
      r.portion_grams === null || r.portion_grams === undefined ? null : Number(r.portion_grams),
      r.marbling_level === null || r.marbling_level === undefined ? null : Number(r.marbling_level)
    );
  }

  async getComboDetailByItemId(itemId: string): Promise<ComboDetail | null> {
    const [comboRows]: any = await pool.query(
      `SELECT combo_id, combo_item_id, serve_for, allow_customization
       FROM combo_sets
       WHERE combo_item_id = ?
       LIMIT 1`,
      [itemId]
    );
    const c = comboRows?.[0];
    if (!c) return null;

    const [lineRows]: any = await pool.query(
      `SELECT
        csi.item_id,
        mi.item_name,
        mi.price,
        csi.quantity,
        csi.group_name,
        csi.is_required,
        csi.sort_order
       FROM combo_set_items csi
       JOIN menu_items mi ON mi.item_id = csi.item_id
       WHERE csi.combo_id = ?
       ORDER BY csi.sort_order ASC, mi.item_name ASC`,
      [String(c.combo_id)]
    );
    const lines: ComboLine[] = (lineRows ?? []).map((r: any) => ({
      itemId: String(r.item_id),
      itemName: String(r.item_name),
      price: safeNumber(r.price),
      quantity: Number(r.quantity ?? 1),
      groupName: r.group_name === null ? null : String(r.group_name),
      isRequired: toBool(r.is_required),
      sortOrder: Number(r.sort_order ?? 0),
    }));

    return new ComboDetail(
      String(c.combo_id),
      String(c.combo_item_id),
      Number(c.serve_for ?? 1),
      toBool(c.allow_customization),
      lines
    );
  }
}
