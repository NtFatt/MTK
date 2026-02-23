import { Router } from "express";
import type { AdminObservabilityController } from "../controllers/AdminObservabilityController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminObservabilityRouter(controller: AdminObservabilityController) {
  const r = Router();
  r.use(requireInternal);

  // Admin-only diagnostic endpoints (extension)
  r.get(
    "/observability/slow-queries",
    requirePermission("observability.admin.read"),
    asyncHandler(controller.slowQueries),
  );
  r.get(
    "/observability/logs",
    requirePermission("observability.admin.read"),
    asyncHandler(controller.logs),
  );

  return r;
}
