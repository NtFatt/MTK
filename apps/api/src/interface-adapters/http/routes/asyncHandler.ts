import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 does NOT catch promise rejections from async handlers.
 * This wrapper guarantees all thrown/rejected errors flow into errorHandler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => unknown,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
