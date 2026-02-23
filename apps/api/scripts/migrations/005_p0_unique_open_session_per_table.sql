-- 005_p0_unique_open_session_per_table.sql
-- Enforce: at most 1 OPEN session per table (DB-level), via generated column + UNIQUE index.
-- Safe/Idempotent: checks existence before altering.
-- Fails fast if current data violates the constraint.

DELIMITER $$

CREATE PROCEDURE sp_mig_005_unique_open_session_per_table()
BEGIN
  DECLARE dupCount INT DEFAULT 0;
  DECLARE colExists INT DEFAULT 0;
  DECLARE idxExists INT DEFAULT 0;

  -- Fail-fast if duplicates already exist
  SELECT COUNT(*) INTO dupCount
  FROM (
    SELECT table_id
    FROM table_sessions
    WHERE status = 'OPEN'
    GROUP BY table_id
    HAVING COUNT(*) > 1
  ) d;

  IF dupCount > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration 005 failed: Multiple OPEN sessions per table detected. Close duplicates in table_sessions before enforcing UNIQUE open session per table.';
  END IF;

  -- Add generated column if missing
  SELECT COUNT(*) INTO colExists
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'table_sessions'
    AND column_name = 'open_table_id';

  IF colExists = 0 THEN
    SET @sql := "ALTER TABLE table_sessions ADD COLUMN open_table_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status='OPEN' THEN table_id ELSE NULL END) STORED";
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  -- Add UNIQUE index if missing
  SELECT COUNT(*) INTO idxExists
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'table_sessions'
    AND index_name = 'uq_open_session_per_table';

  IF idxExists = 0 THEN
    SET @sql := "CREATE UNIQUE INDEX uq_open_session_per_table ON table_sessions (open_table_id)";
    PREPARE stmt2 FROM @sql;
    EXECUTE stmt2;
    DEALLOCATE PREPARE stmt2;
  END IF;
END$$

DELIMITER ;

CALL sp_mig_005_unique_open_session_per_table();
DROP PROCEDURE sp_mig_005_unique_open_session_per_table;
