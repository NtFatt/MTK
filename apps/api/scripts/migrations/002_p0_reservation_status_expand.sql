-- P0: Expand reservation status lifecycle to match domain (NO_SHOW, COMPLETED)
-- MySQL 8 CHECK constraints are named and must be dropped before re-adding.

SET @has_ck := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'table_reservations'
    AND constraint_name = 'ck_resv_status'
    AND constraint_type = 'CHECK'
);

SET @drop_sql := IF(@has_ck > 0,
  'ALTER TABLE table_reservations DROP CHECK ck_resv_status',
  'SELECT 1'
);

PREPARE stmt FROM @drop_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE table_reservations
  ADD CONSTRAINT ck_resv_status
  CHECK (status IN ('PENDING','CONFIRMED','CANCELED','CHECKED_IN','EXPIRED','NO_SHOW','COMPLETED'));
