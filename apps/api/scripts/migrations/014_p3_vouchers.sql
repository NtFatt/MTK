CREATE TABLE IF NOT EXISTS vouchers (
  voucher_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NOT NULL,
  voucher_code VARCHAR(40) NOT NULL,
  voucher_name VARCHAR(120) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  discount_type ENUM('PERCENT', 'FIXED_AMOUNT') NOT NULL,
  discount_value DECIMAL(12,2) NOT NULL,
  max_discount_amount DECIMAL(12,2) DEFAULT NULL,
  min_subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  usage_limit_total INT DEFAULT NULL,
  usage_limit_per_session INT DEFAULT NULL,
  usage_count INT NOT NULL DEFAULT 0,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (voucher_id),
  UNIQUE KEY uq_vouchers_branch_code (branch_id, voucher_code),
  KEY idx_vouchers_branch_active_time (branch_id, is_active, starts_at, ends_at),
  CONSTRAINT fk_vouchers_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
  CONSTRAINT ck_vouchers_discount_value CHECK (discount_value > 0),
  CONSTRAINT ck_vouchers_max_discount CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
  CONSTRAINT ck_vouchers_min_subtotal CHECK (min_subtotal >= 0),
  CONSTRAINT ck_vouchers_usage_limit_total CHECK (usage_limit_total IS NULL OR usage_limit_total > 0),
  CONSTRAINT ck_vouchers_usage_limit_session CHECK (usage_limit_per_session IS NULL OR usage_limit_per_session > 0),
  CONSTRAINT ck_vouchers_usage_count CHECK (usage_count >= 0),
  CONSTRAINT ck_vouchers_time CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS voucher_usages (
  usage_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  voucher_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  session_id BIGINT UNSIGNED DEFAULT NULL,
  voucher_code_snapshot VARCHAR(40) NOT NULL,
  voucher_name_snapshot VARCHAR(120) NOT NULL,
  discount_type ENUM('PERCENT', 'FIXED_AMOUNT') NOT NULL,
  discount_value DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL,
  subtotal_amount DECIMAL(12,2) NOT NULL,
  total_after_discount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usage_id),
  UNIQUE KEY uq_voucher_usages_order (order_id),
  KEY idx_voucher_usages_voucher_session (voucher_id, session_id),
  KEY idx_voucher_usages_branch_created (branch_id, created_at),
  CONSTRAINT fk_voucher_usages_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
  CONSTRAINT fk_voucher_usages_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
  CONSTRAINT fk_voucher_usages_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_voucher_usages_session FOREIGN KEY (session_id) REFERENCES table_sessions(session_id) ON DELETE SET NULL,
  CONSTRAINT ck_voucher_usages_money CHECK (
    discount_value > 0 AND discount_amount >= 0 AND subtotal_amount >= 0 AND total_after_discount >= 0
  )
);

SET @has_applied_voucher_id := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'carts'
    AND column_name = 'applied_voucher_id'
);
SET @sql := IF(
  @has_applied_voucher_id = 0,
  'ALTER TABLE carts ADD COLUMN applied_voucher_id BIGINT UNSIGNED NULL AFTER session_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_carts_voucher_idx := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'carts'
    AND index_name = 'idx_carts_applied_voucher'
);
SET @sql := IF(
  @has_carts_voucher_idx = 0,
  'ALTER TABLE carts ADD KEY idx_carts_applied_voucher (applied_voucher_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_carts_voucher_fk := (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'carts'
    AND constraint_name = 'fk_carts_applied_voucher'
);
SET @sql := IF(
  @has_carts_voucher_fk = 0,
  'ALTER TABLE carts ADD CONSTRAINT fk_carts_applied_voucher FOREIGN KEY (applied_voucher_id) REFERENCES vouchers(voucher_id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_voucher_id_snapshot := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND column_name = 'voucher_id_snapshot'
);
SET @sql := IF(
  @has_voucher_id_snapshot = 0,
  'ALTER TABLE orders
     ADD COLUMN voucher_id_snapshot BIGINT UNSIGNED NULL AFTER rank_id_snapshot,
     ADD COLUMN voucher_code_snapshot VARCHAR(40) NULL AFTER voucher_id_snapshot,
     ADD COLUMN voucher_name_snapshot VARCHAR(120) NULL AFTER voucher_code_snapshot,
     ADD COLUMN voucher_discount_type VARCHAR(20) NULL AFTER voucher_name_snapshot,
     ADD COLUMN voucher_discount_value DECIMAL(12,2) NULL AFTER voucher_discount_type,
     ADD COLUMN voucher_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER voucher_discount_value',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_orders_voucher_fk := (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'orders'
    AND constraint_name = 'fk_orders_voucher_snapshot'
);
SET @sql := IF(
  @has_orders_voucher_fk = 0,
  'ALTER TABLE orders
     ADD CONSTRAINT fk_orders_voucher_snapshot FOREIGN KEY (voucher_id_snapshot) REFERENCES vouchers(voucher_id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
