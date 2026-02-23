import { Router } from "express";
import type { ClientAuthController } from "../controllers/ClientAuthController.js";
import type { RedisClient } from "../../../infrastructure/redis/redisClient.js";
import { env } from "../../../infrastructure/config/env.js";
import { rateLimit } from "../middlewares/rateLimit.js";
import { asyncHandler } from "./asyncHandler.js";

export function createClientAuthRouter(
  controller: ClientAuthController,
  deps?: { redis?: RedisClient },
) {
  const r = Router();

  // Rate limit specs (M3)
  const rlOtpReq = rateLimit(deps?.redis, {
    scope: "otp:req",
    limit: env.RL_OTP_REQUEST_LIMIT,
    windowSeconds: env.RL_OTP_REQUEST_WINDOW_SECONDS,
    getIdentity: (req) => String((req.body as any)?.phone ?? "anonymous"),
  });

  const rlOtpVerify = rateLimit(deps?.redis, {
    scope: "otp:verify",
    limit: env.RL_OTP_VERIFY_LIMIT,
    windowSeconds: env.RL_OTP_VERIFY_WINDOW_SECONDS,
    getIdentity: (req) => String((req.body as any)?.phone ?? "anonymous"),
  });

  // Controller methods are named request/verify (not requestOtp/verifyOtp).
  r.post("/otp/request", rlOtpReq, asyncHandler(controller.request));
  r.post("/otp/verify", rlOtpVerify, asyncHandler(controller.verify));
  r.post("/refresh", asyncHandler(controller.refresh));
  // Token lifecycle (SPEC 6.2): allow explicit revoke of refresh token.
  r.post("/logout", asyncHandler(controller.logoutHandler));

  return r;
}
