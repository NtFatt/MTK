import { Router } from "express";
import { asyncHandler } from "./asyncHandler.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import type { AdminTableController } from "../controllers/AdminTableController.js";

export function buildAdminTableRouter({
  adminTableController,
}: {
  adminTableController: AdminTableController;
}) {
  const router = Router();

  router.use(requireInternal);

  router.post("/", requirePermission("ops.tables.manage"), asyncHandler(adminTableController.createTable));
  router.put("/:tableId", requirePermission("ops.tables.manage"), asyncHandler(adminTableController.updateTable));
  router.delete("/:tableId", requirePermission("ops.tables.manage"), asyncHandler(adminTableController.deleteTable));

  return router;
}
