import { Router, type Router as ExpressRouter } from "express";
import type { OrderController } from "../controllers/OrderController.js";
import { asyncHandler } from "./asyncHandler.js";

export function createOrderRouter(controller: OrderController): ExpressRouter {
  const router = Router();

  router.post("/from-cart/:cartKey", asyncHandler(controller.createFromCartHandler));
  router.get("/:orderCode/status", asyncHandler(controller.getStatus));

  return router;
}
