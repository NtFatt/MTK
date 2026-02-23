import { Router } from "express";
import type { AdminOrderController } from "../controllers/AdminOrderController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

/**
 * Admin Order routes (internal).
 * - Canonical: POST /api/v1/admin/orders/:orderCode/status
 * - Legacy-in-canonical (optional): POST /api/v1/admin/:orderCode/status (guarded by LEGACY flag)
 */
export function createAdminOrderRouter(
  controller: AdminOrderController,
  opts?: { legacyEnabled?: boolean },
) {
  const router = Router();

  router.use(requireInternal);

  // Canonical (spec)
  router.post(
    "/orders/:orderCode/status",
    requirePermission("orders.status.change"),
    asyncHandler(controller.changeStatus),
  );

  // Legacy (optional): constrained regex to avoid route collision.
  if (opts?.legacyEnabled) {
    router.post(
      "/:orderCode(ORD[0-9A-F]{10})/status",
      requirePermission("orders.status.change"),
      asyncHandler(controller.changeStatus),
    );
  }

  return router;
}
