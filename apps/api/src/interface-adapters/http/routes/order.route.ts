import { Router, type Router as ExpressRouter } from "express";
import type { OrderController } from "../controllers/OrderController.js";
import { withIdempotency } from "../middlewares/idempotency.js";
import type { RedisClient } from "../../../infrastructure/redis/redisClient.js";
import { asyncHandler } from "./asyncHandler.js";

export function createOrderRouter(
  controller: OrderController,
  deps?: { redis?: RedisClient },
): ExpressRouter {
  const router = Router();
  const createFromCartHandler = deps?.redis
    ? withIdempotency({
        endpoint: "orders-from-cart",
        redis: deps.redis,
        paramName: "cartKey",
      })(controller.createFromCartHandler)
    : controller.createFromCartHandler;

  router.post("/from-cart/:cartKey", asyncHandler(createFromCartHandler));
  router.get("/:orderCode/status", asyncHandler(controller.getStatus));

  return router;
}
