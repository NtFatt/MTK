-- P1: Make cart item variant real (options_hash uniqueness)
-- Goal: drop legacy uq_cart_item(cart_id,item_id) and rely on uq_cart_item_variant(cart_id,item_id,options_hash)
-- Idempotent + safe re-run.

-- 1) Ensure options_hash column exists (older DBs)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'cart_items'
    AND column_name = 'options_hash'
);
SET @sql := IF(
  @col_exists = 0,
  "ALTER TABLE cart_items ADD COLUMN options_hash CHAR(64) NOT NULL DEFAULT '' AFTER item_options",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Drop legacy unique uq_cart_item(cart_id,item_id) if present
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'cart_items'
    AND index_name = 'uq_cart_item'
);
SET @sql := IF(
  @idx_exists > 0,
  'ALTER TABLE cart_items DROP INDEX uq_cart_item',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Ensure uq_cart_item_variant(cart_id,item_id,options_hash) exists
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'cart_items'
    AND index_name = 'uq_cart_item_variant'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE cart_items ADD UNIQUE KEY uq_cart_item_variant (cart_id, item_id, options_hash)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Add helper non-unique index (cart_id,item_id) for fast lookup
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'cart_items'
    AND index_name = 'idx_ci_cart_item'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE cart_items ADD KEY idx_ci_cart_item (cart_id, item_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
