import type { Request, Response } from "express";
import { env } from "../../../infrastructure/config/env.js";
import { verifyAdminToken } from "../../../infrastructure/security/token.js";
import type { IRoomEventStore } from "../../../infrastructure/realtime/RoomEventStore.js";

import type { ITableSessionRepository } from "../../../application/ports/repositories/ITableSessionRepository.js";
import type { ITableRepository } from "../../../application/ports/repositories/ITableRepository.js";
import type { ICartRepository } from "../../../application/ports/repositories/ICartRepository.js";
import type { ICartItemRepository } from "../../../application/ports/repositories/ICartItemRepository.js";
import type { IOrderRepository } from "../../../application/ports/repositories/IOrderRepository.js";
import type { IOrderSnapshotRepository } from "../../../application/ports/repositories/IOrderSnapshotRepository.js";

type AdminActor = { adminId: string; username: string; role: string };

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeRoom(room: string): string {
  return str(room);
}

function decodeAdminFromReq(req: Request): AdminActor | null {
  // Preferred: Bearer token
  if (env.ADMIN_TOKEN_SECRET) {
    const auth = str(req.header("authorization") ?? "");
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) return null;
    try {
      const payload = verifyAdminToken(token, env.ADMIN_TOKEN_SECRET);
      return { adminId: payload.sub, username: payload.username, role: payload.role };
    } catch {
      return null;
    }
  }

  // Fallback: API key
  const expected = env.ADMIN_API_KEY;
  if (!expected) return null;
  const actual = str(req.header("x-admin-api-key") ?? "");
  if (!actual || actual !== expected) return null;
  return { adminId: "api-key", username: "api-key", role: "ADMIN" };
}

function parseRoomType(room: string):
  | { kind: "sessionKey"; sessionKey: string; room: string }
  | { kind: "session"; sessionId: string; room: string }
  | { kind: "order"; orderId: string; room: string }
  | { kind: "unsupported"; room: string } {
  const r = normalizeRoom(room);
  if (!r) return { kind: "unsupported", room: "" };
  if (r.startsWith("sessionKey:")) return { kind: "sessionKey", sessionKey: r.slice(11), room: r };
  if (r.startsWith("session:")) return { kind: "session", sessionId: r.slice(8), room: r };
  if (r.startsWith("order:")) return { kind: "order", orderId: r.slice(6), room: r };
  return { kind: "unsupported", room: r };
}

export class RealtimeSnapshotController {
  constructor(
    private readonly deps: {
      sessionRepo: ITableSessionRepository;
      tableRepo: ITableRepository;
      cartRepo: ICartRepository;
      cartItemRepo: ICartItemRepository;
      orderRepo: IOrderRepository;
      orderSnapshotRepo: IOrderSnapshotRepository;
      eventStore?: IRoomEventStore | null;
    },
  ) {}

  /**
   * GET /api/v1/realtime/snapshot?room=sessionKey:... | order:... | (admin) session:...
   */
  getSnapshot = async (req: Request, res: Response) => {
    const room = normalizeRoom(String(req.query?.room ?? ""));
    if (!room) throw new Error("ROOM_REQUIRED");

    const admin = decodeAdminFromReq(req);
    const parsed = parseRoomType(room);

    if (parsed.kind === "unsupported") throw new Error("ROOM_NOT_SUPPORTED");

    // Admin-only room types
    if (parsed.kind === "session" && !admin) throw new Error("UNAUTHORIZED");

    // Order snapshot authorization: admin OR (sessionKey matches order.sessionId)
    if (parsed.kind === "order" && !admin) {
      const sessionKey = str(req.query?.sessionKey ?? "") || str(req.header("x-session-key") ?? "");
      if (!sessionKey) throw new Error("SESSION_KEY_REQUIRED");

      const sess = await this.deps.sessionRepo.findBySessionKey(sessionKey);
      if (!sess) throw new Error("SESSION_NOT_FOUND");

      const scope = await this.deps.orderRepo.getRealtimeScopeByOrderId(parsed.orderId);
      if (!scope) throw new Error("ORDER_NOT_FOUND");
      if (!scope.sessionId || String(scope.sessionId) !== String(sess.id)) throw new Error("UNAUTHORIZED");
    }

    const snapshot = await this.buildSnapshot(parsed);

    const window = this.deps.eventStore ? await this.deps.eventStore.getWindow(parsed.room) : { earliestSeq: 0, currentSeq: 0 };

    return res.json({
      ok: true,
      room: parsed.room,
      kind: parsed.kind,
      window,
      suggestedLastSeq: window.currentSeq,
      serverNow: new Date().toISOString(),
      snapshot,
    });
  };

