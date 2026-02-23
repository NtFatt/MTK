import { Router } from "express";
import type { AdminPaymentController } from "../controllers/AdminPaymentController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { withIdempotency } from "../middlewares/idempotency.js";
import type { RedisClient } from "../../../infrastructure/redis/redisClient.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminPaymentRouter(
  controller: AdminPaymentController,
  deps?: { redis?: RedisClient },
) {
  const r = Router();
  r.use(requireInternal);

  // ADMIN only (spec): mock payment success (idempotent)
  r.post(
    "/payments/mock-success/:orderCode",
    requirePermission("payments.mock_success"),
    asyncHandler(withIdempotency({ redis: deps?.redis, endpoint: "mock-success" })(controller.mockSuccess)),
  );

  return r;
}
