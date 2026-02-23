import { Router } from "express";
import type { AdminMaintenanceController } from "../controllers/AdminMaintenanceController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminMaintenanceRouter(controller: AdminMaintenanceController) {
  const r = Router();
  r.use(requireInternal);

  // ADMIN only (spec): dev/ops maintenance
  r.post("/maintenance/run", requirePermission("maintenance.run"), asyncHandler(controller.run));
  r.post(
    "/maintenance/sync-table-status",
    requirePermission("maintenance.run"),
    asyncHandler(controller.syncTableStatus),
  );

  // DEV deterministic helpers (used by smoke/demo)
  r.post(
    "/maintenance/reset-dev-state",
    requirePermission("maintenance.run"),
    asyncHandler(controller.resetDevState),
  );

  r.post(
    "/maintenance/dev/set-stock",
    requirePermission("maintenance.run"),
    asyncHandler(controller.setDevStock),
  );

  return r;
}
