import type { NextFunction, Request, Response } from "express";
import type { InternalRole } from "../../../infrastructure/security/token.js";

export function requireRole(allowed: InternalRole | InternalRole[]) {
  const set = new Set(Array.isArray(allowed) ? allowed : [allowed]);

  return (req: Request, res: Response, next: NextFunction) => {
    const auth = (res.locals as any).internal;
    if (!auth?.role) throw new Error("UNAUTHORIZED");

    if (!set.has(String(auth.role) as any)) throw new Error("FORBIDDEN");
    return next();
  };
}
