import { Router } from "express";
import type { RedisClient } from "../../../infrastructure/redis/redisClient.js";
import type { AdminShiftController } from "../controllers/AdminShiftController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { withIdempotency } from "../middlewares/idempotency.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminShiftRouter(controller: AdminShiftController, deps?: { redis?: RedisClient }) {
  const r = Router();
  r.use(requireInternal);

  r.get("/shifts/current", requirePermission("shifts.read"), asyncHandler(controller.current));
  r.get("/shifts/history", requirePermission("shifts.read"), asyncHandler(controller.history));
  r.post(
    "/shifts/:branchId/open",
    requirePermission("shifts.open"),
    asyncHandler(
      withIdempotency({
        endpoint: "shift-open",
        paramName: "branchId",
        ...(deps?.redis ? { redis: deps.redis } : {}),
      })(controller.open),
    ),
  );
  r.post(
    "/shifts/:shiftRunId/close",
    requirePermission("shifts.close"),
    asyncHandler(
      withIdempotency({
        endpoint: "shift-close",
        paramName: "shiftRunId",
        ...(deps?.redis ? { redis: deps.redis } : {}),
      })(controller.close),
    ),
  );

  return r;
}
