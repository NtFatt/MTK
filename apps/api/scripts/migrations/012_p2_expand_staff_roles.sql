-- P2: Expand staff roles to match Spec v6.2 (7 roles demo)
-- Adds: SUPERVISOR, INVENTORY

ALTER TABLE `staff_users`
  DROP CHECK `ck_staff_role`;

ALTER TABLE `staff_users`
  ADD CONSTRAINT `ck_staff_role` CHECK (`role` IN (
    'BRANCH_MANAGER',
    'SUPERVISOR',
    'INVENTORY',
    'STAFF',
    'KITCHEN',
    'CASHIER'
  ));
