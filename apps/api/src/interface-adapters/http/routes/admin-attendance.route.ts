import { Router } from "express";
import type { RedisClient } from "../../../infrastructure/redis/redisClient.js";
import type { AdminAttendanceController } from "../controllers/AdminAttendanceController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { withIdempotency } from "../middlewares/idempotency.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminAttendanceRouter(
  controller: AdminAttendanceController,
  deps?: { redis?: RedisClient },
) {
  const r = Router();
  r.use(requireInternal);

  r.get("/attendance", requirePermission("attendance.read"), asyncHandler(controller.board));
  r.get(
    "/attendance/staff/:staffId/history",
    requirePermission("attendance.read"),
    asyncHandler(controller.staffHistory),
  );
  r.post(
    "/attendance/:staffId/check-in",
    requirePermission("attendance.manage"),
    asyncHandler(
      withIdempotency({
        endpoint: "attendance-checkin",
        paramName: "staffId",
        ...(deps?.redis ? { redis: deps.redis } : {}),
      })(controller.manualCheckIn),
    ),
  );
  r.post(
    "/attendance/:attendanceId/check-out",
    requirePermission("attendance.manage"),
    asyncHandler(
      withIdempotency({
        endpoint: "attendance-checkout",
        paramName: "attendanceId",
        ...(deps?.redis ? { redis: deps.redis } : {}),
      })(controller.manualCheckOut),
    ),
  );
  r.post(
    "/attendance/:staffId/mark-absent",
    requirePermission("attendance.manage"),
    asyncHandler(
      withIdempotency({
        endpoint: "attendance-absent",
        paramName: "staffId",
        ...(deps?.redis ? { redis: deps.redis } : {}),
      })(controller.markAbsent),
    ),
  );

  return r;
}
