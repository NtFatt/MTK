export type AdminUserRecord = {
  adminId: string;
  username: string;
  passwordHash: string;
  fullName: string | null;
  role: string;
  status: string;
};

export interface IAdminUserRepository {
  findByUsername(username: string): Promise<AdminUserRecord | null>;
}
