-- P2: Multi-branch + Menu Admin foundations + Pricing/Availability/Search engines
-- NOTE: This migration is designed to be idempotent (safe re-run).

-- ========== 1) Branches ==========
CREATE TABLE IF NOT EXISTS `branches` (
  `branch_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_code` varchar(30) NOT NULL,
  `branch_name` varchar(120) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `timezone` varchar(60) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  `phone` varchar(30) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`branch_id`),
  UNIQUE KEY `uq_branch_code` (`branch_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Ensure branch 1 exists (upgrade old DBs safely)
INSERT INTO branches(branch_id, branch_code, branch_name, address, timezone, phone, is_active)
VALUES (1,'HCM_Q1','Haidilao - Q1 (Demo)','Quận 1, TP.HCM','Asia/Ho_Chi_Minh','0280000000',1)
ON DUPLICATE KEY UPDATE
  branch_code=VALUES(branch_code),
  branch_name=VALUES(branch_name),
  address=VALUES(address),
  timezone=VALUES(timezone),
  phone=VALUES(phone),
  is_active=VALUES(is_active);

-- Add branch_id to restaurant_tables
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'restaurant_tables'
    AND column_name = 'branch_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE restaurant_tables ADD COLUMN branch_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER table_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Replace unique constraint on restaurant_tables: uq_table_code -> uq_branch_table_code(branch_id, table_code)
SET @idx1 := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'restaurant_tables'
    AND index_name = 'uq_table_code'
);
SET @sql := IF(@idx1 > 0, 'ALTER TABLE restaurant_tables DROP INDEX uq_table_code', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx2 := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'restaurant_tables'
    AND index_name = 'uq_branch_table_code'
);
SET @sql := IF(@idx2 = 0, 'ALTER TABLE restaurant_tables ADD UNIQUE KEY uq_branch_table_code (branch_id, table_code)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add FK restaurant_tables.branch_id -> branches
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'restaurant_tables'
    AND constraint_name = 'fk_table_branch'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE restaurant_tables ADD CONSTRAINT fk_table_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add branch_id to table_sessions
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'table_sessions'
    AND column_name = 'branch_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE table_sessions ADD COLUMN branch_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER session_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'table_sessions'
    AND index_name = 'idx_session_branch_status'
);
SET @sql := IF(@idx_exists = 0, 'ALTER TABLE table_sessions ADD KEY idx_session_branch_status (branch_id, status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'table_sessions'
    AND constraint_name = 'fk_session_branch'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE table_sessions ADD CONSTRAINT fk_session_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill session.branch_id from table.branch_id
UPDATE table_sessions s
JOIN restaurant_tables t ON t.table_id = s.table_id
SET s.branch_id = t.branch_id
WHERE (s.branch_id IS NULL OR s.branch_id = 1);

-- Add branch_id to table_reservations
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'table_reservations'
    AND column_name = 'branch_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE table_reservations ADD COLUMN branch_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER reservation_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'table_reservations'
    AND constraint_name = 'fk_resv_branch'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE table_reservations ADD CONSTRAINT fk_resv_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE table_reservations r
JOIN restaurant_tables t ON t.table_id = r.table_id
SET r.branch_id = t.branch_id
WHERE (r.branch_id IS NULL OR r.branch_id = 1);

-- Add branch_id to carts (nullable to keep delivery cart possible)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'carts'
    AND column_name = 'branch_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE carts ADD COLUMN branch_id BIGINT UNSIGNED DEFAULT NULL AFTER cart_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'carts'
    AND index_name = 'idx_cart_branch_status'
);
SET @sql := IF(@idx_exists = 0, 'ALTER TABLE carts ADD KEY idx_cart_branch_status (branch_id, cart_status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'carts'
    AND constraint_name = 'fk_cart_branch'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE carts ADD CONSTRAINT fk_cart_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill carts.branch_id from session
UPDATE carts c
JOIN table_sessions s ON s.session_id = c.session_id
SET c.branch_id = s.branch_id
WHERE c.branch_id IS NULL;

-- Add branch_id to orders (nullable for delivery)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND column_name = 'branch_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE orders ADD COLUMN branch_id BIGINT UNSIGNED DEFAULT NULL AFTER order_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND index_name = 'idx_orders_branch_created'
);
SET @sql := IF(@idx_exists = 0, 'ALTER TABLE orders ADD KEY idx_orders_branch_created (branch_id, created_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'orders'
    AND constraint_name = 'fk_order_branch'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE orders ADD CONSTRAINT fk_order_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE orders o
JOIN table_sessions s ON s.session_id = o.session_id
SET o.branch_id = s.branch_id
WHERE o.branch_id IS NULL;

-- ========== 2) Menu: add sort_order on menu_items ==========
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'menu_items'
    AND column_name = 'sort_order'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE menu_items ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER is_active',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========== 3) Combo pricing mode ==========
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'combo_sets'
    AND column_name = 'pricing_mode'
);
SET @sql := IF(
  @col_exists = 0,
  "ALTER TABLE combo_sets ADD COLUMN pricing_mode VARCHAR(30) NOT NULL DEFAULT 'SET_PRICE' AFTER allow_customization",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'combo_sets'
    AND column_name = 'discount_type'
);
SET @sql := IF(
  @col_exists = 0,
  "ALTER TABLE combo_sets ADD COLUMN discount_type VARCHAR(20) DEFAULT NULL AFTER pricing_mode",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'combo_sets'
    AND column_name = 'discount_value'
);
SET @sql := IF(
  @col_exists = 0,
  "ALTER TABLE combo_sets ADD COLUMN discount_value DECIMAL(12,2) DEFAULT NULL AFTER discount_type",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========== 4) Pricing: special_offer_rules ==========
CREATE TABLE IF NOT EXISTS `special_offer_rules` (
  `rule_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `offer_id` bigint unsigned NOT NULL,
  `target_type` varchar(20) NOT NULL,
  `target_id` bigint unsigned DEFAULT NULL,
  `discount_type` varchar(20) NOT NULL,
  `discount_value` decimal(12,2) NOT NULL,
  `time_from` time DEFAULT NULL,
  `time_to` time DEFAULT NULL,
  `days_mask` int NOT NULL DEFAULT 127,
  `min_qty` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_id`),
  KEY `idx_offer_rules_offer` (`offer_id`),
  KEY `idx_offer_rules_target` (`target_type`,`target_id`),
  CONSTRAINT `fk_offer_rules_offer` FOREIGN KEY (`offer_id`) REFERENCES `special_offers` (`offer_id`) ON DELETE CASCADE,
  CONSTRAINT `ck_offer_rule_target` CHECK ((`target_type` in ('ALL','CATEGORY','ITEM'))),
  CONSTRAINT `ck_offer_rule_discount` CHECK ((`discount_type` in ('PERCENT','AMOUNT','SET_PRICE'))),
  CONSTRAINT `ck_offer_rule_value` CHECK ((`discount_value` >= 0)),
  CONSTRAINT `ck_offer_rule_min_qty` CHECK (((`min_qty` is null) or (`min_qty` > 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ========== 5) Availability: per-branch, per-day stock + holds ==========
CREATE TABLE IF NOT EXISTS `menu_item_stock` (
  `branch_id` bigint unsigned NOT NULL,
  `stock_date` date NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `qty_total` int DEFAULT NULL,
  `qty_sold` int NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`branch_id`,`stock_date`,`item_id`),
  CONSTRAINT `fk_stock_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `ck_stock_qty_total` CHECK (((`qty_total` is null) or (`qty_total` >= 0))),
  CONSTRAINT `ck_stock_qty_sold` CHECK ((`qty_sold` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `stock_holds` (
  `hold_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `stock_date` date NOT NULL,
  `cart_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `options_hash` char(64) NOT NULL,
  `quantity` int NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`hold_id`),
  UNIQUE KEY `uq_hold_row` (`branch_id`,`stock_date`,`cart_id`,`item_id`,`options_hash`),
  KEY `idx_hold_expires` (`expires_at`),
  CONSTRAINT `fk_hold_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hold_cart` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hold_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `ck_hold_qty` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ========== 6) Search synonyms ==========
CREATE TABLE IF NOT EXISTS `search_synonyms` (
  `syn_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `canonical_term` varchar(80) NOT NULL,
  `synonym_term` varchar(80) NOT NULL,
  `weight` decimal(4,2) NOT NULL DEFAULT 1.00,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`syn_id`),
  UNIQUE KEY `uq_syn_pair` (`canonical_term`,`synonym_term`),
  KEY `idx_syn_canonical` (`canonical_term`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ========== 7) Cart item options uniqueness (hash) ==========
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'cart_items'
    AND column_name = 'options_hash'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE cart_items ADD COLUMN options_hash CHAR(64) NOT NULL DEFAULT "" AFTER item_options',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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

-- ========== 8) Options system ==========
CREATE TABLE IF NOT EXISTS `menu_option_groups` (
  `group_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `group_code` varchar(40) NOT NULL,
  `group_name` varchar(120) NOT NULL,
  `selection_mode` varchar(20) NOT NULL DEFAULT 'MULTI',
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  `min_select` int NOT NULL DEFAULT 0,
  `max_select` int NOT NULL DEFAULT 0,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`group_id`),
  UNIQUE KEY `uq_opt_group_code` (`group_code`),
  CONSTRAINT `ck_opt_group_mode` CHECK ((`selection_mode` in ('SINGLE','MULTI'))),
  CONSTRAINT `ck_opt_group_select` CHECK ((`min_select` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `menu_options` (
  `option_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `group_id` bigint unsigned NOT NULL,
  `option_name` varchar(120) NOT NULL,
  `price_mode` varchar(20) NOT NULL DEFAULT 'DELTA',
  `price_value` decimal(12,2) NOT NULL DEFAULT 0.00,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`option_id`),
  UNIQUE KEY `uq_option_name_per_group` (`group_id`,`option_name`),
  KEY `idx_option_group` (`group_id`),
  CONSTRAINT `fk_option_group` FOREIGN KEY (`group_id`) REFERENCES `menu_option_groups` (`group_id`) ON DELETE CASCADE,
  CONSTRAINT `ck_option_price_mode` CHECK ((`price_mode` in ('DELTA','OVERRIDE'))),
  CONSTRAINT `ck_option_price_value` CHECK ((`price_value` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `menu_item_option_groups` (
  `item_id` bigint unsigned NOT NULL,
  `group_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`item_id`,`group_id`),
  CONSTRAINT `fk_iog_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_iog_group` FOREIGN KEY (`group_id`) REFERENCES `menu_option_groups` (`group_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ========== 9) Order item pricing breakdown ==========
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'order_items'
    AND column_name = 'pricing_breakdown'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE order_items ADD COLUMN pricing_breakdown JSON DEFAULT NULL AFTER item_options',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
