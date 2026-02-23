-- 009_p1_seed_menu_item_stock.sql
-- Purpose: Seed baseline menu_item_stock rows (branch x active item)
-- Rationale: stock_holds has FK to menu_item_stock; Phase-1 Redis holds needs stable SoT.
-- Idempotent: only inserts missing rows.

SET @has_stock := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menu_item_stock'
);

SET @has_branches := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches'
);

SET @has_items := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menu_items'
);

SET @sql := IF(
  @has_stock = 0 OR @has_branches = 0 OR @has_items = 0,
  'SELECT 1',
  'INSERT IGNORE INTO menu_item_stock (branch_id, item_id, quantity, last_restock_at)
   SELECT b.branch_id,
          i.item_id,
          COALESCE(i.stock_qty, 0) AS quantity,
          CASE WHEN COALESCE(i.stock_qty, 0) > 0 THEN NOW() ELSE NULL END AS last_restock_at
   FROM branches b
   CROSS JOIN menu_items i
   WHERE b.is_active = 1 AND i.is_active = 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
