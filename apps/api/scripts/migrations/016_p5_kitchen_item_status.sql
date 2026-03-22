SET @db_name = DATABASE();

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'order_items'
        AND column_name = 'kitchen_status'
    ),
    'SELECT 1',
    "ALTER TABLE order_items ADD COLUMN kitchen_status VARCHAR(30) NOT NULL DEFAULT 'NEW' AFTER pricing_breakdown"
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'order_items'
        AND column_name = 'kitchen_received_at'
    ),
    'SELECT 1',
    "ALTER TABLE order_items ADD COLUMN kitchen_received_at DATETIME NULL AFTER kitchen_status"
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'order_items'
        AND column_name = 'kitchen_preparing_at'
    ),
    'SELECT 1',
    "ALTER TABLE order_items ADD COLUMN kitchen_preparing_at DATETIME NULL AFTER kitchen_received_at"
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'order_items'
        AND column_name = 'kitchen_ready_at'
    ),
    'SELECT 1',
    "ALTER TABLE order_items ADD COLUMN kitchen_ready_at DATETIME NULL AFTER kitchen_preparing_at"
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'order_items'
        AND index_name = 'idx_oi_order_kitchen_status'
    ),
    'SELECT 1',
    "ALTER TABLE order_items ADD INDEX idx_oi_order_kitchen_status (order_id, kitchen_status, created_at)"
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
