import { Router } from "express";
import type { RedisClient } from "../../../infrastructure/redis/redisClient.js";
import type { AdminPayrollController } from "../controllers/AdminPayrollController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { withIdempotency } from "../middlewares/idempotency.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminPayrollRouter(
  ctrl: AdminPayrollController,
  deps?: { redis?: RedisClient },
) {
  const r = Router();
  r.use(requireInternal);

  r.get("/payroll/summary", requirePermission("payroll.read"), asyncHandler(ctrl.listSummary));
  r.get("/payroll/staff/:staffId", requirePermission("payroll.read"), asyncHandler(ctrl.staffDetail));
  r.put(
    "/payroll/profiles/:staffId",
    requirePermission("payroll.manage"),
    asyncHandler(ctrl.upsertProfile),
  );
  r.post(
    "/payroll/staff/:staffId/bonuses",
    requirePermission("payroll.bonus.manage"),
    asyncHandler(
      withIdempotency({
        endpoint: "payroll-bonus-create",
        paramName: "staffId",
        ...(deps?.redis ? { redis: deps.redis } : {}),
      })(ctrl.createBonus),
    ),
  );
  r.patch(
    "/payroll/bonuses/:payrollBonusId",
    requirePermission("payroll.bonus.manage"),
    asyncHandler(ctrl.updateBonus),
  );
  r.post(
    "/payroll/bonuses/:payrollBonusId/void",
    requirePermission("payroll.bonus.manage"),
    asyncHandler(
      withIdempotency({
        endpoint: "payroll-bonus-void",
        paramName: "payrollBonusId",
        ...(deps?.redis ? { redis: deps.redis } : {}),
      })(ctrl.voidBonus),
    ),
  );

  return r;
}
