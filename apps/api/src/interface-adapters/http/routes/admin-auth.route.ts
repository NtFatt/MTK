import { Router } from "express";
import type { AdminAuthController } from "../controllers/AdminAuthController.js";
import type { RedisClient } from "../../../infrastructure/redis/redisClient.js";
import { env } from "../../../infrastructure/config/env.js";
import { rateLimit } from "../middlewares/rateLimit.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminAuthRouter(
  controller: AdminAuthController,
  deps?: { redis?: RedisClient },
) {
  const router = Router();

  const rlLogin = rateLimit(deps?.redis, {
    scope: "admin:login",
    limit: env.RL_ADMIN_LOGIN_LIMIT,
    windowSeconds: env.RL_ADMIN_LOGIN_WINDOW_SECONDS,
    getIdentity: (req) => String((req.body as any)?.username ?? "anonymous"),
  });

  router.post("/login", rlLogin, asyncHandler(controller.login));

  return router;
}
