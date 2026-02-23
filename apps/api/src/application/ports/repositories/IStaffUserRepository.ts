export type StaffUserRole = "BRANCH_MANAGER" | "STAFF" | "KITCHEN" | "CASHIER";

export type StaffUserStatus = "ACTIVE" | "DISABLED";

export type StaffUserRecord = {
  staffId: string;
  username: string;
  passwordHash: string;
  fullName: string | null;
  role: StaffUserRole;
  status: StaffUserStatus;
  branchId: string | null;
};

export interface IStaffUserRepository {
  findByUsername(username: string): Promise<StaffUserRecord | null>;

  findById(staffId: string): Promise<StaffUserRecord | null>;

  list(input?: { branchId?: string | null; status?: StaffUserStatus | null }): Promise<StaffUserRecord[]>;

  create(input: {
    username: string;
    passwordHash: string;
    fullName: string | null;
    role: StaffUserRole;
    branchId: string;
  }): Promise<StaffUserRecord>;

  updateRole(staffId: string, role: StaffUserRole): Promise<void>;
  updateStatus(staffId: string, status: StaffUserStatus): Promise<void>;
  updatePasswordHash(staffId: string, passwordHash: string): Promise<void>;
}
