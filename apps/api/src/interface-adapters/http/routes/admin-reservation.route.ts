import { Router } from "express";
import type { AdminReservationController } from "../controllers/AdminReservationController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminReservationRouter(controller: AdminReservationController) {
  const r = Router();
  r.use(requireInternal);

  // Listing reservations is treated as "confirm" scope (service staff).
  r.get("/reservations", requirePermission("reservations.confirm"), asyncHandler(controller.list));

  // Spec/collections use PATCH for confirm. Keep POST as backward-compatible.
  r.patch(
    "/reservations/:reservationCode/confirm",
    requirePermission("reservations.confirm"),
    asyncHandler(controller.confirm),
  );

  r.post(
    "/reservations/:reservationCode/confirm",
    requirePermission("reservations.confirm"),
    asyncHandler(controller.confirm),
  );

  r.post(
    "/reservations/:reservationCode/checkin",
    requirePermission("reservations.checkin"),
    asyncHandler(controller.checkIn),
  );

  return r;
}
