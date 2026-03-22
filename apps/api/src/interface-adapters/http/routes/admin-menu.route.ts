import { Router } from "express";
import type { AdminMenuController } from "../controllers/AdminMenuController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminMenuRouter(ctrl: AdminMenuController) {
  const r = Router();

  r.use(requireInternal);

  r.get("/menu/categories", requirePermission("menu.manage"), asyncHandler(ctrl.categories));
  r.post("/menu/categories", requirePermission("menu.manage"), asyncHandler(ctrl.createCategory));
  r.put(
    "/menu/categories/:categoryId",
    requirePermission("menu.manage"),
    asyncHandler(ctrl.updateCategory),
  );
  r.delete(
    "/menu/categories/:categoryId",
    requirePermission("menu.manage"),
    asyncHandler(ctrl.deleteCategory),
  );
  r.get("/menu/items", requirePermission("menu.manage"), asyncHandler(ctrl.items));
  r.post("/menu/items", requirePermission("menu.manage"), asyncHandler(ctrl.createItem));
  r.put("/menu/items/:itemId", requirePermission("menu.manage"), asyncHandler(ctrl.updateItem));
  r.patch(
    "/menu/items/:itemId/active",
    requirePermission("menu.manage"),
    asyncHandler(ctrl.setItemActive),
  );

  return r;
}
