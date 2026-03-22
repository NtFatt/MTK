CREATE TABLE IF NOT EXISTS attendance_records (
  attendance_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NOT NULL,
  staff_id BIGINT UNSIGNED NOT NULL,
  business_date DATE NOT NULL,
  shift_code VARCHAR(20) NOT NULL,
  shift_name VARCHAR(80) NOT NULL,
  scheduled_start_at DATETIME NOT NULL,
  scheduled_end_at DATETIME NOT NULL,
  check_in_at DATETIME DEFAULT NULL,
  check_out_at DATETIME DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'NOT_CHECKED_IN',
  source VARCHAR(30) NOT NULL DEFAULT 'MANAGER_MANUAL',
  note VARCHAR(1000) DEFAULT NULL,
  late_minutes INT NOT NULL DEFAULT 0,
  early_leave_minutes INT NOT NULL DEFAULT 0,
  worked_minutes INT DEFAULT NULL,
  is_corrected TINYINT(1) NOT NULL DEFAULT 0,
  last_corrected_at DATETIME DEFAULT NULL,
  last_corrected_by_type VARCHAR(20) DEFAULT NULL,
  last_corrected_by_id VARCHAR(64) DEFAULT NULL,
  version INT NOT NULL DEFAULT 1,
  open_staff_guard BIGINT UNSIGNED GENERATED ALWAYS AS (
    CASE
      WHEN check_in_at IS NOT NULL AND check_out_at IS NULL THEN staff_id
      ELSE NULL
    END
  ) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (attendance_id),
  UNIQUE KEY uq_attendance_staff_shift (branch_id, staff_id, business_date, shift_code),
  UNIQUE KEY uq_attendance_open_staff (open_staff_guard),
  KEY idx_attendance_branch_date_shift (branch_id, business_date, shift_code),
  KEY idx_attendance_staff_date (staff_id, business_date DESC),
  CONSTRAINT fk_attendance_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
  CONSTRAINT fk_attendance_staff FOREIGN KEY (staff_id) REFERENCES staff_users(staff_id),
  CONSTRAINT ck_attendance_shift_code CHECK (shift_code IN ('MORNING', 'EVENING')),
  CONSTRAINT ck_attendance_status CHECK (
    status IN (
      'NOT_CHECKED_IN',
      'PRESENT',
      'LATE',
      'EARLY_LEAVE',
      'MISSING_CHECKOUT',
      'ABSENT',
      'ON_LEAVE',
      'CORRECTED'
    )
  ),
  CONSTRAINT ck_attendance_source CHECK (
    source IN ('SELF', 'MANAGER_MANUAL', 'AUTO_FROM_SHIFT', 'CORRECTION')
  ),
  CONSTRAINT ck_attendance_late_minutes CHECK (late_minutes >= 0),
  CONSTRAINT ck_attendance_early_leave_minutes CHECK (early_leave_minutes >= 0),
  CONSTRAINT ck_attendance_worked_minutes CHECK (worked_minutes IS NULL OR worked_minutes >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
