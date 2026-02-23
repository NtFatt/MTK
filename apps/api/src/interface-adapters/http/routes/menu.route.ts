import { Router } from "express";
import type { MenuController } from "../controllers/MenuController.js";
import { asyncHandler } from "./asyncHandler.js";

export function createMenuRouter(controller: MenuController) {
  const router = Router();

  router.get("/categories", asyncHandler(controller.categories));
  router.get("/items", asyncHandler(controller.items));
  router.get("/items/:itemId", asyncHandler(controller.itemDetail));
  router.get("/items/:itemId/combo", asyncHandler(controller.comboDetail));
  router.get("/items/:itemId/meat-profile", asyncHandler(controller.meatProfile));

  return router;
}
