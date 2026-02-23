import type { Request, Response } from "express";
import { z } from "zod";
import type { AdminLogin } from "../../../application/use-cases/admin/AdminLogin.js";
import type { IAuditLogRepository } from "../../../application/ports/repositories/IAuditLogRepository.js";

const BodySchema = z.object({
  username: z.string().min(1).max(60),
  password: z.string().min(1).max(200),
});

export class AdminAuthController {
  constructor(private loginUc: AdminLogin, private auditRepo: IAuditLogRepository | null) {}

  login = async (req: Request, res: Response) => {
    const body = BodySchema.parse(req.body);
    try {
      const out = await this.loginUc.execute(body);

      if (this.auditRepo) {
        await this.auditRepo.append({
          actorType: out.actor?.actorType ?? "SYSTEM",
          actorId: out.actor?.userId ?? null,
          action: "internal.login.success",
          entity: out.actor?.actorType === "ADMIN" ? "admin_users" : "staff_users",
          entityId: out.actor?.userId ?? null,
          payload: {
            username: out.actor?.username ?? body.username,
            role: out.actor?.role ?? null,
            branchId: out.actor?.branchId ?? null,
            ip: req.ip,
            userAgent: req.header("user-agent") ?? null,
          },
        });
      }

      return res.json(out);
    } catch (e: any) {
      if (this.auditRepo) {
        await this.auditRepo.append({
          actorType: "SYSTEM",
          actorId: null,
          action: "internal.login.failed",
          entity: "internal_auth",
          entityId: null,
          payload: {
            username: body.username,
            reason: e?.code ?? e?.message ?? "UNKNOWN",
            ip: req.ip,
            userAgent: req.header("user-agent") ?? null,
          },
        });
      }
      throw e;
    }
  };
}
