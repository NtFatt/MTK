import { Router } from "express";
import type { AdminDashboardController } from "../controllers/AdminDashboardController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminDashboardRouter(controller: AdminDashboardController) {
  const r = Router();
  r.use(requireInternal);

  r.get(
    "/dashboard/overview",
    requirePermission("observability.metrics.read"),
    asyncHandler(controller.overview),
  );

  return r;
}
