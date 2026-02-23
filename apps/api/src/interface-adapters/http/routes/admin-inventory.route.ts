import { Router } from "express";
import type { AdminInventoryController } from "../controllers/AdminInventoryController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminInventoryRouter(ctrl: AdminInventoryController) {
  const r = Router();

  r.use(requireInternal);

  // Inventory stock (MySQL SoT)
  r.get("/inventory/stock", requirePermission("inventory.read"), asyncHandler(ctrl.listStock));

  // Active holds (Redis)
  r.get("/inventory/holds", requirePermission("inventory.holds.read"), asyncHandler(ctrl.listHolds));

  // Drift metrics (Redis)
  r.get("/inventory/rehydrate/metrics", requirePermission("inventory.read"), asyncHandler(ctrl.getDriftMetrics));

  // Adjust branch stock (MySQL SoT + best-effort redis sync)
  r.post("/inventory/stock/adjust", requirePermission("inventory.adjust"), asyncHandler(ctrl.adjustStock));

  // Manual trigger for drift-control job (Phase 2)
  r.post("/inventory/rehydrate/run", requirePermission("inventory.adjust"), asyncHandler(ctrl.runRehydrate));

  // Menu cache invalidation (Phase 1)
  r.post("/inventory/menu/bump", requirePermission("menu.manage"), asyncHandler(ctrl.bumpMenuVersion));

  return r;
}
