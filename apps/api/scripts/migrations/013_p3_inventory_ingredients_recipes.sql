CREATE TABLE IF NOT EXISTS inventory_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NOT NULL,
  ingredient_code VARCHAR(64) NOT NULL,
  ingredient_name VARCHAR(255) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  current_qty DECIMAL(14,3) NOT NULL DEFAULT 0,
  warning_threshold DECIMAL(14,3) NOT NULL DEFAULT 0,
  critical_threshold DECIMAL(14,3) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_items_branch_code (branch_id, ingredient_code),
  KEY idx_inventory_items_branch_active (branch_id, is_active),
  KEY idx_inventory_items_branch_name (branch_id, ingredient_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ingredient_inventory_adjustments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NOT NULL,
  ingredient_id BIGINT UNSIGNED NOT NULL,
  adjustment_type ENUM('IN','OUT','SET','CORRECTION') NOT NULL,
  quantity_delta DECIMAL(14,3) NOT NULL,
  reason VARCHAR(255) NULL,
  actor_type VARCHAR(32) NULL,
  actor_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ing_adj_branch_created (branch_id, created_at),
  KEY idx_ing_adj_ingredient_created (ingredient_id, created_at),
  CONSTRAINT fk_ing_adj_item
    FOREIGN KEY (ingredient_id) REFERENCES inventory_items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_item_recipes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  menu_item_id BIGINT UNSIGNED NOT NULL,
  ingredient_id BIGINT UNSIGNED NOT NULL,
  qty_per_item DECIMAL(14,3) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recipe_menu_item_ingredient (menu_item_id, ingredient_id),
  KEY idx_recipe_menu_item (menu_item_id),
  KEY idx_recipe_ingredient (ingredient_id),
  CONSTRAINT fk_recipe_ingredient
    FOREIGN KEY (ingredient_id) REFERENCES inventory_items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_consumptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NOT NULL,
  menu_item_id BIGINT UNSIGNED NOT NULL,
  ingredient_id BIGINT UNSIGNED NOT NULL,
  qty_consumed DECIMAL(14,3) NOT NULL,
  trigger_status VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_consumption_once (order_item_id, ingredient_id, trigger_status),
  KEY idx_inventory_cons_order (order_id),
  KEY idx_inventory_cons_branch_created (branch_id, created_at),
  KEY idx_inventory_cons_ingredient_created (ingredient_id, created_at),
  CONSTRAINT fk_inventory_cons_ingredient
    FOREIGN KEY (ingredient_id) REFERENCES inventory_items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;