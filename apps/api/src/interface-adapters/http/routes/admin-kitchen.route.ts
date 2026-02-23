import { Router } from "express";
import type { AdminKitchenController } from "../controllers/AdminKitchenController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminKitchenRouter(ctrl: AdminKitchenController) {
  const r = Router();
  r.use(requireInternal);

  // KITCHEN + ADMIN: operational queue view.
  r.get("/kitchen/queue", requirePermission("kitchen.queue.read"), asyncHandler(ctrl.listQueue));

  return r;
}
