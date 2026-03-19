import { Router } from "express";
import type { AdminMenuController } from "../controllers/AdminMenuController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminMenuRouter(ctrl: AdminMenuController) {
  const r = Router();

  r.use(requireInternal);

  r.post(
    "/menu/items",
    requirePermission("menu.manage"),
    asyncHandler(ctrl.createItem),
  );

  return r;
}