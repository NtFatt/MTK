import { Router } from "express";
import type { AdminStaffController } from "../controllers/AdminStaffController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminStaffRouter(ctrl: AdminStaffController) {
  const r = Router();

  // All endpoints are internal-auth only.
  r.use(requireInternal);

  r.get("/staff", requirePermission("staff.read"), asyncHandler(ctrl.list));
  r.post("/staff", requirePermission("staff.manage"), asyncHandler(ctrl.create));

  r.patch("/staff/:staffId/role", requirePermission("staff.manage"), asyncHandler(ctrl.updateRole));
  r.patch("/staff/:staffId/status", requirePermission("staff.manage"), asyncHandler(ctrl.updateStatus));
  r.post(
    "/staff/:staffId/reset-password",
    requirePermission("staff.manage"),
    asyncHandler(ctrl.resetPassword),
  );

  return r;
}
