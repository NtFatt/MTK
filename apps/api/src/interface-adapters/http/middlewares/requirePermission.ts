import type { NextFunction, Request, Response } from "express";
import { hasInternalPermission, type InternalPermission } from "../../../domain/policies/internalPermissions.js";

/**
 * RequireInternal MUST run before this middleware.
 */
export function requirePermission(permission: InternalPermission) {
  return function (req: Request, res: Response, next: NextFunction) {
    const internal = (res.locals as any).internal;
    if (!internal?.role) throw new Error("INVALID_TOKEN");

    if (!hasInternalPermission(internal.role, permission)) {
      const err: any = new Error("FORBIDDEN");
      err.status = 403;
      err.code = "FORBIDDEN";
      err.details = { permission };
      throw err;
    }
    return next();
  };
}
