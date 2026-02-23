import { z } from "zod";
import { zId, zIsoDateTime } from "./common";

/**
 * realtime.ts
 *
 * Realtime v1 (Socket.IO) + HTTP snapshot/resync
 * - GET /api/v1/realtime/snapshot
 * - POST /api/v1/realtime/resync
 * - Internal: /api/v1/admin/realtime/audit, /api/v1/admin/realtime/replay
 */

export const zRealtimeEvent = z
  .object({
    v: z.number().int().optional(),
    seq: z.number().int().nonnegative().optional(),
    type: z.string(),
    branchId: zId.optional(),
    sessionKey: z.string().optional(),
    ts: zIsoDateTime.optional(),
    payload: z.unknown().optional(),
  })
  .partial({ v: true, seq: true, branchId: true, sessionKey: true, ts: true, payload: true });

export const zRealtimeSnapshot = z
  .object({
    v: z.number().int().optional(),
    fromSeq: z.number().int().optional(),
    toSeq: z.number().int().optional(),
    events: z.array(zRealtimeEvent).default([]),
  })
  .partial({ v: true, fromSeq: true, toSeq: true });
