CREATE TABLE IF NOT EXISTS staff_shift_assignments (
  assignment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NOT NULL,
  staff_id BIGINT UNSIGNED NOT NULL,
  business_date DATE NOT NULL,
  shift_code VARCHAR(20) NOT NULL,
  shift_name VARCHAR(80) NOT NULL,
  assigned_by_actor_type VARCHAR(20) NULL,
  assigned_by_id VARCHAR(40) NULL,
  assigned_by_name VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (assignment_id),
  UNIQUE KEY uq_staff_shift_assignment (branch_id, staff_id, business_date, shift_code),
  KEY idx_staff_shift_assignment_branch_date_shift (branch_id, business_date, shift_code),
  KEY idx_staff_shift_assignment_staff_date (staff_id, business_date DESC),
  CONSTRAINT fk_staff_shift_assignment_branch
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
  CONSTRAINT fk_staff_shift_assignment_staff
    FOREIGN KEY (staff_id) REFERENCES staff_users(staff_id),
  CONSTRAINT ck_staff_shift_assignment_shift_code
    CHECK (shift_code IN ('MORNING', 'EVENING')),
  CONSTRAINT ck_staff_shift_assignment_actor_type
    CHECK (assigned_by_actor_type IS NULL OR assigned_by_actor_type IN ('ADMIN', 'STAFF'))
);
