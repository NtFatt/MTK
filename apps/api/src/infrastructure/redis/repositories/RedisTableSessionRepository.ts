import type { ITableSessionRepository } from "../../../application/ports/repositories/ITableSessionRepository.js";
import { TableSession, type TableSessionStatus } from "../../../domain/entities/TableSession.js";
import type { RedisClient } from "../redisClient.js";

type SessionJson = {
  id: string;
  sessionKey: string;
  tableId: string;
  status: TableSessionStatus;
  openedAt: string;
  closedAt: string | null;
};

export class RedisTableSessionRepository implements ITableSessionRepository {
  constructor(
    private readonly base: ITableSessionRepository,
    private readonly redis: RedisClient,
    private readonly ttlSeconds: number,
  ) {}

  private kSess(sessionId: string) {
    return `sess:${sessionId}`;
  }

  private kSessKey(sessionKey: string) {
    return `sesskey:${sessionKey}`;
  }

  private kOpen(tableId: string) {
    return `sessopen:${tableId}`;
  }

  private toJson(s: TableSession): SessionJson {
    return {
      id: String(s.id),
      sessionKey: String(s.sessionKey),
      tableId: String(s.tableId),
      status: s.status,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt ? s.closedAt.toISOString() : null,
    };
  }

  private fromJson(j: SessionJson): TableSession {
    return new TableSession(
      String(j.id),
      String(j.sessionKey),
      String(j.tableId),
      j.status,
      new Date(j.openedAt),
      j.closedAt ? new Date(j.closedAt) : null,
    );
  }

  private async cacheSession(s: TableSession): Promise<void> {
    const json = JSON.stringify(this.toJson(s));
    await this.redis.setEx(this.kSess(String(s.id)), this.ttlSeconds, json);
    await this.redis.setEx(this.kSessKey(String(s.sessionKey)), this.ttlSeconds, String(s.id));
  }

  async create(tableId: string, openedByClientId: string | null = null): Promise<TableSession> {
    const s = await this.base.create(tableId, openedByClientId);
    try {
      await this.cacheSession(s);
      await this.redis.setEx(this.kOpen(String(tableId)), this.ttlSeconds, String(s.id));
    } catch {
      // ignore redis errors
    }
    return s;
  }

  async findById(sessionId: string): Promise<TableSession | null> {
    try {
      const raw = await this.redis.get(this.kSess(String(sessionId)));
      if (raw) {
        const j = JSON.parse(raw) as SessionJson;
        // touch TTL on hot path
        await this.redis.expire(this.kSess(String(sessionId)), this.ttlSeconds);
        await this.redis.expire(this.kSessKey(String(j.sessionKey)), this.ttlSeconds);
        return this.fromJson(j);
      }
    } catch {
      // ignore
    }

    const s = await this.base.findById(sessionId);
    if (s) {
      try {
        await this.cacheSession(s);
        if (String(s.status) === "OPEN") {
          await this.redis.setEx(this.kOpen(String(s.tableId)), this.ttlSeconds, String(s.id));
        }
      } catch {
        // ignore
      }
    }
    return s;
  }

  async findBySessionKey(sessionKey: string): Promise<TableSession | null> {
    try {
      const id = await this.redis.get(this.kSessKey(String(sessionKey)));
      if (id) return await this.findById(String(id));
    } catch {
      // ignore
    }

    const s = await this.base.findBySessionKey(sessionKey);
    if (s) {
      try {
        await this.cacheSession(s);
        if (String(s.status) === "OPEN") {
          await this.redis.setEx(this.kOpen(String(s.tableId)), this.ttlSeconds, String(s.id));
        }
      } catch {
        // ignore
      }
    }
    return s;
  }

  async findOpenByTableId(tableId: string): Promise<TableSession | null> {
    try {
      const id = await this.redis.get(this.kOpen(String(tableId)));
      if (id) {
        const s = await this.findById(String(id));
        if (s && String(s.status) === "OPEN") return s;
      }
    } catch {
      // ignore
    }

    const s = await this.base.findOpenByTableId(tableId);
    if (s) {
      try {
        await this.cacheSession(s);
        if (String(s.status) === "OPEN") {
          await this.redis.setEx(this.kOpen(String(tableId)), this.ttlSeconds, String(s.id));
        }
      } catch {
        // ignore
      }
    }
    return s;
  }

  async findActiveByTableId(tableId: string): Promise<TableSession | null> {
    return this.findOpenByTableId(tableId);
  }

  async closeBySessionKey(sessionKey: string, now: Date): Promise<TableSession | null> {
    const s = await this.base.closeBySessionKey(sessionKey, now);
    try {
      if (!s) {
        // best-effort delete mapping
        await this.redis.del(this.kSessKey(String(sessionKey)));
        return null;
      }

      await this.cacheSession(s);
      // remove open index for table
      await this.redis.del(this.kOpen(String(s.tableId)));
    } catch {
      // ignore
    }
    return s;
  }
}