  /**
   * POST /api/v1/realtime/resync
   * Body: { rooms: [{ room, lastSeq? }], limit? }
   */
  resync = async (req: Request, res: Response) => {
    const admin = decodeAdminFromReq(req);
    const limit = Number.isFinite(Number(req.body?.limit)) ? Math.max(1, Math.min(2000, Math.floor(Number(req.body?.limit)))) : 500;
    const rooms = Array.isArray(req.body?.rooms) ? req.body.rooms : null;
    if (!rooms || rooms.length === 0) throw new Error("ROOMS_REQUIRED");

    const out: any[] = [];

    for (const r of rooms) {
      try {
        const room = normalizeRoom(String(r?.room ?? ""));
        if (!room) throw new Error("ROOM_REQUIRED");

        const parsed = parseRoomType(room);
        if (parsed.kind === "unsupported") throw new Error("ROOM_NOT_SUPPORTED");

        if (parsed.kind === "session" && !admin) throw new Error("UNAUTHORIZED");

        if (parsed.kind === "order" && !admin) {
          const sessionKey = str(req.body?.sessionKey ?? "") || str(req.header("x-session-key") ?? "");
          if (!sessionKey) throw new Error("SESSION_KEY_REQUIRED");
          const sess = await this.deps.sessionRepo.findBySessionKey(sessionKey);
          if (!sess) throw new Error("SESSION_NOT_FOUND");
          const scope = await this.deps.orderRepo.getRealtimeScopeByOrderId(parsed.orderId);
          if (!scope) throw new Error("ORDER_NOT_FOUND");
          if (!scope.sessionId || String(scope.sessionId) !== String(sess.id)) throw new Error("UNAUTHORIZED");
        }

        const snapshot = await this.buildSnapshot(parsed);

        const window = this.deps.eventStore ? await this.deps.eventStore.getWindow(parsed.room) : { earliestSeq: 0, currentSeq: 0 };
        const lastSeqRaw = Number(r?.lastSeq ?? 0);
        const lastSeq = Number.isFinite(lastSeqRaw) && Number.isInteger(lastSeqRaw) && lastSeqRaw >= 0 ? lastSeqRaw : 0;

        let replayed: any[] = [];
        let gap = false;

        if (this.deps.eventStore && window.currentSeq > 0) {
          if (lastSeq < window.earliestSeq - 1) {
            gap = true;
          } else {
            replayed = await this.deps.eventStore.replayAfter(parsed.room, lastSeq, limit);
          }
        }

        out.push({
          room: parsed.room,
          ok: true,
          kind: parsed.kind,
          window,
          lastSeq,
          gap,
          replay: {
            limit,
            count: replayed.length,
            items: replayed,
          },
          suggestedLastSeq: window.currentSeq,
          snapshot,
        });
      } catch (e: any) {
        out.push({ room: String(r?.room ?? ""), ok: false, code: String(e?.message ?? "RESYNC_FAILED") });
      }
    }

    return res.json({ ok: true, serverNow: new Date().toISOString(), results: out });
  };

  // ===== Builders =====
  private async buildSnapshot(parsed: ReturnType<typeof parseRoomType>): Promise<any> {
    if (parsed.kind === "sessionKey") {
      const sess = await this.deps.sessionRepo.findBySessionKey(parsed.sessionKey);
      if (!sess) throw new Error("SESSION_NOT_FOUND");
      return this.buildSessionSnapshot(sess);
    }

    if (parsed.kind === "session") {
      const sess = await this.deps.sessionRepo.findById(parsed.sessionId);
      if (!sess) throw new Error("SESSION_NOT_FOUND");
      return this.buildSessionSnapshot(sess);
    }

    if (parsed.kind === "order") {
      const snap = await this.deps.orderSnapshotRepo.getOrderSnapshotById(parsed.orderId);
      if (!snap) throw new Error("ORDER_NOT_FOUND");
      const scope = await this.deps.orderRepo.getRealtimeScopeByOrderId(parsed.orderId);
      return { ...snap, realtimeScope: scope };
    }

    throw new Error("ROOM_NOT_SUPPORTED");
  }

  private async buildSessionSnapshot(sess: any): Promise<any> {
    const table = await this.deps.tableRepo.findById(sess.tableId);
    const cart = await this.deps.cartRepo.findActiveBySessionId(sess.id);
    const items = cart ? await this.deps.cartItemRepo.listByCartId(cart.id) : [];
    const latestOrder = await this.deps.orderSnapshotRepo.getLatestOrderForSession(sess.id);

    return {
      session: {
        sessionId: sess.id,
        sessionKey: sess.sessionKey,
        tableId: sess.tableId,
        status: sess.status,
        openedAt: sess.openedAt?.toISOString?.() ?? null,
        closedAt: sess.closedAt?.toISOString?.() ?? null,
      },
      table: table
        ? {
            tableId: table.id,
            tableCode: table.code,
            status: table.status,
            directionId: table.directionId,
            seats: table.seats,
            areaName: table.areaName ?? null,
            branchId: table.branchId ?? null,
          }
        : null,
      cart: cart
        ? {
            cartId: cart.id,
            cartKey: cart.cartKey,
            status: cart.status,
            orderChannel: cart.orderChannel,
            branchId: cart.branchId ?? null,
          }
        : null,
      cartItems: items.map((it: any) => ({
        cartId: it.cartId,
        itemId: it.itemId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        optionsHash: it.optionsHash ?? "",
        itemOptions: it.itemOptions ?? null,
      })),
      latestOrder,
    };
  }
}
