-- Phase 2: RBAC foundation (clean split)
-- Goal:
--   - admin_users becomes ADMIN-only (system admins)
--   - staff_users stores branch-scoped internal operators
--   - legacy roles in admin_users (MANAGER/KITCHEN/CASHIER) are migrated to staff_users
--     with mapping: MANAGER -> BRANCH_MANAGER
-- Notes:
--   - Idempotent (safe to re-run)

-- 1) Create staff_users
CREATE TABLE IF NOT EXISTS `staff_users` (
  `staff_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(60) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(120) DEFAULT NULL,
  `role` varchar(30) NOT NULL DEFAULT 'STAFF',
  `branch_id` bigint unsigned DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `last_login_at` datetime(3) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `uq_staff_username` (`username`),
  KEY `idx_staff_branch_role` (`branch_id`,`role`),
  CONSTRAINT `fk_staff_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL,
  CONSTRAINT `ck_staff_role` CHECK (`role` IN ('BRANCH_MANAGER','STAFF','KITCHEN','CASHIER')),
  CONSTRAINT `ck_staff_status` CHECK (`status` IN ('ACTIVE','DISABLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2) Migrate legacy internal roles from admin_users -> staff_users
SET @default_branch_id := (SELECT branch_id FROM branches ORDER BY branch_id LIMIT 1);
SET @default_branch_id := IFNULL(@default_branch_id, 1);

INSERT INTO `staff_users` (`username`, `password_hash`, `full_name`, `role`, `branch_id`, `status`)
SELECT
  a.username,
  a.password_hash,
  a.full_name,
  CASE
    WHEN a.role = 'MANAGER' THEN 'BRANCH_MANAGER'
    WHEN a.role = 'KITCHEN' THEN 'KITCHEN'
    WHEN a.role = 'CASHIER' THEN 'CASHIER'
    ELSE 'STAFF'
  END AS role,
  @default_branch_id AS branch_id,
  a.status
FROM `admin_users` a
WHERE a.role IN ('MANAGER','KITCHEN','CASHIER')
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `full_name` = VALUES(`full_name`),
  `role` = VALUES(`role`),
  `branch_id` = VALUES(`branch_id`),
  `status` = VALUES(`status`),
  `updated_at` = CURRENT_TIMESTAMP;

-- 3) Ensure admin_users is ADMIN-only (remove any non-ADMIN leftovers)
DELETE FROM `admin_users` WHERE `role` <> 'ADMIN';

-- 4) Tighten constraints (drop & re-add if needed)
SET @schema_name := DATABASE();

-- 4.1) admin_users.ck_admin_role => ADMIN only
SET @sql := (
  SELECT IF(COUNT(*) > 0,
    'ALTER TABLE `admin_users` DROP CHECK `ck_admin_role`',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE constraint_schema = @schema_name AND table_name = 'admin_users' AND constraint_name = 'ck_admin_role'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `admin_users` ADD CONSTRAINT `ck_admin_role` CHECK (`role` IN (\'ADMIN\'))',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE constraint_schema = @schema_name AND table_name = 'admin_users' AND constraint_name = 'ck_admin_role'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.2) audit_logs.ck_audit_actor => add STAFF
SET @sql := (
  SELECT IF(COUNT(*) > 0,
    'ALTER TABLE `audit_logs` DROP CHECK `ck_audit_actor`',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE constraint_schema = @schema_name AND table_name = 'audit_logs' AND constraint_name = 'ck_audit_actor'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `audit_logs` ADD CONSTRAINT `ck_audit_actor` CHECK (`actor_type` IN (\'ADMIN\',\'CLIENT\',\'SYSTEM\',\'STAFF\'))',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE constraint_schema = @schema_name AND table_name = 'audit_logs' AND constraint_name = 'ck_audit_actor'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.3) order_status_history.ck_osh_actor => add STAFF
SET @sql := (
  SELECT IF(COUNT(*) > 0,
    'ALTER TABLE `order_status_history` DROP CHECK `ck_osh_actor`',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE constraint_schema = @schema_name AND table_name = 'order_status_history' AND constraint_name = 'ck_osh_actor'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `order_status_history` ADD CONSTRAINT `ck_osh_actor` CHECK (`changed_by_type` IN (\'ADMIN\',\'CLIENT\',\'SYSTEM\',\'STAFF\'))',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE constraint_schema = @schema_name AND table_name = 'order_status_history' AND constraint_name = 'ck_osh_actor'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
