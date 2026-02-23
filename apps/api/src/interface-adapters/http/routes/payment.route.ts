import { Router, type Router as ExpressRouter } from "express";
import type { PaymentController } from "../controllers/PaymentController.js";
import { asyncHandler } from "./asyncHandler.js";

export function createPaymentRouter(controller: PaymentController): ExpressRouter {
  const r = Router();
  r.post("/vnpay/create/:orderCode", asyncHandler(controller.createVNPay));
  r.get("/vnpay/return", asyncHandler(controller.vnpReturn));
  r.get("/vnpay/ipn", asyncHandler(controller.vnpIpn));
  return r;
}
