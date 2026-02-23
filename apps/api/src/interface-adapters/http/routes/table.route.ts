import { Router } from "express";
import type { TableController } from "../controllers/TableController.js";
import { asyncHandler } from "./asyncHandler.js";

export function createTableRouter(controller: TableController) {
  const router = Router();

  router.get("/", asyncHandler(controller.getAll));
  router.get("/:directionId", asyncHandler(controller.getByDirection));

  return router;
}
