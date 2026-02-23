-- P1: Align stock tables to canonical schema (focus: menu_item_stock + stock_holds)
-- This is a safety net for DBs created by older migrations where:
--   - menu_item_stock had (branch_id, stock_date, item_id, qty_total, qty_sold, ...)
--   - stock_holds had (branch_id, stock_date, cart_id, item_id, options_hash, ...)
-- Canonical (scripts/full_schema.sql) expects:
--   - menu_item_stock(branch_id, item_id, quantity, last_restock_at, updated_at)
--   - stock_holds(hold_id, branch_id, item_id, session_id, quantity, expires_at, created_at)
--
-- Idempotent + safe re-run.

-- 1) Detect legacy stock_holds schema (cart_id/stock_date/options_hash columns)
SET @legacy_holds := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'stock_holds'
    AND column_name IN ('cart_id', 'stock_date', 'options_hash')
);

-- Drop legacy stock_holds (holds are ephemeral; Redis is the real store in Phase 1)
SET @sql := IF(
  @legacy_holds > 0,
  'DROP TABLE IF EXISTS stock_holds',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Detect legacy menu_item_stock schema (stock_date column)
SET @has_stock_date := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'menu_item_stock'
    AND column_name = 'stock_date'
);

-- If legacy, rebuild menu_item_stock to canonical and migrate best-effort quantities.
-- Strategy:
--   quantity = max(stock_date) record's (qty_total - qty_sold) clamped >= 0 (NULL => 0)
--   last_restock_at = that record's updated_at

-- Drop temp daily table if leftover
SET @daily_exists := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'menu_item_stock_daily'
);
SET @sql := IF(
  @has_stock_date > 0 AND @daily_exists > 0,
  'DROP TABLE menu_item_stock_daily',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Rename legacy table away
SET @sql := IF(
  @has_stock_date > 0,
  'RENAME TABLE menu_item_stock TO menu_item_stock_daily',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Recreate canonical menu_item_stock
SET @sql := IF(
  @has_stock_date > 0,
  'CREATE TABLE menu_item_stock (\
     branch_id BIGINT UNSIGNED NOT NULL,\
     item_id BIGINT UNSIGNED NOT NULL,\
     quantity INT NOT NULL DEFAULT 0,\
     last_restock_at TIMESTAMP NULL DEFAULT NULL,\
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\
     PRIMARY KEY (branch_id, item_id),\
     KEY idx_stock_item (item_id),\
     CONSTRAINT fk_stock_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,\
     CONSTRAINT fk_stock_item FOREIGN KEY (item_id) REFERENCES menu_items(item_id) ON DELETE CASCADE\
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Migrate data best-effort
SET @sql := IF(
  @has_stock_date > 0,
  'INSERT INTO menu_item_stock(branch_id, item_id, quantity, last_restock_at)\
   SELECT x.branch_id, x.item_id, x.quantity, x.last_restock_at\
   FROM (\
     SELECT\
       s.branch_id,\
       s.item_id,\
       CASE\
         WHEN s.qty_total IS NULL THEN 0\
         ELSE GREATEST(s.qty_total - s.qty_sold, 0)\
       END AS quantity,\
       s.updated_at AS last_restock_at,\
       ROW_NUMBER() OVER (PARTITION BY s.branch_id, s.item_id ORDER BY s.stock_date DESC, s.updated_at DESC) AS rn\
     FROM menu_item_stock_daily s\
   ) x\
   WHERE x.rn = 1',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop legacy daily table to keep DB clean (canonical has no extra tables)
SET @sql := IF(
  @has_stock_date > 0,
  'DROP TABLE menu_item_stock_daily',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Recreate canonical stock_holds if we dropped legacy
SET @sql := IF(
  @legacy_holds > 0,
  'CREATE TABLE stock_holds (\
     hold_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\
     branch_id BIGINT UNSIGNED NOT NULL,\
     item_id BIGINT UNSIGNED NOT NULL,\
     session_id BIGINT UNSIGNED NOT NULL,\
     quantity INT NOT NULL,\
     expires_at TIMESTAMP NOT NULL,\
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
     PRIMARY KEY (hold_id),\
     KEY idx_hold_expires (expires_at),\
     KEY idx_hold_session (session_id),\
     KEY fk_hold_stock (branch_id, item_id),\
     CONSTRAINT fk_hold_stock FOREIGN KEY (branch_id, item_id) REFERENCES menu_item_stock(branch_id, item_id)\
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
