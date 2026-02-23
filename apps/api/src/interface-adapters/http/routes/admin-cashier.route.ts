import { Router } from "express";
import type { AdminCashierController } from "../controllers/AdminCashierController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { withIdempotency } from "../middlewares/idempotency.js";
import type { RedisClient } from "../../../infrastructure/redis/redisClient.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminCashierRouter(ctrl: AdminCashierController, deps?: { redis?: RedisClient }) {
  const r = Router();
  r.use(requireInternal);

  // CASHIER/BRANCH_MANAGER/ADMIN: unpaid list
  r.get("/cashier/unpaid", requirePermission("cashier.unpaid.read"), asyncHandler(ctrl.listUnpaid));

  // CASHIER/BRANCH_MANAGER/ADMIN: settle cash payment (idempotent)
  r.post(
    "/cashier/settle-cash/:orderCode",
    requirePermission("cashier.settle_cash"),
    asyncHandler(withIdempotency({ redis: deps?.redis, endpoint: "settle-cash" })(ctrl.settleCash)),
  );

  return r;
}
