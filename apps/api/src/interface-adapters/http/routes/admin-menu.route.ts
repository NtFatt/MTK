import { Router } from "express";
import type { AdminMenuController } from "../controllers/AdminMenuController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminMenuRouter(ctrl: AdminMenuController) {
  const r = Router();

  r.use(requireInternal);
  r.use(requirePermission("menu.manage"));

  r.get("/menu/categories", asyncHandler(ctrl.categories));
  r.get("/menu/items", asyncHandler(ctrl.items));
  r.post("/menu/items", asyncHandler(ctrl.createItem));
  r.put("/menu/items/:itemId", asyncHandler(ctrl.updateItem));
  r.patch("/menu/items/:itemId/active", asyncHandler(ctrl.setItemActive));

  return r;
}