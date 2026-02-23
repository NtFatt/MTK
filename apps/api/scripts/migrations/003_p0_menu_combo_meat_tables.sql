-- P0 Menu extension: Combo composition + Meat profiles

-- 1) Ensure we can upsert menu_items by (category_id, item_name)
SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'menu_items'
    AND index_name = 'uq_menu_item_category_name'
);

SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE menu_items ADD UNIQUE KEY uq_menu_item_category_name (category_id, item_name)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Combo sets (combo is still a menu_item; these tables store composition)
CREATE TABLE IF NOT EXISTS `combo_sets` (
  `combo_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `combo_item_id` bigint unsigned NOT NULL,
  `serve_for` int NOT NULL DEFAULT '1',
  `allow_customization` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`combo_id`),
  UNIQUE KEY `uq_combo_item` (`combo_item_id`),
  CONSTRAINT `fk_combo_item` FOREIGN KEY (`combo_item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `ck_combo_serve_for` CHECK ((`serve_for` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `combo_set_items` (
  `combo_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `group_name` varchar(60) DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`combo_id`,`item_id`),
  KEY `idx_csi_item` (`item_id`),
  CONSTRAINT `fk_csi_combo` FOREIGN KEY (`combo_id`) REFERENCES `combo_sets` (`combo_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_csi_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`),
  CONSTRAINT `ck_csi_qty` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3) Meat profiles (extra metadata for meat items)
CREATE TABLE IF NOT EXISTS `meat_profiles` (
  `item_id` bigint unsigned NOT NULL,
  `meat_kind` varchar(20) NOT NULL,
  `cut` varchar(80) NOT NULL,
  `origin` varchar(80) DEFAULT NULL,
  `portion_grams` int DEFAULT NULL,
  `marbling_level` tinyint DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`),
  CONSTRAINT `fk_meat_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `ck_meat_kind` CHECK ((`meat_kind` in (_utf8mb4'BEEF',_utf8mb4'PORK',_utf8mb4'LAMB',_utf8mb4'CHICKEN',_utf8mb4'SEAFOOD',_utf8mb4'OTHER'))),
  CONSTRAINT `ck_portion_grams` CHECK (((`portion_grams` is null) or (`portion_grams` > 0))),
  CONSTRAINT `ck_marbling` CHECK (((`marbling_level` is null) or ((`marbling_level` >= 1) and (`marbling_level` <= 5))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
