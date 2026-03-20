import { Router, type Router as ExpressRouter } from "express";
import type { VoucherController } from "../controllers/VoucherController.js";
import { asyncHandler } from "./asyncHandler.js";

export function createVoucherRouter(controller: VoucherController): ExpressRouter {
  const router = Router();

  router.get("/", asyncHandler(controller.listPublic));

  return router;
}
