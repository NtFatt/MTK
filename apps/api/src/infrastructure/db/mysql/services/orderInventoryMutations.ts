import type { PoolConnection } from "mysql2/promise";

type ExistingConsumptionRow = {
  id: string;
  orderItemId: string;
  menuItemId: string;
  ingredientId: string;
  qtyConsumed: number;
  triggerStatus: string;
};

type OrderItemRow = {
  orderItemId: string;
  menuItemId: string;
  quantity: number;
};

type RecipeRow = {
  menuItemId: string;
  ingredientId: string;
  qtyPerItem: number;
};

type ConsumptionInsertRow = {
  orderItemId: string;
  menuItemId: string;
  ingredientId: string;
  qtyConsumed: number;
};

export type InventoryLineSummary = {
  ingredientId: string;
  qtyConsumed: number;
};

export type OrderInventoryMutationResult = {
  inventoryChanged: boolean;
  alreadyApplied: boolean;
  triggerStatus: string;
  ingredientTotals: InventoryLineSummary[];
  affectedMenuItemIds: string[];
};

type RestockOrderInventoryInput = {
  orderId: string;
  branchId: string;
  actorType: string;
  actorId: string | null;
  reason: string | null;
};

function toQty(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function uniqueStrings(values: unknown[]): string[] {
  const out = new Set<string>();

  for (const value of values) {
    const next = String(value ?? "").trim();
    if (next) out.add(next);
  }

  return Array.from(out);
}

function summarizeConsumptions(
  rows: Array<{ ingredientId: string; qtyConsumed: number }>,
): InventoryLineSummary[] {
  const byIngredient = new Map<string, number>();

  for (const row of rows) {
    byIngredient.set(
      row.ingredientId,
      (byIngredient.get(row.ingredientId) ?? 0) + row.qtyConsumed,
    );
  }

  return Array.from(byIngredient.entries())
    .map(([ingredientId, qtyConsumed]) => ({
      ingredientId,
      qtyConsumed,
    }))
    .sort((a, b) => a.ingredientId.localeCompare(b.ingredientId));
}

async function loadExistingConsumptions(
  conn: PoolConnection,
  input: {
    orderId: string;
    orderItemIds?: string[] | null;
    triggerStatus?: string | null;
  },
): Promise<ExistingConsumptionRow[]> {
  const where: string[] = ["order_id = ?"];
  const params: Array<string> = [input.orderId];

  const orderItemIds = uniqueStrings(input.orderItemIds ?? []);
  if (orderItemIds.length > 0) {
    where.push(`order_item_id IN (${orderItemIds.map(() => "?").join(",")})`);
    params.push(...orderItemIds);
  }

  if (input.triggerStatus) {
    where.push("trigger_status = ?");
    params.push(String(input.triggerStatus));
  }

  const [rows]: any = await conn.query(
    `
      SELECT id, order_item_id, menu_item_id, ingredient_id, qty_consumed, trigger_status
      FROM inventory_consumptions
      WHERE ${where.join(" AND ")}
      FOR UPDATE
    `,
    params,
  );

  return (rows ?? []).map((row: any) => ({
    id: String(row.id),
    orderItemId: String(row.order_item_id),
    menuItemId: String(row.menu_item_id),
    ingredientId: String(row.ingredient_id),
    qtyConsumed: toQty(row.qty_consumed),
    triggerStatus: String(row.trigger_status ?? ""),
  }));
}

async function loadOrderItems(
  conn: PoolConnection,
  orderId: string,
  orderItemIds?: string[] | null,
): Promise<OrderItemRow[]> {
  const ids = uniqueStrings(orderItemIds ?? []);
  const where: string[] = ["order_id = ?"];
  const params: Array<string> = [orderId];

  if (ids.length > 0) {
    where.push(`order_item_id IN (${ids.map(() => "?").join(",")})`);
    params.push(...ids);
  }

  const [rows]: any = await conn.query(
    `
      SELECT order_item_id, item_id AS menu_item_id, quantity
      FROM order_items
      WHERE ${where.join(" AND ")}
      FOR UPDATE
    `,
    params,
  );

  return (rows ?? []).map((row: any) => ({
    orderItemId: String(row.order_item_id),
    menuItemId: String(row.menu_item_id),
    quantity: toQty(row.quantity),
  }));
}

async function loadRecipes(
  conn: PoolConnection,
  menuItemIds: string[],
): Promise<RecipeRow[]> {
  if (menuItemIds.length === 0) return [];

  const placeholders = menuItemIds.map(() => "?").join(",");
  const [rows]: any = await conn.query(
    `
      SELECT menu_item_id, ingredient_id, qty_per_item
      FROM menu_item_recipes
      WHERE menu_item_id IN (${placeholders})
    `,
    menuItemIds,
  );

  return (rows ?? []).map((row: any) => ({
    menuItemId: String(row.menu_item_id),
    ingredientId: String(row.ingredient_id),
    qtyPerItem: toQty(row.qty_per_item),
  }));
}

function buildConsumptionPlan(
  orderItems: OrderItemRow[],
  recipeRows: RecipeRow[],
): {
  ingredientTotals: InventoryLineSummary[];
  insertRows: ConsumptionInsertRow[];
  ingredientIds: string[];
} {
  const totals = new Map<string, number>();
  const insertRows: ConsumptionInsertRow[] = [];

  for (const item of orderItems) {
    const recipesForItem = recipeRows.filter((row) => row.menuItemId === item.menuItemId);

    for (const recipe of recipesForItem) {
      const qtyConsumed = item.quantity * recipe.qtyPerItem;
      if (!(qtyConsumed > 0)) continue;

      totals.set(
        recipe.ingredientId,
        (totals.get(recipe.ingredientId) ?? 0) + qtyConsumed,
      );

      insertRows.push({
        orderItemId: item.orderItemId,
        menuItemId: item.menuItemId,
        ingredientId: recipe.ingredientId,
        qtyConsumed,
      });
    }
  }

  const ingredientTotals = Array.from(totals.entries())
    .map(([ingredientId, qtyConsumed]) => ({ ingredientId, qtyConsumed }))
    .sort((a, b) => a.ingredientId.localeCompare(b.ingredientId));

  return {
    ingredientTotals,
    insertRows,
    ingredientIds: ingredientTotals.map((row) => row.ingredientId),
  };
}

async function assertInventoryEnoughAndLock(
  conn: PoolConnection,
  branchId: string,
  ingredientTotals: InventoryLineSummary[],
): Promise<void> {
  if (ingredientTotals.length === 0) throw new Error("RECIPE_NOT_CONFIGURED");

  const ingredientIds = ingredientTotals.map((row) => row.ingredientId);
  const placeholders = ingredientIds.map(() => "?").join(",");

  const [rows]: any = await conn.query(
    `
      SELECT id, current_qty
      FROM inventory_items
      WHERE branch_id = ?
        AND id IN (${placeholders})
      FOR UPDATE
    `,
    [branchId, ...ingredientIds],
  );

  const inventoryById = new Map<string, any>(
    (rows ?? []).map((row: any) => [String(row.id), row]),
  );

  for (const row of ingredientTotals) {
    const current = inventoryById.get(row.ingredientId);
    if (!current) throw new Error("RECIPE_INGREDIENT_NOT_FOUND");

    if (toQty(current.current_qty) < row.qtyConsumed) {
      throw new Error("INSUFFICIENT_INGREDIENT");
    }
  }
}

async function findAffectedMenuItemIds(
  conn: PoolConnection,
  branchId: string,
  ingredientIds: string[],
): Promise<string[]> {
  if (ingredientIds.length === 0) return [];

  const placeholders = ingredientIds.map(() => "?").join(",");
  const [rows]: any = await conn.query(
    `
      SELECT DISTINCT r.menu_item_id
      FROM menu_item_recipes r
      JOIN inventory_items i
        ON i.id = r.ingredient_id
       AND i.branch_id = ?
      WHERE r.ingredient_id IN (${placeholders})
      ORDER BY r.menu_item_id ASC
    `,
    [branchId, ...ingredientIds],
  );

  return uniqueStrings((rows ?? []).map((row: any) => row.menu_item_id));
}

async function recomputeMenuItemStocks(
  conn: PoolConnection,
  branchId: string,
  menuItemIds: string[],
): Promise<void> {
  for (const menuItemId of uniqueStrings(menuItemIds)) {
    const [rows]: any = await conn.query(
      `
        SELECT COALESCE(MIN(FLOOR(i.current_qty / r.qty_per_item)), 0) AS sellable_qty
        FROM menu_item_recipes r
        JOIN inventory_items i
          ON i.id = r.ingredient_id
         AND i.branch_id = ?
        WHERE r.menu_item_id = ?
      `,
      [branchId, menuItemId],
    );

    const sellableQty = Math.max(0, toQty(rows?.[0]?.sellable_qty));

    await conn.query(
      `
        INSERT INTO menu_item_stock (branch_id, item_id, quantity, last_restock_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          quantity = VALUES(quantity),
          updated_at = VALUES(updated_at)
      `,
      [branchId, menuItemId, sellableQty],
    );

    await conn.query(
      `
        UPDATE menu_items
        SET stock_qty = ?, updated_at = NOW()
        WHERE item_id = ?
      `,
      [sellableQty, menuItemId],
    );
  }
}

export async function consumeOrderInventory(
  conn: PoolConnection,
  input: {
    orderId: string;
    branchId: string;
    triggerStatus: string;
    orderItemIds?: string[] | null;
  },
): Promise<OrderInventoryMutationResult> {
  const requestedOrderItemIds = uniqueStrings(input.orderItemIds ?? []);
  const existingRows = await loadExistingConsumptions(conn, {
    orderId: input.orderId,
    orderItemIds: requestedOrderItemIds,
    triggerStatus: input.triggerStatus,
  });

  if (requestedOrderItemIds.length === 0 && existingRows.length > 0) {
    return {
      inventoryChanged: false,
      alreadyApplied: true,
      triggerStatus: existingRows[0]?.triggerStatus ?? input.triggerStatus,
      ingredientTotals: summarizeConsumptions(existingRows),
      affectedMenuItemIds: uniqueStrings(existingRows.map((row) => row.menuItemId)),
    };
  }

  const consumedOrderItemIds = new Set(existingRows.map((row) => row.orderItemId));
  const remainingRequestedOrderItemIds =
    requestedOrderItemIds.length > 0
      ? requestedOrderItemIds.filter((orderItemId) => !consumedOrderItemIds.has(orderItemId))
      : [];

  if (requestedOrderItemIds.length > 0 && remainingRequestedOrderItemIds.length === 0) {
    return {
      inventoryChanged: false,
      alreadyApplied: true,
      triggerStatus: existingRows[0]?.triggerStatus ?? input.triggerStatus,
      ingredientTotals: summarizeConsumptions(existingRows),
      affectedMenuItemIds: uniqueStrings(existingRows.map((row) => row.menuItemId)),
    };
  }

  const orderItems = await loadOrderItems(
    conn,
    input.orderId,
    requestedOrderItemIds.length > 0 ? remainingRequestedOrderItemIds : undefined,
  );
  if (orderItems.length === 0) throw new Error("ORDER_ITEMS_EMPTY");

  const menuItemIds = uniqueStrings(orderItems.map((row) => row.menuItemId));
  const recipeRows = await loadRecipes(conn, menuItemIds);

  for (const menuItemId of menuItemIds) {
    const hasRecipe = recipeRows.some((row) => row.menuItemId === menuItemId);
    if (!hasRecipe) throw new Error("RECIPE_NOT_CONFIGURED");
  }

  const plan = buildConsumptionPlan(orderItems, recipeRows);
  await assertInventoryEnoughAndLock(conn, input.branchId, plan.ingredientTotals);

  for (const row of plan.insertRows) {
    await conn.query(
      `
        INSERT INTO inventory_consumptions
        (branch_id, order_id, order_item_id, menu_item_id, ingredient_id, qty_consumed, trigger_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.branchId,
        input.orderId,
        row.orderItemId,
        row.menuItemId,
        row.ingredientId,
        row.qtyConsumed,
        input.triggerStatus,
      ],
    );
  }

  for (const row of plan.ingredientTotals) {
    await conn.query(
      `
        UPDATE inventory_items
        SET current_qty = current_qty - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND branch_id = ?
      `,
      [row.qtyConsumed, row.ingredientId, input.branchId],
    );
  }

  const affectedMenuItemIds = await findAffectedMenuItemIds(
    conn,
    input.branchId,
    plan.ingredientIds,
  );

  await recomputeMenuItemStocks(conn, input.branchId, affectedMenuItemIds);

  return {
    inventoryChanged: true,
    alreadyApplied: false,
    triggerStatus: input.triggerStatus,
    ingredientTotals: plan.ingredientTotals,
    affectedMenuItemIds,
  };
}

export async function restockCanceledOrderInventory(
  conn: PoolConnection,
  input: RestockOrderInventoryInput,
): Promise<OrderInventoryMutationResult> {
  const [rows]: any = await conn.query(
    `
      SELECT id, order_item_id, menu_item_id, ingredient_id, qty_consumed
      FROM inventory_consumptions
      WHERE order_id = ?
        AND branch_id = ?
        AND trigger_status = 'ORDER_CREATED'
      FOR UPDATE
    `,
    [input.orderId, input.branchId],
  );

  const activeRows: ExistingConsumptionRow[] = (rows ?? []).map((row: any) => ({
    id: String(row.id),
    orderItemId: String(row.order_item_id),
    menuItemId: String(row.menu_item_id),
    ingredientId: String(row.ingredient_id),
    qtyConsumed: toQty(row.qty_consumed),
    triggerStatus: "ORDER_CREATED",
  }));

  if (activeRows.length === 0) {
    return {
      inventoryChanged: false,
      alreadyApplied: false,
      triggerStatus: "ORDER_CREATED_RESTOCKED",
      ingredientTotals: [],
      affectedMenuItemIds: [],
    };
  }

  const ingredientTotals = summarizeConsumptions(activeRows);
  const ingredientIds = ingredientTotals.map((row) => row.ingredientId);
  const placeholders = ingredientIds.map(() => "?").join(",");

  await conn.query(
    `
      SELECT id
      FROM inventory_items
      WHERE branch_id = ?
        AND id IN (${placeholders})
      FOR UPDATE
    `,
    [input.branchId, ...ingredientIds],
  );

  for (const row of ingredientTotals) {
    await conn.query(
      `
        UPDATE inventory_items
        SET current_qty = current_qty + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND branch_id = ?
      `,
      [row.qtyConsumed, row.ingredientId, input.branchId],
    );

    await conn.query(
      `
        INSERT INTO ingredient_inventory_adjustments
        (branch_id, ingredient_id, adjustment_type, quantity_delta, reason, actor_type, actor_id)
        VALUES (?, ?, 'IN', ?, ?, ?, ?)
      `,
      [
        input.branchId,
        row.ingredientId,
        row.qtyConsumed,
        input.reason,
        input.actorType,
        input.actorId,
      ],
    );
  }

  const consumptionIds = activeRows.map((row) => row.id);
  const consumptionPlaceholders = consumptionIds.map(() => "?").join(",");
  await conn.query(
    `
      UPDATE inventory_consumptions
      SET trigger_status = 'ORDER_CREATED_RESTOCKED'
      WHERE id IN (${consumptionPlaceholders})
    `,
    consumptionIds,
  );

  const affectedMenuItemIds = await findAffectedMenuItemIds(conn, input.branchId, ingredientIds);
  await recomputeMenuItemStocks(conn, input.branchId, affectedMenuItemIds);

  return {
    inventoryChanged: true,
    alreadyApplied: false,
    triggerStatus: "ORDER_CREATED_RESTOCKED",
    ingredientTotals,
    affectedMenuItemIds,
  };
}
