import type { Request, Response } from "express";
import type { OpenTableSession } from "../../../application/use-cases/table/OpenTableSession.js";
import type { CloseTableSession } from "../../../application/use-cases/table/CloseTableSession.js";

function mustString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.length === 0) throw new Error(`INVALID_${field}`);
  return v;
}

export class TableSessionController {
  constructor(
    private openUc: OpenTableSession,
    private closeUc: CloseTableSession,
  ) {}

  open = async (req: Request, res: Response) => {
    const directionId = typeof req.body?.directionId === "string" ? req.body.directionId.trim() : "";
    const tableId = typeof req.body?.tableId === "string" ? req.body.tableId.trim() : "";
    if (!directionId && !tableId) throw new Error("INVALID_DIRECTION_ID");

    const out = await this.openUc.execute({
      directionId: directionId || undefined,
      tableId: tableId || undefined,
    });

    // Backward-compatible response contract:
    // Some legacy tools/scripts expect `sessionKey` at the top-level.
    // Keep the richer `session` object while exposing aliases.
    return res.status(out.created ? 201 : 200).json({
      ...out,
      sessionKey: (out as any)?.session?.sessionKey ?? null,
      sessionId: (out as any)?.session?.id !== undefined ? String((out as any).session.id) : null,
    });
  };

  close = async (req: Request, res: Response) => {
    const sessionKey = mustString(req.params?.sessionKey as unknown, "SESSION_KEY");

    const out = await this.closeUc.execute(sessionKey);
    if (!out) throw new Error("SESSION_NOT_FOUND");

    return res.json({
      sessionKey: out.session.sessionKey,
      sessionId: String(out.session.id),
      tableId: out.session.tableId,
      status: out.session.status,
      tableStatus: out.tableStatus,
    });
  };
}
