import { Router, type Router as ExpressRouter } from "express";
import type { CartController } from "../controllers/CartController.js";
import { asyncHandler } from "./asyncHandler.js";

export function createCartRouter(controller: CartController): ExpressRouter {
  const router = Router();

  router.post("/session/:sessionKey", asyncHandler(controller.openForSession));
  router.get("/:cartKey", asyncHandler(controller.getByCartKey));
  router.put("/:cartKey/items", asyncHandler(controller.upsertCartItem));
  router.delete("/:cartKey/items/:itemId", asyncHandler(controller.removeCartItem));

  return router;
}
