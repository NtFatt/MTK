import type { IAdminUserRepository } from "../../ports/repositories/IAdminUserRepository.js";
import type { IStaffUserRepository } from "../../ports/repositories/IStaffUserRepository.js";
import { env } from "../../../infrastructure/config/env.js";
import { verifyPassword } from "../../../infrastructure/security/password.js";
import { createInternalToken, type InternalActor } from "../../../infrastructure/security/token.js";

export class AdminLogin {
  constructor(
    private readonly adminUserRepo: IAdminUserRepository,
    private readonly staffUserRepo: IStaffUserRepository,
  ) {}

  async execute(input: { username: string; password: string }) {
    if (!env.ADMIN_TOKEN_SECRET) throw new Error("ADMIN_TOKEN_SECRET_MISSING");

    // 1) ADMIN (system-level)
    const admin = await this.adminUserRepo.findByUsername(input.username);
    if (admin && admin.status === "ACTIVE") {
      const ok = verifyPassword(input.password, admin.passwordHash);
      if (!ok) throw new Error("INVALID_CREDENTIALS");

      // Hard policy: admin_users is ADMIN-only.
      if (String(admin.role) !== "ADMIN") throw new Error("INVALID_CREDENTIALS");

      const actor: InternalActor = {
        actorType: "ADMIN",
        userId: admin.adminId,
        username: admin.username,
        role: "ADMIN",
        branchId: null,
      };

      const token = createInternalToken({
        secret: env.ADMIN_TOKEN_SECRET,
        actor,
        ttlMinutes: env.ADMIN_TOKEN_TTL_MINUTES,
      });

      return {
        token,
        tokenType: "Bearer",
        expiresInSeconds: env.ADMIN_TOKEN_TTL_MINUTES * 60,
        actor: {
          ...actor,
          fullName: admin.fullName,
        },
        // Backward-compat for existing FE/Postman
        admin: {
          adminId: admin.adminId,
          username: admin.username,
          fullName: admin.fullName,
          role: "ADMIN",
        },
      };
    }

    // 2) STAFF (branch-scoped)
    const staff = await this.staffUserRepo.findByUsername(input.username);
    if (!staff || staff.status !== "ACTIVE") throw new Error("INVALID_CREDENTIALS");

    const ok = verifyPassword(input.password, staff.passwordHash);
    if (!ok) throw new Error("INVALID_CREDENTIALS");

    const actor: InternalActor = {
      actorType: "STAFF",
      userId: staff.staffId,
      username: staff.username,
      role: staff.role,
      branchId: staff.branchId,
    };

    const token = createInternalToken({
      secret: env.ADMIN_TOKEN_SECRET,
      actor,
      ttlMinutes: env.ADMIN_TOKEN_TTL_MINUTES,
    });

    return {
      token,
      tokenType: "Bearer",
      expiresInSeconds: env.ADMIN_TOKEN_TTL_MINUTES * 60,
      actor: {
        ...actor,
        fullName: staff.fullName,
      },
      staff: {
        staffId: staff.staffId,
        username: staff.username,
        fullName: staff.fullName,
        role: staff.role,
        branchId: staff.branchId,
      },
    };
  }
}
