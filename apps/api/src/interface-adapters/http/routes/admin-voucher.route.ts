import { Router } from "express";
import type { AdminVoucherController } from "../controllers/AdminVoucherController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminVoucherRouter(ctrl: AdminVoucherController) {
  const router = Router();

  router.use(requireInternal);

  router.get("/vouchers", requirePermission("promotions.manage"), asyncHandler(ctrl.list));
  router.post("/vouchers", requirePermission("promotions.manage"), asyncHandler(ctrl.create));
  router.patch("/vouchers/:voucherId", requirePermission("promotions.manage"), asyncHandler(ctrl.update));
  router.patch(
    "/vouchers/:voucherId/active",
    requirePermission("promotions.manage"),
    asyncHandler(ctrl.setActive),
  );

  return router;
}
