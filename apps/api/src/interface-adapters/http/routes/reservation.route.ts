import { Router, type Router as ExpressRouter } from "express";
import type { ReservationController } from "../controllers/ReservationController.js";
import { asyncHandler } from "./asyncHandler.js";

export function createReservationRouter(controller: ReservationController): ExpressRouter {
  const r = Router();
  r.get("/availability", asyncHandler(controller.availability));
  r.post("/", asyncHandler(controller.create));
  r.get("/:reservationCode", asyncHandler(controller.getByCode));
  r.post("/:reservationCode/cancel", asyncHandler(controller.cancelByCode));
  return r;
}
